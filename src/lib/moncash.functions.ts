import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const MONCASH_API_URL = "https://api.moncashconnect.com/v1";

function authenticatedClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authorization = getRequest().headers.get("authorization");
  if (!url || !key || !authorization?.startsWith("Bearer ")) {
    throw new Error("Authentication is required");
  }

  return createClient<Database>(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getReturnUrl() {
  const configured = process.env["PUBLIC_APP_URL"]?.trim();
  if (configured) return `${configured.replace(/\/$/, "")}/purchases`;
  const requestUrl = new URL(getRequest().url);
  return `${requestUrl.origin}/purchases`;
}

export const createMonCashCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { softwareId: string }) => input)
  .handler(async ({ data }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.softwareId)) throw new Error("Invalid software");

    const supabase = authenticatedClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Authentication is required");

    const { data: software, error: softwareError } = await supabase
      .from("software")
      .select("id, name, pricing_type, price, currency, published, archived")
      .eq("id", data.softwareId)
      .maybeSingle();
    if (softwareError) throw softwareError;
    if (!software || software.pricing_type !== "paid" || !software.published || software.archived) {
      throw new Error("This software is not available for purchase");
    }

    const { data: existing } = await supabase
      .from("purchases")
      .select("id, status, checkout_url")
      .eq("software_id", software.id)
      .eq("user_id", user.id)
      .eq("payment_method", "moncashconnect")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.status === "paid") return { checkoutUrl: null, alreadyPaid: true };
    if (existing?.checkout_url) return { checkoutUrl: existing.checkout_url, alreadyPaid: false };

    const secretKey = process.env["MONCASHCONNECT_SECRET_KEY"];
    const exchangeRate = Number(process.env["MONCASHCONNECT_USD_TO_HTG"]);
    if (!secretKey) throw new Error("MonCashConnect is not configured");
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("MonCashConnect exchange rate is not configured");
    }

    const chargedAmount = Math.max(1, Math.round(Number(software.price) * exchangeRate));
    const referenceId = `purchase_${crypto.randomUUID()}`;
    const providerResponse = await fetch(`${MONCASH_API_URL}/pay-create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": referenceId,
      },
      body: JSON.stringify({
        amount: chargedAmount,
        referenceId,
        returnUrl: getReturnUrl(),
        customerName: user.user_metadata?.["full_name"] ?? undefined,
        customerEmail: user.email ?? undefined,
      }),
    });

    const payload = (await providerResponse.json()) as {
      paymentUrl?: string;
      error?: string;
    };
    if (!providerResponse.ok || !payload.paymentUrl) {
      throw new Error(payload.error ?? "MonCashConnect could not create the payment");
    }

    const { error: purchaseError } = await supabase.from("purchases").insert({
      software_id: software.id,
      user_id: user.id,
      amount: software.price,
      currency: software.currency,
      status: "pending",
      payment_method: "moncashconnect",
      provider: "moncashconnect",
      provider_reference: referenceId,
      checkout_url: payload.paymentUrl,
      charged_amount: chargedAmount,
      charged_currency: "HTG",
    } as never);
    if (purchaseError) throw purchaseError;

    return { checkoutUrl: payload.paymentUrl, alreadyPaid: false };
  });
