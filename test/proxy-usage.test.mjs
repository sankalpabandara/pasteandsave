// The metered-data ledger and its daily ceiling.
//
// This guards real money. A bug that under-counts lets the balance drain
// unnoticed, which is what happened; a bug that over-counts, or a ceiling that
// is checked wrongly, refuses downloads that should have been allowed. Both
// are worth a test.
//
// Run: node --test test/proxy-usage.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// A throwaway ledger directory, so running the tests never touches the real
// one and never charges the real allowance.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pu-test-"));
process.env.DATA_DIR = dir;
process.env.PROXY_DAILY_MB = "10";

const { recordProxyBytes, proxyBudgetLeft, proxyUsage } = await import(
  "../src/lib/proxy-usage.ts"
);

test("a fresh day starts at zero and is allowed to spend", () => {
  const b = proxyBudgetLeft();
  assert.equal(b.allowed, true);
  assert.equal(Math.round(b.usedMb), 0);
  assert.equal(b.limitMb, 10);
});

test("bytes are counted and attributed to what spent them", () => {
  recordProxyBytes("metadata", 2_000_000);
  recordProxyBytes("media", 3_000_000);
  recordProxyBytes("metadata", 1_000_000);
  const u = proxyUsage();
  assert.equal(u.by.metadata, 3_000_000);
  assert.equal(u.by.media, 3_000_000);
  assert.equal(u.usedMb, 6);
});

test("nonsense values cannot corrupt the total", () => {
  const before = proxyUsage().usedMb;
  recordProxyBytes("media", 0);
  recordProxyBytes("media", -5_000_000);
  recordProxyBytes("media", Number.NaN);
  recordProxyBytes("media", Number.POSITIVE_INFINITY);
  assert.equal(proxyUsage().usedMb, before, "total must be unchanged");
});

test("the ceiling refuses further spending once it is reached", () => {
  assert.equal(proxyBudgetLeft().allowed, true, "6 of 10 MB is still fine");
  recordProxyBytes("media", 5_000_000);
  assert.equal(proxyBudgetLeft().allowed, false, "11 of 10 MB must stop");
});

test("the ledger survives a restart", async () => {
  // The whole point is that a pm2 restart does not wipe the day's spend, or
  // the ceiling could be bypassed by restarting.
  const raw = JSON.parse(fs.readFileSync(path.join(dir, "proxy-usage.json"), "utf8"));
  assert.equal(raw.bytes, 11_000_000);
  assert.ok(raw.day);
});
