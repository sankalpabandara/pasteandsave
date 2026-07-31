// Picking which address to send for a video in a feed.
//
// This is the logic behind "That link isn't from a site we can download from"
// on TikTok. The extension found the video, could not work out which clip it
// was, sent the page address instead, and the site quite correctly refused a
// profile URL. The message blamed the platform for what was only a bad guess.
//
// The two rules under test:
//   - a level of the DOM holding links to several different clips is the feed,
//     not the item, so nothing from that level can be trusted
//   - a level holding exactly one is this clip's own link
//
// The previous rule stopped the climb when a level held more than one <video>,
// which is a different thing entirely: feeds preload their neighbours into the
// same card, so the climb broke before reaching the anchor.
//
// Run: node --test test/resolve-target.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// A DOM small enough to reason about, with only what the resolver touches.
class El {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.children = [];
    this.parentElement = null;
  }
  append(...kids) {
    for (const k of kids) {
      k.parentElement = this;
      this.children.push(k);
    }
    return this;
  }
  getAttribute(name) {
    return this.attrs[name] ?? null;
  }
  #walk(out) {
    for (const c of this.children) {
      out.push(c);
      c.#walk(out);
    }
    return out;
  }
  querySelectorAll(sel) {
    const all = this.#walk([]);
    if (sel === "video") return all.filter((e) => e.tagName === "VIDEO");
    if (sel === "a[href]") return all.filter((e) => e.tagName === "A" && e.attrs.href);
    return [];
  }
}

const PERMALINK = /\/(?:video|videos|watch|reel|reels|shorts|status)\//i;
const looksLikeContentLink = (u) => PERMALINK.test(u.pathname + u.search);

// The rule as implemented: climb, and take a level that yields exactly one
// distinct content link. Several means the feed; carry on means keep climbing.
function resolveFromCard(video, pageHost) {
  let node = video;
  for (let depth = 0; node && depth < 10; depth++) {
    const found = [];
    for (const a of node.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#")) continue;
      let abs;
      try {
        abs = new URL(href, `https://${pageHost}/`);
      } catch {
        continue;
      }
      if (abs.hostname !== pageHost) continue;
      if (looksLikeContentLink(abs) && !found.includes(abs.href)) found.push(abs.href);
    }
    if (found.length === 1) return found[0];
    if (found.length > 1) return null;
    node = node.parentElement;
  }
  return null;
}

const HOST = "www.tiktok.com";

test("a feed card that preloads its neighbour still resolves", () => {
  // The regression. TikTok keeps the next clip's <video> inside the same
  // card, so the old "stop at more than one video" rule broke the climb
  // before it ever saw the anchor.
  const video = new El("video");
  const neighbourVideo = new El("video");
  const card = new El("div").append(
    video,
    neighbourVideo,
    new El("a", { href: "/@catcute.kaio/video/7412345678901234567" }),
  );
  new El("div").append(card);

  assert.equal(
    resolveFromCard(video, HOST),
    "https://www.tiktok.com/@catcute.kaio/video/7412345678901234567",
  );
});

test("a level holding several clips is refused rather than guessed at", () => {
  // Returning any of these would download whichever neighbour sorted first.
  const video = new El("video");
  const feed = new El("div").append(
    new El("div").append(video),
    new El("a", { href: "/@a/video/111" }),
    new El("a", { href: "/@b/video/222" }),
  );
  void feed;
  assert.equal(resolveFromCard(video, HOST), null);
});

test("the nearest card wins over the wider feed", () => {
  const video = new El("video");
  const ownCard = new El("div").append(video, new El("a", { href: "/@me/video/999" }));
  new El("div").append(
    ownCard,
    new El("a", { href: "/@other/video/111" }),
    new El("a", { href: "/@other/video/222" }),
  );
  assert.equal(resolveFromCard(video, HOST), "https://www.tiktok.com/@me/video/999");
});

test("profile and hashtag links are not mistaken for a clip", () => {
  const video = new El("video");
  new El("div").append(
    video,
    new El("a", { href: "/@catcute.kaio" }),
    new El("a", { href: "/tag/cats" }),
  );
  assert.equal(resolveFromCard(video, HOST), null, "no clip link means no guess");
});

test("a link to another site is ignored", () => {
  const video = new El("video");
  new El("div").append(video, new El("a", { href: "https://example.com/video/1" }));
  assert.equal(resolveFromCard(video, HOST), null);
});

test("the same clip linked twice in a card is still one answer", () => {
  // Thumbnail and caption both link to the clip; that is one item, not two.
  const video = new El("video");
  new El("div").append(
    video,
    new El("a", { href: "/@me/video/555" }),
    new El("a", { href: "/@me/video/555" }),
  );
  assert.equal(resolveFromCard(video, HOST), "https://www.tiktok.com/@me/video/555");
});


// --- feeds that carry no link to the clip at all ---------------------------
//
// TikTok's For You feed was the real failure. Confirmed on the live page: no
// /video/ anchor anywhere in the clip's ancestry, page address /foryou,
// canonical /foryou?lang=en-GB. Every route came back empty, so the page
// address went to the server and was refused. The id was there all along,
// just not as a link.

function tiktokPermalink(video, hostname, docQueryAll) {
  if (!/(^|\.)tiktok\.com$/i.test(hostname)) return null;
  let id = null;
  let node = video;
  for (let d = 0; node && d < 8 && !id; d++) {
    const raw = node.getAttribute?.("id") || "";
    const m = /^xgwrapper-\d+-(\d{6,})$/.exec(raw);
    if (m) id = m[1];
    node = node.parentElement;
  }
  if (!id) return null;
  let card = video;
  for (let d = 0; card && d < 10; d++) {
    if (card.getAttribute?.("data-e2e") === "recommend-list-item-container") break;
    card = card.parentElement;
  }
  const scope = card || { querySelectorAll: docQueryAll };
  let handle = null;
  for (const a of scope.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href") || "";
    const m = /^\/(@[\w.\-]+)\/?$/.exec(href);
    if (m) { handle = m[1]; break; }
  }
  if (!handle) return null;
  return `https://www.tiktok.com/${handle}/video/${id}`;
}

function feedCard(id, handle) {
  const video = new El("video");
  const wrapper = new El("div", { id: `xgwrapper-0-${id}` }).append(video);
  const card = new El("article", { "data-e2e": "recommend-list-item-container" }).append(
    wrapper,
    new El("a", { href: `/@${handle}` }),
    new El("a", { href: "/tag/fyp" }),
  );
  return { video, card };
}

test("a feed clip with no permalink anywhere is still identified", () => {
  const { video } = feedCard("7664974377280212244", "_vinzyon_");
  assert.equal(
    tiktokPermalink(video, "www.tiktok.com", () => []),
    "https://www.tiktok.com/@_vinzyon_/video/7664974377280212244",
  );
});

test("each clip gets its own author, not the neighbour's", () => {
  // The failure this guards against: a feed handing back the handle of the
  // clip above, so pressing download on one video fetches another's account.
  const a = feedCard("111111111111111111", "first_user");
  const b = feedCard("222222222222222222", "second_user");
  new El("div").append(a.card, b.card);

  assert.equal(
    tiktokPermalink(a.video, "www.tiktok.com", () => []),
    "https://www.tiktok.com/@first_user/video/111111111111111111",
  );
  assert.equal(
    tiktokPermalink(b.video, "www.tiktok.com", () => []),
    "https://www.tiktok.com/@second_user/video/222222222222222222",
  );
});

test("hashtag and music links are not mistaken for a handle", () => {
  const video = new El("video");
  const wrapper = new El("div", { id: "xgwrapper-0-999999999999999999" }).append(video);
  new El("article", { "data-e2e": "recommend-list-item-container" }).append(
    wrapper,
    new El("a", { href: "/tag/cute" }),
    new El("a", { href: "/music/original-sound-7657155472763439894" }),
    new El("a", { href: "/@realhandle" }),
  );
  assert.equal(
    tiktokPermalink(video, "www.tiktok.com", () => []),
    "https://www.tiktok.com/@realhandle/video/999999999999999999",
  );
});

test("it does nothing on other sites", () => {
  const { video } = feedCard("123456789012345678", "someone");
  assert.equal(tiktokPermalink(video, "www.youtube.com", () => []), null);
});

test("no id means no guess", () => {
  const video = new El("video");
  new El("article", { "data-e2e": "recommend-list-item-container" }).append(
    video,
    new El("a", { href: "/@someone" }),
  );
  assert.equal(tiktokPermalink(video, "www.tiktok.com", () => []), null);
});
