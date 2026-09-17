import assert from "node:assert/strict";
import test from "node:test";

import { shouldReloadAccountForAuthEvent } from "./useAuth";

test("TOKEN_REFRESHED preserves the current account state", () => {
  assert.equal(shouldReloadAccountForAuthEvent("TOKEN_REFRESHED", "user-1", "user-1"), false);
});

test("sign-in and sign-out events reload account state", () => {
  assert.equal(shouldReloadAccountForAuthEvent("SIGNED_IN", undefined, "user-1"), true);
  assert.equal(shouldReloadAccountForAuthEvent("SIGNED_OUT", "user-1", undefined), true);
});
