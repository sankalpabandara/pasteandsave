// Reusing a lookup's extractor output for the download that follows.
//
// Pasting a link and pressing save were two separate extractions of the same
// video, seconds apart, both through the metered proxy. The second one asked a
// question the first had already answered. This holds the answer just long
// enough to bridge the gap.
//
// Run: node --test test/info-cache.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { putInfo, takeInfo, infoCacheSize } from "../src/lib/info-cache.ts";

const URL_A = "https://www.youtube.com/watch?v=aaaaaaaaaaa";
const URL_B = "https://www.youtube.com/watch?v=bbbbbbbbbbb";

test("what the lookup stored is what the download gets", () => {
  putInfo(URL_A, '{"id":"a"}');
  assert.equal(takeInfo(URL_A), '{"id":"a"}');
});

test("a url that was never looked up is a miss, not an error", () => {
  assert.equal(takeInfo("https://www.youtube.com/watch?v=nothing"), null);
});

test("entries do not leak between urls", () => {
  putInfo(URL_B, '{"id":"b"}');
  assert.equal(takeInfo(URL_A), '{"id":"a"}');
  assert.equal(takeInfo(URL_B), '{"id":"b"}');
});

test("the map cannot grow without bound", () => {
  // The key is a visitor-supplied URL, so an unbounded map here is a way to
  // run the server out of memory from the outside.
  for (let i = 0; i < 500; i++) putInfo(`https://example.com/v/${i}`, `{"i":${i}}`);
  assert.ok(infoCacheSize() <= 60, `expected <= 60 entries, got ${infoCacheSize()}`);
});

test("oldest entries are dropped first", () => {
  for (let i = 0; i < 500; i++) putInfo(`https://example.com/w/${i}`, `{"i":${i}}`);
  assert.equal(takeInfo("https://example.com/w/0"), null, "the first one in should be gone");
  assert.ok(takeInfo("https://example.com/w/499"), "the most recent should still be there");
});

test("an unreasonably large payload is not held", () => {
  const huge = "x".repeat(5 * 1024 * 1024);
  putInfo("https://example.com/huge", huge);
  assert.equal(takeInfo("https://example.com/huge"), null);
});

test("empty output is not stored", () => {
  putInfo("https://example.com/empty", "");
  assert.equal(takeInfo("https://example.com/empty"), null);
});
