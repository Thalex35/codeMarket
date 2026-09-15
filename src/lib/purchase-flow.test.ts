import test from "node:test";
import assert from "node:assert/strict";

import { buildWhatsAppPurchaseMessage, getPurchaseAccessState } from "./purchase-flow.ts";

test("buildWhatsAppPurchaseMessage formats the WhatsApp buy request", () => {
  assert.equal(
    buildWhatsAppPurchaseMessage({
      softwareName: "TaskMe",
      version: "2.1.0",
      price: 45,
      currency: "USD",
      customerName: "Jane Doe",
    }),
    "Hello CodeMarket, I would like to buy TaskMe (version 2.1.0) for $45.00 USD. My name is Jane Doe.",
  );
});

test("getPurchaseAccessState marks paid and pending correctly", () => {
  const access = getPurchaseAccessState([
    { status: "paid" },
    { status: "pending" },
    { status: "failed" },
  ]);

  assert.deepEqual(access, { paid: true, pending: true });
});
