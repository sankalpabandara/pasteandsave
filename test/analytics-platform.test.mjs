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
const { logEvent, getStats } = await import("../src/lib/analytics.ts");
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
  const before = (await getStats()).totalDownloads;
  await logEvent({ type: "download", mode: "video", proxied: false });
  const stats = await getStats();
  process.chdir(cwd);

  assert.equal(stats.totalDownloads, before + 1, "still counted in the total");
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

test("a successful lookup is never counted as a failure", async () => {
  process.chdir(scratch);
  const before = (await getStats()).lookupFailures.reduce((n, f) => n + f.count, 0);
  await logEvent({ type: "lookup", ok: true, site: "TikTok", host: "tiktok.com" });
  const after = (await getStats()).lookupFailures.reduce((n, f) => n + f.count, 0);
  process.chdir(cwd);
  assert.equal(after, before, "ok:true carries a host too and must not be counted");
});
