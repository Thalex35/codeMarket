import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSocialUrl, normalizeWhatsAppNumber } from "./url";

test("accepts valid external URLs and WhatsApp numbers", () => {
  assert.equal(normalizeSocialUrl("https://github.com/codemarket"), "https://github.com/codemarket");
  assert.equal(normalizeWhatsAppNumber("+254712345678"), "+254712345678");
  assert.equal(normalizeWhatsAppNumber("254712345678"), "+254712345678");
});

test("rejects unsafe values", () => {
  assert.equal(normalizeSocialUrl("javascript:alert(1)"), "");
  assert.equal(normalizeSocialUrl("mailto:test@example.com"), "");
  assert.equal(normalizeWhatsAppNumber("abc"), "");
  assert.equal(normalizeWhatsAppNumber("123"), "");
});
