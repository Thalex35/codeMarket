import { describe, expect, test } from "bun:test";

import { allowRequest } from "./public-abuse";

describe("public abuse limits", () => {
  test("allows requests up to the configured limit", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(allowRequest(key, 2, 60_000)).toBe(true);
    expect(allowRequest(key, 2, 60_000)).toBe(true);
    expect(allowRequest(key, 2, 60_000)).toBe(false);
  });
});
