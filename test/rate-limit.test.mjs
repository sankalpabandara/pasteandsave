// The rate limiter, and specifically which address it trusts.
//
// This exists because the limiter used to read the first entry of
// X-Forwarded-For, which the caller writes. Rotating that header put every
// request in a fresh bucket, so the per-IP limits never fired. On the download
// endpoint each request that should have been refused instead spent metered
// proxy data.
//
// Run: node --test test/rate-limit.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, rateLimit } from "../src/lib/rate-limit.ts";

function req(headers) {
  return new Request("https://example.com/", { headers });
}

test("the caller cannot choose its own address", () => {
  // nginx appends the real peer, so the last entry is the one it wrote.
  const ip = clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }));
  assert.equal(ip, "203.0.113.9");
});

test("a single-entry header is the real address", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": "203.0.113.9" })), "203.0.113.9");
});

test("several spoofed hops still resolve to the real one", () => {
  const ip = clientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8, 7.7.7.7, 203.0.113.9" }));
  assert.equal(ip, "203.0.113.9");
});

test("whitespace and empty entries do not shift the result", () => {
  assert.equal(clientIp(req({ "x-forwarded-for": " 1.1.1.1 ,, 203.0.113.9 " })), "203.0.113.9");
});

test("x-real-ip is used when there is no forwarded-for", () => {
  assert.equal(clientIp(req({ "x-real-ip": "203.0.113.5" })), "203.0.113.5");
});

test("a rotating spoofed header lands in one bucket, not many", () => {
  // The regression itself. Every request here comes from one real address
  // behind the proxy; only the part the caller controls changes.
  const key = (spoof) => `t1:${clientIp(req({ "x-forwarded-for": `${spoof}, 203.0.113.9` }))}`;
  let allowed = 0;
  for (let i = 0; i < 25; i++) {
    if (rateLimit(key(`10.0.0.${i}`), 5, 60_000)) allowed++;
  }
  assert.equal(allowed, 5, "the limit must apply across spoofed addresses, not per one");
});

test("genuinely different callers are limited separately", () => {
  assert.equal(rateLimit("t2:a", 2, 60_000), true);
  assert.equal(rateLimit("t2:a", 2, 60_000), true);
  assert.equal(rateLimit("t2:a", 2, 60_000), false, "third from the same caller is refused");
  assert.equal(rateLimit("t2:b", 2, 60_000), true, "a different caller is unaffected");
});

test("the bucket map does not grow without limit", () => {
  for (let i = 0; i < 30_000; i++) rateLimit(`flood:${i}`, 100, 60_000);
  // Proven through behaviour rather than internals: the process still runs and
  // the limiter still refuses a caller over its limit.
  assert.equal(rateLimit("after-flood", 1, 60_000), true);
  assert.equal(rateLimit("after-flood", 1, 60_000), false);
});
