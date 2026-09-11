import assert from "node:assert/strict";
import test from "node:test";

import { normalizeStorageReference, parseStorageObjectReference } from "./media";

test("accepts valid storage references", () => {
  assert.equal(normalizeStorageReference("covers/demo/logo.png"), "covers/demo/logo.png");
  assert.equal(normalizeStorageReference("software-files/abc/file.zip"), "software-files/abc/file.zip");
});

test("rejects invalid bucket or traversal path", () => {
  assert.equal(normalizeStorageReference("admin/../../secret.txt"), null);
  assert.equal(normalizeStorageReference("not-allowed/path/to/file.txt"), null);
  assert.equal(normalizeStorageReference("covers/../secret.txt"), null);
});

test("parses only private storage object references", () => {
  assert.deepEqual(parseStorageObjectReference("software-files/demo/file.zip"), {
    bucket: "software-files",
    path: "demo/file.zip",
  });
  assert.equal(parseStorageObjectReference("https://cdn.example.com/file.zip"), null);
  assert.equal(parseStorageObjectReference("/downloads/file.zip"), null);
  assert.equal(parseStorageObjectReference("covers/../file.zip"), null);
});
