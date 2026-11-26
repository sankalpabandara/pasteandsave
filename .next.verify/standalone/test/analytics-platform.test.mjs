// Attributing downloads to a platform.
//
// Lookups always recorded which site a link was for, but downloads did not, so
// the only question that matters for cost - what share of the downloads people
// actually complete are on the one platform that needs a paid proxy - could not
// be answered from our own data. These cover the aggregation that answers it.
//
// The module resolves its data directory from the working directory at import
// time, so the test moves into a scratch directory first and imports after.
//
// Run: node --test test/analytics-platform.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "pas-analytics-"));
const cwd = process.cwd();
process.chdir(scratch);
const { logEvent, getStats, rangeFrom } = await import("../src/lib/analytics.ts");
process.chdir(cwd);

test("downloads are counted per platform, with the metered share marked", async () => {
  process.chdir(scratch);
  await logEvent({ type: "download", mode: "video", site: "Youtube", proxied: true });
  await logEvent({ type: "download", mode: "audio", site: "Youtube", proxied: true });
  await logEvent({ type: "download", mode: "video", site: "TikTok", proxied: false });
  const stats = await getStats();
  process.chdir(cwd);

  const yt = stats.downloadSites.find((s) => s.site.toLowerCase() === "youtube");
  const tt = stats.downloadSites.find((s) => s.site.toLowerCase() === "tiktok");

  assert.equal(yt.count, 2, "both YouTube downloads counted");
  assert.equal(yt.proxied, 2, "both were flagged as metered");
  assert.equal(tt.count, 1);
  assert.equal(tt.proxied, 0, "TikTok costs nothing and must not be flagged");

  // Busiest platform first, so the panel leads with the one worth deciding about.
  assert.equal(stats.downloadSites[0].site.toLowerCase(), "youtube");
});

test("the same platform under different capitalisation is one row", async () => {
  process.chdir(scratch);
  // The lookup writes yt-dlp's extractor_key ("Youtube"); anything reaching the
  // download side by another route may differ in case. Two rows for one site
  // would understate its share and could sink the decision this panel exists for.
  await logEvent({ type: "download", mode: "video", site: "youtube", proxied: true });
  const stats = await getStats();
  process.chdir(cwd);

  const rows = stats.downloadSites.filter((s) => s.site.toLowerCase() === "youtube");
  assert.equal(rows.length, 1, "one row for YouTube, not one per capitalisation");
  assert.equal(rows[0].count, 3);
});

test("a download with no platform is counted but not attributed", async () => {
  process.chdir(scratch);
  // Events written before this change carry no site, and a cache miss leaves it
  // unset too. Those must not vanish from the totals or invent a platform.
  const before = (await getStats()).downloads;
  await logEvent({ type: "download", mode: "video", proxied: false });
  const stats = await getStats();
  process.chdir(cwd);

  assert.equal(stats.downloads, before + 1, "still counted in the total");
  const sum = stats.downloadSites.reduce((n, s) => n + s.count, 0);
  assert.equal(sum, before, "but not attributed to any platform");
});

test("failed lookups are attributed to a site and a reason", async () => {
  // The gap this closes: a whole platform could break and appear only as a
  // slightly worse success rate, because failures carried no site at all.
  process.chdir(scratch);
  await logEvent({ type: "lookup", ok: false, host: "tiktok.com", code: "UNKNOWN" });
  await logEvent({ type: "lookup", ok: false, host: "tiktok.com", code: "UNKNOWN" });
  await logEvent({ type: "lookup", ok: false, host: "vimeo.com", code: "LOGIN_REQUIRED" });
  await logEvent({ type: "lookup", ok: true, site: "Youtube" });
  const stats = await getStats();
  process.chdir(cwd);

  const tt = stats.lookupFailures.find((f) => f.host === "tiktok.com");
  const vm = stats.lookupFailures.find((f) => f.host === "vimeo.com");
  assert.equal(tt.count, 2);
  assert.equal(tt.topCode, "UNKNOWN");
  assert.equal(vm.topCode, "LOGIN_REQUIRED", "the reason is kept, not just the count");
  // Worst first, so the panel leads with whatever is costing the most visitors.
  assert.equal(stats.lookupFailures[0].host, "tiktok.com");
});

test("failures older than the chosen period drop off the panel", async () => {
  // 846 YouTube relay failures from before the WARP pool led this panel long
  // after the last one, above problems that were happening that day.
  process.chdir(scratch);
  const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
  fs.appendFileSync(
    path.join(scratch, "data", "events.jsonl"),
    JSON.stringify({ t: old, type: "lookup", ok: false, host: "youtu.be", code: "RELAY_DOWN" }) + "\n",
  );
  await logEvent({ type: "lookup", ok: false, host: "pin.it", code: "UNSUPPORTED_SITE" });
  const week = await getStats(7);
  const month = await getStats(28);
  process.chdir(cwd);
  assert.equal(week.lookupFailures.find((f) => f.host === "youtu.be"), undefined);
  assert.equal(week.lookupFailures.find((f) => f.host === "pin.it").count, 1);
  // Eight days ago is inside 28 days, and in the 7 days before the last 7.
  assert.equal(month.lookupFailures.find((f) => f.host === "youtu.be").count, 1);
  assert.ok(week.previous.lookups >= 1);
});

test("the switch reads 1d, 7d and 28d, and anything else as 7 days", () => {
  assert.equal(rangeFrom("1d"), 1);
  assert.equal(rangeFrom("7d"), 7);
  assert.equal(rangeFrom("28d"), 28);
  assert.equal(rangeFrom(["28d", "1d"]), 28, "a repeated parameter uses the first");
  for (const bad of [undefined, "", "30d", "7", "d", "-1d", "1d;", 7, null]) {
    assert.equal(rangeFrom(bad), 7, String(bad));
  }
});

test("each period has a full chart axis and counts only its own events", async () => {
  process.chdir(scratch);
  const now = Date.now();
  const file = path.join(scratch, "data", "events.jsonl");
  // 30 hours ago: outside the last day, inside the day before and the week.
  fs.appendFileSync(file, JSON.stringify({ t: now - 30 * 60 * 60 * 1000, type: "download", mode: "video" }) + "\n");
  const before1 = await getStats(1);
  await logEvent({ type: "download", mode: "video" });
  const day = await getStats(1);
  const week = await getStats(7);
  const month = await getStats(28);
  process.chdir(cwd);

  assert.equal(day.series.length, 24, "a bar per hour");
  assert.equal(week.series.length, 7, "a bar per day");
  assert.equal(month.series.length, 28);
  assert.equal(day.downloads, before1.downloads + 1, "the new download is in the last day");
  assert.ok(day.previous.downloads >= 1, "the 30 hour old one counts as the day before");
  assert.equal(
    week.series.reduce((n, b) => n + b.downloads, 0),
    week.downloads,
    "the bars add up to the total",
  );
  assert.ok(day.since > week.since && week.since > month.since);
  assert.ok(day.dataFrom !== null && day.dataFrom <= now - 8 * 24 * 60 * 60 * 1000);
});

test("the Trustpilot prompt is tallied by what visitors did with it", async () => {
  process.chdir(scratch);
  await logEvent({ type: "review", action: "shown" });
  await logEvent({ type: "review", action: "shown" });
  await logEvent({ type: "review", action: "opened" });
  await logEvent({ type: "review", action: "closed" });
  // Anything else written under the type is ignored, not counted somewhere.
  await logEvent({ type: "review", action: "bogus" });
  const stats = await getStats();
  process.chdir(cwd);
  assert.deepEqual(stats.reviewPrompt, { shown: 2, opened: 1, closed: 1 });
});

test("a successful lookup is never counted as a failure", async () => {
  process.chdir(scratch);
  const before = (await getStats()).lookupFailures.reduce((n, f) => n + f.count, 0);
  await logEvent({ type: "lookup", ok: true, site: "TikTok", host: "tiktok.com" });
  const after = (await getStats()).lookupFailures.reduce((n, f) => n + f.count, 0);
  process.chdir(cwd);
  assert.equal(after, before, "ok:true carries a host too and must not be counted");
});
