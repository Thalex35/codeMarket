import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStorageReference } from "./media";

test("accepts valid storage references", () => {
  assert.equal(normalizeStorageReference("covers/demo/logo.png"), "covers/demo/logo.png");
  assert.equal(normalizeStorageReference("software-files/abc/file.zip"), "software-files/abc/file.zip");
});

test("rejects invalid bucket or traversal path", () => {
  assert.equal(normalizeStorageReference("admin/../../secret.txt"), null);
  assert.equal(normalizeStorageReference("not-allowed/path/to/file.txt"), null);
  assert.equal(normalizeStorageReference("covers/../secret.txt"), null);
});
