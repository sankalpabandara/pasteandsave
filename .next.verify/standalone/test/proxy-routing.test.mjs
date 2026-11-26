// Learning which sites actually need the proxy.
//
// The host list was written once, when datacenter addresses were being
// refused, and never re-checked. Blocks lift. This tries direct first, and
// remembers the answer so a refusal costs one attempt rather than one per
// request.
//
// Run: node --test test/proxy-routing.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  shouldTryDirect,
  recordDirectResult,
  routingReport,
  resetRouting,
} from "../src/lib/proxy-routing.ts";

test("a site never tried before is tried directly", () => {
  resetRouting();
  assert.equal(shouldTryDirect("youtube.com"), true);
});

test("a site that answered directly keeps being tried directly", () => {
  resetRouting();
  recordDirectResult("youtube.com", true);
  assert.equal(shouldTryDirect("youtube.com"), true);
});

test("a refusal is remembered, so it costs one attempt not every attempt", () => {
  resetRouting();
  recordDirectResult("youtube.com", false);
  assert.equal(shouldTryDirect("youtube.com"), false);
  // The point of remembering: repeated calls must not each pay for a probe.
  for (let i = 0; i < 20; i++) assert.equal(shouldTryDirect("youtube.com"), false);
});

test("www and casing are the same site", () => {
  resetRouting();
  recordDirectResult("www.YouTube.com", false);
  assert.equal(shouldTryDirect("youtube.com"), false);
  assert.equal(shouldTryDirect("WWW.youtube.com"), false);
});

test("one site's verdict does not affect another", () => {
  resetRouting();
  recordDirectResult("youtube.com", false);
  recordDirectResult("instagram.com", true);
  assert.equal(shouldTryDirect("youtube.com"), false);
  assert.equal(shouldTryDirect("instagram.com"), true);
  assert.equal(shouldTryDirect("tiktok.com"), true, "unknown sites stay unknown");
});

test("the report shows what is in effect", () => {
  resetRouting();
  recordDirectResult("youtube.com", false);
  recordDirectResult("instagram.com", true);
  const r = routingReport();
  assert.equal(r["youtube.com"].direct, false);
  assert.equal(r["instagram.com"].direct, true);
  assert.equal(typeof r["youtube.com"].ageMinutes, "number");
});
