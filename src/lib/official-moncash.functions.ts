import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

const SANDBOX_API = "https://sandbox.moncashbutton.digicelgroup.com/Api";
const LIVE_API = "https://moncashbutton.digicelgroup.com/Api";
const SANDBOX_GATEWAY = "https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware";
const LIVE_GATEWAY = "https://moncashbutton.digicelgroup.com/Moncash-middleware";

type OfficialConfig = {
  apiBase: string;
  gatewayBase: string;
  clientId: string;
  clientSecret: string;
  amountMultiplier: number;
};

function getConfig(): OfficialConfig {
  const mode = process.env["MONCASH_MODE"] === "live" ? "live" : "sandbox";
  const clientId = process.env["MONCASH_CLIENT_ID"];
  const clientSecret = process.env["MONCASH_CLIENT_SECRET"];
  const amountMultiplier = Number(process.env["MONCASH_AMOUNT_MULTIPLIER"] ?? "1");
  if (!clientId || !clientSecret) throw new Error("Official MonCash is not configured");
  if (!Number.isFinite(amountMultiplier) || amountMultiplier <= 0) {
    throw new Error("MONCASH_AMOUNT_MULTIPLIER must be a positive number");
  }

  return {
    apiBase: mode === "live" ? LIVE_API : SANDBOX_API,
    gatewayBase: mode === "live" ? LIVE_GATEWAY : SANDBOX_GATEWAY,
    clientId,
    clientSecret,
    amountMultiplier,
  };
}

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
  const appUrl = process.env["PUBLIC_APP_URL"]?.trim();
  if (!appUrl) throw new Error("PUBLIC_APP_URL is not configured");
  return `${appUrl.replace(/\/$/, "")}/api/payments/moncash/notification`;
}

async function getAccessToken(config: OfficialConfig) {
  const response = await fetch(`${config.apiBase}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=read,write&grant_type=client_credentials",
  });
  const payload = (await response.json()) as { access_token?: string; error?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error ?? "Official MonCash authentication failed");
  }
  return payload.access_token;
}

export const createOfficialMonCashCheckout = createServerFn({ method: "POST" })
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
      .select("id, pricing_type, price, currency, published, archived")
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
      .eq("provider", "official-moncash")
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.status === "paid") return { checkoutUrl: null, alreadyPaid: true };
    if (existing?.checkout_url) return { checkoutUrl: existing.checkout_url, alreadyPaid: false };

    const config = getConfig();
    const accessToken = await getAccessToken(config);
    const orderId = `purchase_${crypto.randomUUID()}`;
    const amount = Math.max(1, Math.round(Number(software.price) * config.amountMultiplier));
    const paymentResponse = await fetch(`${config.apiBase}/v1/CreatePayment`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, orderId }),
    });
    const payment = (await paymentResponse.json()) as {
      payment_token?: { token?: string };
      message?: string;
    };
    const token = payment.payment_token?.token;
    if (!paymentResponse.ok || !token) {
      throw new Error(payment.message ?? "Official MonCash could not create the payment");
    }

    const checkoutUrl = `${config.gatewayBase}/Payment/Redirect?token=${encodeURIComponent(token)}`;
    const { error: purchaseError } = await supabase.from("purchases").insert({
      software_id: software.id,
      user_id: user.id,
      amount: software.price,
      currency: software.currency,
      status: "pending",
      payment_method: "official-moncash",
      provider: "official-moncash",
      provider_reference: orderId,
      checkout_url: checkoutUrl,
      charged_amount: amount,
      charged_currency: "HTG",
    } as never);
    if (purchaseError) throw purchaseError;

    return { checkoutUrl, alreadyPaid: false };
  });
