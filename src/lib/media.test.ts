import assert from "node:assert/strict";
import test from "node:test";

import {
  getUploadAccessToken,
  normalizeStorageReference,
  parseStorageObjectReference,
} from "./media";

test("uses the existing upload session before attempting refresh", async () => {
  let refreshCalls = 0;
  const auth = {
    getSession: async () => ({
      data: { session: { access_token: "existing-token" } },
      error: null,
    }),
    refreshSession: async () => {
      refreshCalls += 1;
      return { data: { session: { access_token: "refreshed-token" } }, error: null };
    },
  } as never;

  assert.equal(await getUploadAccessToken(auth), "existing-token");
  assert.equal(refreshCalls, 0);
});

test("refreshes only when the upload session has no token", async () => {
  const auth = {
    getSession: async () => ({ data: { session: null }, error: null }),
    refreshSession: async () => ({
      data: { session: { access_token: "refreshed-token" } },
      error: null,
    }),
  } as never;

  assert.equal(await getUploadAccessToken(auth), "refreshed-token");
});

test("accepts valid storage references", () => {
  assert.equal(normalizeStorageReference("covers/demo/logo.png"), "covers/demo/logo.png");
  assert.equal(
    normalizeStorageReference("software-files/abc/file.zip"),
    "software-files/abc/file.zip",
  );
});

test("accepts local previews and regular image URLs", () => {
  assert.equal(
    normalizeStorageReference("blob:https://example.com/preview-id"),
    "blob:https://example.com/preview-id",
  );
  assert.equal(
    normalizeStorageReference("https://cdn.example.com/image.png"),
    "https://cdn.example.com/image.png",
  );
  assert.equal(normalizeStorageReference("/images/placeholder.png"), "/images/placeholder.png");
  assert.equal(parseStorageObjectReference("blob:https://example.com/preview-id"), null);
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
