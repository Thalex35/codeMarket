import assert from "node:assert/strict";
import test from "node:test";

import { normalizeSlug } from "./catalog";

test("accepts safe slugs", () => {
  assert.equal(normalizeSlug("taskme"), "taskme");
  assert.equal(normalizeSlug("teacher-her"), "teacher-her");
});

test("rejects unsafe slugs", () => {
  assert.equal(normalizeSlug("../admin"), "");
  assert.equal(normalizeSlug("task me"), "task-me");
  assert.equal(normalizeSlug("javascript:alert(1)"), "");
});
