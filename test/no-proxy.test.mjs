// Which sites need an address we may not have.
//
// This covers the case where the owner cancels the paid proxy. Sites that
// refuse a datacenter address then have nowhere to go, and the old code found
// that out the expensive way: the direct-first path was gated on a proxy
// existing, so with none configured it was skipped entirely, a full extraction
// ran and failed, and for YouTube a second one ran with different player
// clients. Two extractor timeouts and a held lookup slot to rediscover a known
// fact, on every single request.
//
// The fix rests on separating two questions that proxyArgs answered as one:
// "does this site need a non-datacenter address" and "do we have one".
//
// Run: node --test test/no-proxy.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { hostNeedsProxy, PROXY_HOSTS } from "../src/lib/proxy-routing.ts";

test("the sites known to refuse this server are recognised", () => {
  assert.ok(PROXY_HOSTS.includes("youtube.com"), "YouTube is on the list by default");
  assert.equal(hostNeedsProxy("https://www.youtube.com/watch?v=abc"), true);
  assert.equal(hostNeedsProxy("https://youtu.be/abc"), true);
  assert.equal(hostNeedsProxy("https://www.instagram.com/reel/abc/"), true);
});

test("the sites that work direct are left alone", () => {
  // These must never be gated, with or without a proxy: they are the 1,200+
  // that cost nothing and have to keep working after the proxy is cancelled.
  assert.equal(hostNeedsProxy("https://www.tiktok.com/@a/video/1"), false);
  assert.equal(hostNeedsProxy("https://www.facebook.com/watch?v=1"), false);
  assert.equal(hostNeedsProxy("https://vimeo.com/1"), false);
});

test("subdomains count, lookalike domains do not", () => {
  assert.equal(hostNeedsProxy("https://m.youtube.com/watch?v=a"), true);
  assert.equal(hostNeedsProxy("https://music.youtube.com/watch?v=a"), true);
  // Suffix matching alone would catch this, and it is somebody else's domain.
  assert.equal(hostNeedsProxy("https://notyoutube.com/watch?v=a"), false);
  assert.equal(hostNeedsProxy("https://youtube.com.evil.test/a"), false);
});

test("junk input is not treated as a site that needs the proxy", () => {
  // Reached from visitor-supplied text, so it must not throw or default to true.
  assert.equal(hostNeedsProxy("not a url at all"), false);
  assert.equal(hostNeedsProxy(""), false);
});

// --- Sticky proxy sessions -------------------------------------------------
//
// The lookup caches yt-dlp's output and the download replays it with
// --load-info-json. Those links are signed against whichever exit address
// fetched them, so both calls have to land on the same one.
//
// A random session id per call did not. The lookup went out through one exit
// address and the download through another, the platform refused links it had
// signed for somebody else, and the visitor was told "this site is
// rate-limiting our server" - blaming the platform for a mismatch we created.
// Nothing failed loudly on our side, which is why it went unnoticed.

import { stickyProxyUrl, newSessionId } from "../src/lib/proxy-routing.ts";

const PROXY = "http://user:pass@gate.example.test:7000";
const VIDEO = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const OTHER = "https://www.youtube.com/watch?v=oHg5SJYRHA0";

const sessionOf = (u) => /_session-([a-z0-9]+)/.exec(new URL(u).password)?.[1] ?? null;

test("the same video always gets the same session", () => {
  // This is the whole fix: the lookup and the download call this separately,
  // seconds apart, and must agree.
  const a = sessionOf(stickyProxyUrl(PROXY, VIDEO));
  const b = sessionOf(stickyProxyUrl(PROXY, VIDEO));
  assert.ok(a, "a session was attached");
  assert.equal(a, b, "lookup and download must land on one exit address");
});

test("different videos get different sessions", () => {
  // Still spread across the pool: one address per video, not one for all.
  assert.notEqual(sessionOf(stickyProxyUrl(PROXY, VIDEO)), sessionOf(stickyProxyUrl(PROXY, OTHER)));
});

test("an unseeded session is still random", () => {
  // Callers with no URL to hand keep the old behaviour rather than collapsing
  // onto one shared session.
  assert.notEqual(newSessionId(), newSessionId());
});

test("session ids are short and alphanumeric", () => {
  // Goes into a proxy password field, so it must survive being put in a URL.
  const id = newSessionId(VIDEO);
  assert.match(id, /^[a-z0-9]{8}$/);
});

test("credentials are preserved and not duplicated", () => {
  const once = stickyProxyUrl(PROXY, VIDEO);
  assert.equal(new URL(once).username, "user");
  assert.match(new URL(once).password, /^pass_session-/);
  // Re-wrapping an already-tagged URL must not stack a second session on it.
  assert.equal(stickyProxyUrl(once, VIDEO), once);
});

test("a proxy URL with no credentials is left alone", () => {
  // Nothing to attach a session to, and mangling it would break the proxy.
  const bare = "http://gate.example.test:7000/";
  assert.equal(stickyProxyUrl(bare, VIDEO), bare);
});

// --- Verdicts are scoped to the extractor that learned them ----------------
//
// A refusal recorded while the extractor itself was broken - a dead player
// client, no JS runtime - said nothing about whether the address was really
// refused. But it was treated as though it did, so after the real fault was
// repaired the site went on skipping the direct attempt and reaching for a proxy
// that was itself dead. Twelve hours of being wrong about a question it had
// stopped asking.

import { shouldTryDirect, recordDirectResult, resetRouting } from "../src/lib/proxy-routing.ts";

const OLD = "android_vr|nojsi";
const NEW = "default|jsi";

test("a refusal is remembered while the extractor is unchanged", () => {
  resetRouting();
  recordDirectResult("youtube.com", false, OLD);
  assert.equal(shouldTryDirect("youtube.com", OLD), false, "no point re-asking");
});

test("changing the extractor retires what the old one learned", () => {
  resetRouting();
  recordDirectResult("youtube.com", false, OLD);
  assert.equal(
    shouldTryDirect("youtube.com", NEW),
    true,
    "a working client deserves its own attempt, not the broken one's verdict",
  );
});

test("a success is retired the same way", () => {
  // Symmetry matters: a client that could reach a site is no evidence that a
  // different one can.
  resetRouting();
  recordDirectResult("youtube.com", true, OLD);
  assert.equal(shouldTryDirect("youtube.com", NEW), true);
});

test("the lookup and the download must agree", () => {
  // They call this separately with the same fingerprint. If they disagreed, the
  // download would route differently from the lookup and present links signed
  // for one address from another.
  resetRouting();
  recordDirectResult("youtube.com", false, NEW);
  assert.equal(shouldTryDirect("youtube.com", NEW), false);
});

// --- Verdicts survive a restart --------------------------------------------
//
// They were memory only, so every deploy forgot them and the next YouTube lookup
// paid a doomed 25 second direct attempt out of a 60 second budget. Two visitors
// got "yt-dlp timed out" instead of a video.

import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

test("a verdict is written out and read back by a fresh process", async () => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "pas-routing-"));
  const cwd = process.cwd();
  try {
    process.chdir(scratch);
    // A separate import so the module initialises with this directory as cwd,
    // which is how the real process finds its data folder.
    const first = await import(`../src/lib/proxy-routing.ts?store=${Date.now()}`);
    first.recordDirectResult("youtube.com", false, "default|jsi");
    // The write is coalesced, so wait past the debounce before reading.
    await new Promise((r) => setTimeout(r, 2400));
    const saved = JSON.parse(await fsp.readFile(path.join(scratch, "data", "routing.json"), "utf8"));
    assert.equal(saved["youtube.com"].direct, false);
    assert.equal(saved["youtube.com"].fp, "default|jsi");

    const second = await import(`../src/lib/proxy-routing.ts?store=${Date.now()}-b`);
    assert.equal(
      second.shouldTryDirect("youtube.com", "default|jsi"),
      false,
      "a fresh process should not repeat an attempt it already knows fails",
    );
  } finally {
    process.chdir(cwd);
    await fsp.rm(scratch, { recursive: true, force: true });
  }
});

test("a missing or corrupt store is not an error", async () => {
  // This is an optimisation and must never be why a download fails.
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "pas-routing-bad-"));
  const cwd = process.cwd();
  try {
    await fsp.mkdir(path.join(scratch, "data"), { recursive: true });
    await fsp.writeFile(path.join(scratch, "data", "routing.json"), "{not json", "utf8");
    process.chdir(scratch);
    const mod = await import(`../src/lib/proxy-routing.ts?store=bad-${Date.now()}`);
    assert.equal(mod.shouldTryDirect("youtube.com", "x"), true, "starts empty, as before");
  } finally {
    process.chdir(cwd);
    await fsp.rm(scratch, { recursive: true, force: true });
  }
});
