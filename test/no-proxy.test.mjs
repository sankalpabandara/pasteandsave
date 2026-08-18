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
