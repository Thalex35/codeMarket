import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWhatsAppPurchaseMessage,
  getPurchaseAccessState,
  getPurchaseStatusUpdate,
} from "./purchase-flow.ts";

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

test("getPurchaseStatusUpdate records confirmation timestamps", () => {
  const paidUpdate = getPurchaseStatusUpdate("paid");
  const cancelledUpdate = getPurchaseStatusUpdate("cancelled");

  assert.equal(paidUpdate.status, "paid");
  assert.ok(paidUpdate.paid_at);
  assert.equal(cancelledUpdate.status, "cancelled");
  assert.ok(cancelledUpdate.cancelled_at);
});
