// Finding the player in a page, for videos whose owner limits them to their
// own website. yt-dlp needs that page as the referer: one of its own test
// videos, player.vimeo.com/video/756714419, was refused on its own and gave six
// formats with the page sent along, measured on the server on 2026-10-19.
//
// Run: node --test test/page-embeds.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { findEmbed, makeGuardedLookup, smuggleReferer } from "../src/lib/embed-match.ts";
import { isPrivateHost } from "../src/lib/ip-guard.ts";

const PAGE = "https://sleepsuperconference.com/sessions/yoga/";

/** What yt-dlp's unsmuggle_url reads back out of a smuggled address. */
function unsmuggle(url) {
  const [base, frag] = url.split("#__youtubedl_smuggle=");
  return { base, data: JSON.parse(decodeURIComponent(frag)) };
}

test("the referer is carried the way yt-dlp reads it", () => {
  const out = smuggleReferer("https://player.vimeo.com/video/756714419", PAGE);
  assert.deepEqual(unsmuggle(out), {
    base: "https://player.vimeo.com/video/756714419",
    data: { referer: PAGE },
  });
});

test("a Vimeo iframe is found and sent with the page as referer", () => {
  const html = `<p>Watch</p><iframe src="https://player.vimeo.com/video/756714419?badge=0&amp;h=ab12cd34ef&amp;autopause=0" allow="autoplay"></iframe>`;
  const { base, data } = unsmuggle(findEmbed(html, PAGE));
  assert.equal(base, "https://player.vimeo.com/video/756714419?h=ab12cd34ef");
  assert.equal(data.referer, PAGE);
});

test("players named inside scripts and protocol relative are found too", () => {
  const html = `<script>window.cfg={"embed":"\\/\\/player.vimeo.com\\/video\\/123456"}</script>`;
  assert.equal(unsmuggle(findEmbed(html, PAGE)).base, "https://player.vimeo.com/video/123456");
});

test("the hash survives the double escaping vimeo.com's own pages use", () => {
  // Copied from vimeo.com/blog on 2026-10-19.
  const html = `{"html":"<iframe src=\\"https:\\/\\/player.vimeo.com\\/video\\/1085116382?h=89273da3c3\\u0026amp;badge=0\\u0026amp;autopause=0\\"></iframe>"}`;
  assert.equal(unsmuggle(findEmbed(html, PAGE)).base, "https://player.vimeo.com/video/1085116382?h=89273da3c3");
});

test("a Vimeo event embed keeps its own address", () => {
  const html = `<iframe src="https://vimeo.com/event/5034253/embed" frameborder="0"></iframe>`;
  assert.equal(unsmuggle(findEmbed(html, PAGE)).base, "https://vimeo.com/event/5034253/embed");
});

test("a YouTube embed becomes its watch address, with nothing smuggled", () => {
  const html = `<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0"></iframe>`;
  assert.equal(findEmbed(html, PAGE), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
});

test("the first player on the page wins", () => {
  const html = `<iframe src="https://www.youtube.com/embed/aaaaaaaaaaa"></iframe>
    <iframe src="https://player.vimeo.com/video/42"></iframe>`;
  assert.equal(findEmbed(html, PAGE), "https://www.youtube.com/watch?v=aaaaaaaaaaa");
});

test("links to a channel or profile are not embeds", () => {
  const html = `<a href="https://www.youtube.com/@someone">YouTube</a>
    <a href="https://vimeo.com/someone">Vimeo</a>
    <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">a video we link to</a>`;
  assert.equal(findEmbed(html, PAGE), null);
});

test("a hash that is not hex is not carried into the address", () => {
  const html = `<iframe src="https://player.vimeo.com/video/42?h=<script>"></iframe>`;
  assert.equal(unsmuggle(findEmbed(html, PAGE)).base, "https://player.vimeo.com/video/42");
});

// The guard is what keeps a visitor's link from reaching this server's own
// network. "localhost" resolves to a loopback address without any network.
function lookup(guard, host, all) {
  return new Promise((resolve) => {
    guard(host, { all }, (err, address) => resolve({ err, address }));
  });
}

test("a name that resolves to a private address is refused at connect time", async () => {
  const guard = makeGuardedLookup(isPrivateHost);
  for (const all of [false, true]) {
    const { err } = await lookup(guard, "localhost", all);
    assert.ok(err, `localhost must be refused (all=${all})`);
    assert.equal(err.code, "EPRIVATE");
  }
});

test("a public answer is passed on in the shape the caller asked for", async () => {
  // Stand in for "every address is public" so this needs no outside DNS.
  const guard = makeGuardedLookup(() => false);
  const one = await lookup(guard, "localhost", false);
  assert.equal(one.err, null);
  assert.equal(typeof one.address, "string");
  const many = await lookup(guard, "localhost", true);
  assert.equal(many.err, null);
  assert.ok(Array.isArray(many.address) && many.address.length > 0);
});
