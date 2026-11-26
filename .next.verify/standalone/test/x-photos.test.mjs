// Photos from X posts. yt-dlp reads only video from X, so a photo post was
// "No video could be found": 29 x.com lookups in the week to 2026-10-20.
//
// Run: node --test test/x-photos.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  X_NO_VIDEO,
  fetchTweetPhotos,
  photoIndexOf,
  photosFor,
  photosFromSyndication,
  rememberPhotos,
  syndicationToken,
  tweetIdFrom,
} from "../src/lib/x-photos.ts";

test("the post id is read from every address shape X hands out", () => {
  assert.equal(tweetIdFrom("https://x.com/TheEllenShow/status/440322224407314432"), "440322224407314432");
  assert.equal(tweetIdFrom("https://twitter.com/a_b/status/440322224407314432/photo/1"), "440322224407314432");
  assert.equal(tweetIdFrom("https://mobile.twitter.com/a/status/123?s=20"), "123");
  assert.equal(tweetIdFrom("https://x.com/i/web/status/123"), "123");
  assert.equal(tweetIdFrom("https://x.com/i/status/123"), "123");
  assert.equal(tweetIdFrom("https://x.com/someone"), null);
  assert.equal(tweetIdFrom("https://notx.com/a/status/123"), null);
  assert.equal(tweetIdFrom("not a url"), null);
});

test("the token is the widget's own derivation of the id", () => {
  const t = syndicationToken("440322224407314432");
  assert.match(t, /^[0-9a-z]+$/);
  assert.equal(t, ((Number("440322224407314432") / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, ""));
});

test("only yt-dlp's no-video answers from X lead to the photo lookup", () => {
  assert.match("ERROR: [twitter] 1: No video could be found in this tweet", X_NO_VIDEO);
  assert.match("ERROR: [twitter] 1: Media #1 is not a video", X_NO_VIDEO);
  assert.match("ERROR: [twitter] 1: Video #1 is unavailable", X_NO_VIDEO);
  assert.doesNotMatch("ERROR: [twitter] 1: Suspended", X_NO_VIDEO);
  assert.doesNotMatch("ERROR: [Instagram] 1: No video could be found", X_NO_VIDEO);
});

const PHOTO_POST = {
  __typename: "Tweet",
  mediaDetails: [
    { type: "photo", media_url_https: "https://pbs.twimg.com/media/BhxWutnCEAAtEQ6.jpg", original_info: { width: 2048, height: 1152 } },
    { type: "photo", media_url_https: "https://pbs.twimg.com/media/Second.png" },
    { type: "video", media_url_https: "https://pbs.twimg.com/ext_tw_video_thumb/1/pu/img/x.jpg" },
    { type: "photo", media_url_https: "https://evil.test/media/x.jpg" },
    { type: "photo", media_url_https: "http://pbs.twimg.com/media/plain.jpg" },
  ],
};

test("photos are taken from pbs.twimg.com media only, at original size", () => {
  const { photos, removed } = photosFromSyndication(PHOTO_POST);
  assert.equal(removed, false);
  assert.deepEqual(photos, [
    { url: "https://pbs.twimg.com/media/BhxWutnCEAAtEQ6?format=jpg&name=orig", width: 2048, height: 1152, ext: "jpg" },
    { url: "https://pbs.twimg.com/media/Second?format=png&name=orig", width: null, height: null, ext: "png" },
  ]);
});

test("a deleted post is told apart from a post with no photos", () => {
  assert.deepEqual(photosFromSyndication({ __typename: "TweetTombstone" }), { photos: [], removed: true });
  assert.deepEqual(photosFromSyndication({ __typename: "Tweet", mediaDetails: [] }), { photos: [], removed: false });
  assert.deepEqual(photosFromSyndication(null), { photos: [], removed: false });
});

test("the embed data is fetched by id with its token, and failures give nothing", async () => {
  let asked = "";
  const ok = async (url) => {
    asked = String(url);
    return new Response(JSON.stringify(PHOTO_POST), { status: 200, headers: { "content-type": "application/json" } });
  };
  const got = await fetchTweetPhotos("440322224407314432", ok);
  assert.equal(got.photos.length, 2);
  assert.match(asked, /^https:\/\/cdn\.syndication\.twimg\.com\/tweet-result\?id=440322224407314432&lang=en&token=[0-9a-z]+$/);
  assert.deepEqual(await fetchTweetPhotos("1", async () => new Response("no", { status: 404 })), { photos: [], removed: false });
  assert.deepEqual(await fetchTweetPhotos("1", async () => { throw new Error("offline"); }), { photos: [], removed: false });
});

test("the download finds the photos the lookup listed, by number", () => {
  const key = "https://x.com/a/status/9";
  rememberPhotos(key, photosFromSyndication(PHOTO_POST).photos);
  assert.equal(photosFor(key)[1].ext, "png");
  assert.equal(photosFor(key, Date.now() + 61 * 60 * 1000), null, "forgotten after an hour");
  assert.equal(photoIndexOf("xphoto-2"), 2);
  assert.equal(photoIndexOf("137"), null);
  assert.equal(photoIndexOf("xphoto-"), null);
  assert.equal(photoIndexOf(undefined), null);
});
