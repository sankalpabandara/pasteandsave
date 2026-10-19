// Recognising the addresses Facebook's Share button actually produces.
//
// fb.watch/XXXX and facebook.com/share/v/XXXX have no extractor, so yt-dlp says
// "No suitable extractor" and the site tells the visitor their link is from a
// site we cannot download from. It is not: it is Facebook, which works fine once
// the address is the canonical one. yt-dlp's generic extractor used to follow
// the redirect, but generic is disabled on purpose because it would scrape any
// URL handed to the server.
//
// Run: node --test test/share-links.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalPin,
  isShareLink,
  resolveShareLink,
  shareRelayBase,
  vimeoPlayerUrl,
} from "../src/lib/share-links.ts";

test("the forms the Share button produces are recognised", () => {
  assert.equal(isShareLink("https://fb.watch/abcd1234/"), true);
  assert.equal(isShareLink("https://www.fb.watch/abcd1234/"), true);
  assert.equal(isShareLink("https://www.facebook.com/share/v/abcDEF123/"), true);
  assert.equal(isShareLink("https://www.facebook.com/share/r/abcDEF123/"), true);
  assert.equal(isShareLink("https://facebook.com/share/p/xyz/"), true);
});

test("addresses that already have an extractor are left alone", () => {
  // Resolving these would cost a network round trip and change nothing.
  assert.equal(isShareLink("https://www.facebook.com/watch/?v=123"), false);
  assert.equal(isShareLink("https://www.facebook.com/someone/videos/123/"), false);
  assert.equal(isShareLink("https://www.facebook.com/reel/123"), false);
  assert.equal(isShareLink("https://m.facebook.com/watch/?v=123"), false);
});

test("other sites are never treated as Facebook share links", () => {
  assert.equal(isShareLink("https://www.youtube.com/watch?v=abc"), false);
  assert.equal(isShareLink("https://www.tiktok.com/@a/video/1"), false);
  // A lookalike domain must not match on suffix alone.
  assert.equal(isShareLink("https://notfacebook.com/share/v/abc/"), false);
  assert.equal(isShareLink("https://fb.watch.evil.test/abcd/"), false);
});

test("a /share/ path on another host is not a Facebook share link", () => {
  // Plenty of sites have a /share/ route; only Facebook's means this.
  assert.equal(isShareLink("https://vimeo.com/share/v/123"), false);
});

test("junk input does not throw", () => {
  // Reached straight from visitor-supplied text.
  assert.equal(isShareLink("not a url"), false);
  assert.equal(isShareLink(""), false);
});

test("share links are asked of the relay, not of a SOCKS download proxy", () => {
  // WARP carries YouTube but has no /resolve endpoint. Asking it would only
  // ever fail, so a SOCKS proxy on its own means there is no relay to ask.
  assert.equal(shareRelayBase({ YTDLP_PROXY: "socks5h://127.0.0.1:40000" }), null);
  assert.equal(
    shareRelayBase({
      YTDLP_PROXY: "socks5h://127.0.0.1:40000",
      SHARE_LINK_RELAY: "http://127.0.0.1:8081",
    }),
    "http://127.0.0.1:8081",
  );
});

// --- Pinterest ---------------------------------------------------------------
// 120 pin.it lookups were refused as "not a site we can download from".

test("a pin.it short link is a share link, the bare domain is not", () => {
  assert.equal(isShareLink("https://pin.it/4AbCdEf9"), true);
  assert.equal(isShareLink("https://pin.it/"), false);
  assert.equal(isShareLink("https://www.pinterest.com/pin/123/"), false);
  assert.equal(isShareLink("https://pin.it.evil.test/abc"), false);
});

test("a pin address is reduced to the form the extractor matches", () => {
  assert.equal(
    canonicalPin("https://www.pinterest.com/pin/664281013778109217/sent/?invite_code=x&sender=y&sfo=1"),
    "https://www.pinterest.com/pin/664281013778109217/",
  );
  assert.equal(canonicalPin("https://co.pinterest.com/pin/824721750502199491/"), "https://www.pinterest.com/pin/824721750502199491/");
  assert.equal(canonicalPin("https://www.pinterest.co.uk/pin/some-title--2885187256207927"), "https://www.pinterest.com/pin/2885187256207927/");
  // The home page is where a dead short link ends, and is not a pin.
  assert.equal(canonicalPin("https://www.pinterest.com/"), null);
  assert.equal(canonicalPin("https://notpinterest.com/pin/1/"), null);
});

/** Answers each URL from a table, as a redirect or a page, and logs the calls. */
function fakeFetch(table) {
  const calls = [];
  const fn = async (url) => {
    calls.push(String(url));
    const to = table[String(url)];
    if (to === undefined) return new Response("not in table", { status: 404 });
    if (to === 200) return new Response("<html></html>", { status: 200 });
    return new Response(null, { status: 302, headers: { location: to } });
  };
  return { fn, calls };
}

async function withFetch(fake, run) {
  const real = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    return await run();
  } finally {
    globalThis.fetch = real;
  }
}

test("pin.it is followed through Pinterest's shortener to the pin", async () => {
  // The chain measured from the server: 308, then 302 to the pin.
  const { fn, calls } = fakeFetch({
    "https://pin.it/4AbCdEf9": "https://api.pinterest.com/url_shortener/4AbCdEf9/redirect/",
    "https://api.pinterest.com/url_shortener/4AbCdEf9/redirect/":
      "https://www.pinterest.com/pin/664281013778109217/sent/?invite_code=abc&sender=1&sfo=1",
  });
  const out = await withFetch(fn, () => resolveShareLink("https://pin.it/4AbCdEf9"));
  assert.equal(out, "https://www.pinterest.com/pin/664281013778109217/");
  // The pin page itself is not fetched: arriving at it is the answer.
  assert.equal(calls.length, 2);
});

test("a dead pin.it code gives nothing rather than the home page", async () => {
  const { fn } = fakeFetch({
    "https://pin.it/zzzzzzzzz": "https://api.pinterest.com/url_shortener/zzzzzzzzz/redirect/",
    "https://api.pinterest.com/url_shortener/zzzzzzzzz/redirect/": "https://www.pinterest.com/",
    "https://www.pinterest.com/": 200,
  });
  assert.equal(await withFetch(fn, () => resolveShareLink("https://pin.it/zzzzzzzzz")), null);
});

test("a pin.it link that redirects off Pinterest is not followed", async () => {
  const { fn, calls } = fakeFetch({ "https://pin.it/evil1": "https://evil.test/pin/1/" });
  assert.equal(await withFetch(fn, () => resolveShareLink("https://pin.it/evil1")), null);
  assert.deepEqual(calls, ["https://pin.it/evil1"]);
});

// --- Vimeo -------------------------------------------------------------------
// Every vimeo.com page lookup failed with "The web client only works when
// logged-in"; the embed player still answers without an account.

test("vimeo.com page addresses become the embed player's", () => {
  assert.equal(vimeoPlayerUrl("https://vimeo.com/76979871"), "https://player.vimeo.com/video/76979871");
  assert.equal(vimeoPlayerUrl("http://www.vimeo.com/76979871/"), "https://player.vimeo.com/video/76979871");
  assert.equal(vimeoPlayerUrl("https://vimeo.com/channels/staffpicks/75629013"), "https://player.vimeo.com/video/75629013");
  assert.equal(vimeoPlayerUrl("https://vimeo.com/groups/shortfilms/videos/12345"), "https://player.vimeo.com/video/12345");
  assert.equal(vimeoPlayerUrl("https://vimeo.com/showcase/999/video/12345"), "https://player.vimeo.com/video/12345");
});

test("an unlisted video keeps its hash, from the path or from ?h=", () => {
  assert.equal(vimeoPlayerUrl("https://vimeo.com/123456/abcdef1234"), "https://player.vimeo.com/video/123456?h=abcdef1234");
  assert.equal(vimeoPlayerUrl("https://vimeo.com/123456?h=abcdef1234"), "https://player.vimeo.com/video/123456?h=abcdef1234");
  // Anything that is not a hash is not carried into the address.
  assert.equal(vimeoPlayerUrl("https://vimeo.com/123456?h=<script>"), "https://player.vimeo.com/video/123456");
});

test("Vimeo addresses that are not one video are left alone", () => {
  assert.equal(vimeoPlayerUrl("https://vimeo.com/someuser"), null);
  assert.equal(vimeoPlayerUrl("https://vimeo.com/channels/staffpicks"), null);
  assert.equal(vimeoPlayerUrl("https://player.vimeo.com/video/123"), null);
  assert.equal(vimeoPlayerUrl("https://notvimeo.com/123"), null);
  assert.equal(vimeoPlayerUrl("not a url"), null);
});

test("the Vimeo rewrite needs no network", async () => {
  const { fn, calls } = fakeFetch({});
  const out = await withFetch(fn, () => resolveShareLink("https://vimeo.com/76979871"));
  assert.equal(out, "https://player.vimeo.com/video/76979871");
  assert.equal(calls.length, 0);
});

test("an HTTP proxy is still treated as the relay when nothing else is named", () => {
  // The setup that was live before WARP: the home relay is the proxy.
  assert.equal(shareRelayBase({ YTDLP_PROXY: "http://127.0.0.1:8081" }), "http://127.0.0.1:8081");
  assert.equal(shareRelayBase({}), null);
  assert.equal(shareRelayBase({ SHARE_LINK_RELAY: "not a url" }), null);
});
