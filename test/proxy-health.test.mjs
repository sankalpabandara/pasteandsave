// The proxy outage signal.
//
// This exists because a dead residential proxy is invisible: the site stays
// up, the binaries pass their checks, and every proxied platform simply
// reports that the video could not be read. Two days went into blaming
// YouTube for what was an exhausted proxy balance. These tests pin down the
// thresholds so the signal cannot quietly regress into never firing, or into
// firing at the first unavailable video.
//
// Run: node --test test/proxy-health.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { recordProxyAttempt, proxyHealth, looksLikeProxyFailure } from "../src/lib/proxy-health.ts";

test("a quiet server is not an outage", () => {
  assert.equal(proxyHealth().failing, false);
  assert.equal(proxyHealth().samples, 0);
});

test("a couple of failures is normal traffic, not an outage", () => {
  // Deleted videos and rate limits happen constantly. Alerting on these
  // would train whoever gets the alert to ignore it.
  recordProxyAttempt(false);
  recordProxyAttempt(false);
  assert.equal(proxyHealth().failing, false);
});

test("a sustained run of failures is reported as an outage", () => {
  recordProxyAttempt(false);
  recordProxyAttempt(false);
  const h = proxyHealth();
  assert.equal(h.failing, true);
  assert.equal(h.failures, 4);
  assert.ok(h.lastFailureAgoSeconds !== null);
});

test("mixed traffic does not trip the alarm", () => {
  // A quarter of lookups failing is an ordinary afternoon, not a dead proxy.
  for (let i = 0; i < 12; i++) recordProxyAttempt(true);
  assert.equal(proxyHealth().failing, false);
});

test("it clears itself once the proxy works again", () => {
  for (let i = 0; i < 20; i++) recordProxyAttempt(false);
  assert.equal(proxyHealth().failing, true, "should be failing after a full window of errors");
  for (let i = 0; i < 20; i++) recordProxyAttempt(true);
  assert.equal(
    proxyHealth().failing,
    false,
    "must recover on its own, or one bad hour alerts forever",
  );
});

test("the window does not grow without bound", () => {
  for (let i = 0; i < 200; i++) recordProxyAttempt(true);
  assert.ok(proxyHealth().samples <= 20);
});

// --- telling a proxy fault apart from a problem with the video -------------

test("connection faults are recognised as ours, not the video's", () => {
  for (const msg of [
    "HTTP Error 407: Proxy Authentication Required",
    "Unable to connect to proxy: [Errno 111] Connection refused",
    "ProxyError('Cannot connect to proxy.')",
    "Tunnel connection failed: 403 Forbidden",
    "ERROR: Unable to download webpage: <urlopen error Tunnel connection failed>",
  ]) {
    assert.equal(looksLikeProxyFailure(msg), true, msg);
  }
});

test("an actually private or missing video is not blamed on the proxy", () => {
  for (const msg of [
    "ERROR: [youtube] xyz: Video unavailable. This video is private",
    "ERROR: [instagram] Requested content is not available, rate-limit reached",
    "ERROR: [generic] Unable to extract video url",
    "ERROR: This video has been removed by the uploader",
  ]) {
    assert.equal(looksLikeProxyFailure(msg), false, msg);
  }
});
