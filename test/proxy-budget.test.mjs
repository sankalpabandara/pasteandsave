// The proxy spend counter, under concurrent downloads.
//
// This exists because the counter was read-modify-write on a shared file with
// nothing serialising it. Downloads run concurrently here, so two overlapping
// ones both read the same total, both added their own size, and the second
// write erased the first. The day's total drifted below the truth and the cap
// let more traffic through than it was set to allow, which is metered money.
//
// Run: node --test test/proxy-budget.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// proxy-budget resolves its data directory from the working directory, so the
// test runs from a throwaway one and never touches the real ledger.
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "budget-test-"));
process.chdir(cwd);
process.env.YTDLP_PROXY_DAILY_MB = "10000";

const { recordProxyUsage, proxyUsageToday, proxyBudgetOk } = await import(
  "../src/lib/proxy-budget.ts"
);

const ledger = () => JSON.parse(fs.readFileSync(path.join(cwd, "data", "proxy-usage.json"), "utf8"));

test("a single download is counted", async () => {
  await recordProxyUsage("video");
  assert.equal(ledger().downloads, 1);
});

test("concurrent downloads do not lose increments", async () => {
  // The regression. Fired together, exactly as two visitors would.
  const before = ledger().downloads;
  await Promise.all(Array.from({ length: 25 }, () => recordProxyUsage("video")));
  assert.equal(
    ledger().downloads,
    before + 25,
    "every concurrent download must be counted, not just the last to write",
  );
});

test("bytes add up as well as the count", async () => {
  const before = ledger().bytes;
  await Promise.all([recordProxyUsage("audio"), recordProxyUsage("audio")]);
  assert.equal(ledger().bytes, before + 2 * 6 * 1024 * 1024);
});

test("the reported total matches what was written", async () => {
  const u = await proxyUsageToday();
  assert.equal(u.downloads, ledger().downloads);
  assert.equal(u.capMb, 10000);
});

test("the cap still permits spending below it", async () => {
  assert.equal(await proxyBudgetOk(), true);
});

test("the cap refuses once the day's allowance is gone", async () => {
  // Work out how many more 50 MB videos it takes to cross the line, rather
  // than hard-coding a number that silently stops testing the cap the moment
  // an earlier test changes how much it spends.
  const capBytes = 10000 * 1024 * 1024;
  const remaining = capBytes - ledger().bytes;
  const needed = Math.ceil(remaining / (50 * 1024 * 1024)) + 1;
  assert.ok(needed > 0, "the cap should not already be reached here");

  await Promise.all(Array.from({ length: needed }, () => recordProxyUsage("video")));
  assert.equal(await proxyBudgetOk(), false, "spending past the cap must be refused");
});
