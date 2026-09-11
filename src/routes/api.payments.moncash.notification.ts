import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SANDBOX_API = "https://sandbox.moncashbutton.digicelgroup.com/Api";
const LIVE_API = "https://moncashbutton.digicelgroup.com/Api";

type MonCashPayment = {
  reference?: string;
  transaction_id?: string;
  cost?: number | string;
  message?: string;
};

type MonCashResponse = {
  payment?: MonCashPayment;
  status?: number;
  message?: string;
};

function apiBase() {
  return process.env["MONCASH_MODE"] === "live" ? LIVE_API : SANDBOX_API;
}

async function getAccessToken() {
  const clientId = process.env["MONCASH_CLIENT_ID"];
  const clientSecret = process.env["MONCASH_CLIENT_SECRET"];
  if (!clientId || !clientSecret) throw new Error("Official MonCash is not configured");

  const response = await fetch(`${apiBase()}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "scope=read,write&grant_type=client_credentials",
  });
  const payload = (await response.json()) as { access_token?: string };
  if (!response.ok || !payload.access_token) throw new Error("Official MonCash authentication failed");
  return payload.access_token;
}

async function readCallbackValues(request: Request) {
  const values = new URL(request.url).searchParams;
  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as Record<string, unknown>;
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string" && !values.has(key)) values.set(key, value);
      }
    } else {
      const body = await request.text();
      for (const [key, value] of new URLSearchParams(body)) {
        if (!values.has(key)) values.set(key, value);
      }
    }
  }
  return {
    orderId: values.get("orderId") ?? values.get("order_id") ?? values.get("reference"),
    transactionId: values.get("transactionId") ?? values.get("transaction_id"),
  };
}

async function retrievePayment(accessToken: string, orderId: string | null, transactionId: string | null) {
  const endpoint = transactionId ? "RetrieveTransactionPayment" : "RetrieveOrderPayment";
  const body = transactionId ? { transactionId } : { orderId };
  const response = await fetch(`${apiBase()}/v1/${endpoint}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return {
    ok: response.ok,
    payload: (await response.json()) as MonCashResponse,
  };
}

async function handleNotification(request: Request) {
  const { orderId, transactionId } = await readCallbackValues(request);
  if (!orderId && !transactionId) return Response.redirect(`${getAppUrl()}/payment/complete?status=invalid`, 303);

  try {
    const accessToken = await getAccessToken();
    const result = await retrievePayment(accessToken, orderId, transactionId);
    const payment = result.payload.payment;
    const providerReference = orderId ?? payment?.reference;
    if (!result.ok || !payment || payment.message?.toLowerCase() !== "successful" || !providerReference) {
      return Response.redirect(`${getAppUrl()}/payment/complete?status=failed`, 303);
    }

    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from("purchases")
      .select("id, amount, charged_amount, status, provider")
      .eq("provider", "official-moncash")
      .eq("provider_reference", providerReference)
      .maybeSingle();
    if (purchaseError || !purchase) return Response.redirect(`${getAppUrl()}/payment/complete?status=failed`, 303);

    const expectedAmount = Number(purchase.charged_amount ?? purchase.amount);
    const paidAmount = Number(payment.cost);
    if (!Number.isFinite(paidAmount) || paidAmount !== expectedAmount) {
      return Response.redirect(`${getAppUrl()}/payment/complete?status=failed`, 303);
    }

    if (purchase.status !== "paid") {
      const { error: updateError } = await supabaseAdmin
        .from("purchases")
        .update({ status: "paid", paid_at: new Date().toISOString() } as never)
        .eq("id", purchase.id)
        .eq("status", "pending");
      if (updateError) return Response.redirect(`${getAppUrl()}/payment/complete?status=failed`, 303);
    }

    return Response.redirect(`${getAppUrl()}/payment/complete?status=success`, 303);
  } catch (error) {
    console.error("Official MonCash notification failed", error);
    return Response.redirect(`${getAppUrl()}/payment/complete?status=failed`, 303);
  }
}

function getAppUrl() {
  return (process.env["PUBLIC_APP_URL"] ?? "http://localhost:3000").replace(/\/$/, "");
}

export const Route = createFileRoute("/api/payments/moncash/notification")({
  server: {
    handlers: {
      GET: ({ request }) => handleNotification(request),
      POST: ({ request }) => handleNotification(request),
    },
  },
});
