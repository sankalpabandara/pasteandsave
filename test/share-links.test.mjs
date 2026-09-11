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
import { isShareLink } from "../src/lib/share-links.ts";

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
