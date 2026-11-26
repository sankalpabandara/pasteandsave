// One visitor must not be able to hold every download slot on the site.
//
// The pool is three slots shared by everyone, and a download can hold one for
// ten minutes, so a single address starting three long downloads used to leave
// every other visitor told the server was busy.
//
// Run: node --test test/per-visitor-limit.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { PerKeyLimit, MAX_JOBS_PER_VISITOR, MAX_CONCURRENT_JOBS } from "../src/lib/concurrency.ts";

test("one visitor can never take the whole download pool", () => {
  assert.ok(MAX_JOBS_PER_VISITOR < MAX_CONCURRENT_JOBS);
});

test("a visitor gets their share and no more", () => {
  const limit = new PerKeyLimit(2);
  const a = limit.tryTake("1.1.1.1");
  const b = limit.tryTake("1.1.1.1");
  assert.ok(a && b);
  assert.equal(limit.tryTake("1.1.1.1"), null);
  // Someone else is unaffected.
  assert.ok(limit.tryTake("2.2.2.2"));
});

test("finishing a download frees that visitor's place", () => {
  const limit = new PerKeyLimit(2);
  const a = limit.tryTake("1.1.1.1");
  limit.tryTake("1.1.1.1");
  a();
  assert.equal(limit.heldBy("1.1.1.1"), 1);
  assert.ok(limit.tryTake("1.1.1.1"));
});

test("giving a place back twice does not hand out an extra one", () => {
  // Jobs release from more than one exit path, so a double release is real.
  const limit = new PerKeyLimit(2);
  const a = limit.tryTake("1.1.1.1");
  limit.tryTake("1.1.1.1");
  a();
  a();
  assert.equal(limit.heldBy("1.1.1.1"), 1);
});

test("visitors with nothing running are not kept in memory", () => {
  // Keyed on visitor addresses, so it must not grow with every one ever seen.
  const limit = new PerKeyLimit(2);
  limit.tryTake("3.3.3.3")();
  assert.equal(limit.heldBy("3.3.3.3"), 0);
  assert.equal(limit["held"].size, 0);
});
