// TikTok photo posts (slideshows) and the short links that lead to them.
//
// yt-dlp has no extractor for /@user/photo/ID, so the slides are read from the
// post page's own data, and vt.tiktok.com short links are resolved first so the
// lookup can see that address. The page below keeps the shape measured on the
// server on 2026-11-25 (__UNIVERSAL_DATA_FOR_REHYDRATION__, webapp.video-detail,
// itemInfo.itemStruct.imagePost.images[].imageURL.urlList).
//
// Run: node --test test/tiktok-photos.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchTikTokPhotos,
  photosFromTikTokPage,
  tiktokPhotoPost,
  tiktokVideoAddress,
} from "../src/lib/tiktok-photos.ts";
import { canonicalTiktok, isShareLink } from "../src/lib/share-links.ts";

const img = (name, host = "p16-common-sign.tiktokcdn-eu.com") => ({
  imageURL: {
    urlList: [
      `https://${host}/tos-maliva-i-photomode-us/${name}~tplv-photomode-image.jpeg?dr=10375&x-expires=1795788000&x-signature=abc`,
    ],
  },
  imageWidth: 1440,
  imageHeight: 1440,
});

function page(detail) {
  const data = { __DEFAULT_SCOPE__: { "webapp.app-context": {}, "webapp.video-detail": detail } };
  return `<html><head></head><body><script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application/json">${JSON.stringify(data)}</script></body></html>`;
}

const slideshow = page({
  statusCode: 0,
  itemInfo: {
    itemStruct: {
      desc: "clear display and screenshot to save",
      imagePost: { title: "very cute cat pfps for you!!", images: [img("aaa"), img("bbb"), img("ccc", "p19-common-sign.tiktokcdn-us.com")] },
    },
  },
});

test("photo post addresses are recognised, video ones are not", () => {
  assert.deepEqual(tiktokPhotoPost("https://www.tiktok.com/@strawbvrriezz/photo/7606831942381718797"), {
    user: "strawbvrriezz",
    id: "7606831942381718797",
  });
  assert.deepEqual(tiktokPhotoPost("https://tiktok.com/@thinkpad.x270.lover/photo/7594147928399219990/"), {
    user: "thinkpad.x270.lover",
    id: "7594147928399219990",
  });
  assert.equal(tiktokPhotoPost("https://www.tiktok.com/@user/video/7606831942381718797"), null);
  assert.equal(tiktokPhotoPost("https://evil.example/@user/photo/7606831942381718797"), null);
  assert.equal(tiktokPhotoPost("https://tiktok.com.evil.example/@user/photo/7606831942381718797"), null);
  assert.equal(tiktokPhotoPost("not a url"), null);
});

test("the soundtrack is read from the post's /video/ address", () => {
  assert.equal(
    tiktokVideoAddress("https://www.tiktok.com/@strawbvrriezz/photo/7606831942381718797"),
    "https://www.tiktok.com/@strawbvrriezz/video/7606831942381718797",
  );
  assert.equal(tiktokVideoAddress("https://www.tiktok.com/@user/video/7606831942381718797"), null);
});

test("every slide is listed at full size with its title", () => {
  const { photos, removed, title } = photosFromTikTokPage(slideshow);
  assert.equal(removed, false);
  assert.equal(title, "very cute cat pfps for you!!");
  assert.equal(photos.length, 3);
  assert.equal(photos[0].width, 1440);
  assert.equal(photos[0].ext, "jpg");
  assert.match(photos[2].url, /^https:\/\/p19-common-sign\.tiktokcdn-us\.com\//);
});

test("image addresses off TikTok's image hosts are dropped", () => {
  const html = page({
    statusCode: 0,
    itemInfo: {
      itemStruct: {
        imagePost: {
          images: [
            { imageURL: { urlList: ["http://p16-common-sign.tiktokcdn-eu.com/x.jpeg", "https://169.254.169.254/latest/meta-data"] } },
            { imageURL: { urlList: ["https://tiktokcdn-eu.com.evil.example/x.jpeg"] } },
            img("ok"),
          ],
        },
      },
    },
  });
  const { photos } = photosFromTikTokPage(html);
  assert.equal(photos.length, 1);
  assert.match(photos[0].url, /\/ok~/);
});

test("a deleted post is reported as removed", () => {
  const { photos, removed } = photosFromTikTokPage(page({ statusCode: 10204, statusMsg: "item doesn't exist" }));
  assert.equal(removed, true);
  assert.equal(photos.length, 0);
});

test("a page without the data, or a video post, gives no photos and no throw", () => {
  assert.deepEqual(photosFromTikTokPage("<html>challenge</html>").photos, []);
  assert.deepEqual(photosFromTikTokPage(page({ statusCode: 0, itemInfo: { itemStruct: { video: {} } } })).photos, []);
  assert.deepEqual(photosFromTikTokPage('<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">{not json</script>').photos, []);
});

test("the page is fetched at the /video/ address and never throws", async () => {
  let asked = "";
  const ok = await fetchTikTokPhotos({ user: "strawbvrriezz", id: "7606831942381718797" }, async (url) => {
    asked = String(url);
    return new Response(slideshow, { status: 200 });
  });
  assert.equal(asked, "https://www.tiktok.com/@strawbvrriezz/video/7606831942381718797");
  assert.equal(ok.photos.length, 3);
  const failed = await fetchTikTokPhotos({ user: "a", id: "12345678" }, async () => {
    throw new Error("network down");
  });
  assert.deepEqual(failed, { photos: [], removed: false, title: null });
});

test("TikTok short links are share links, post addresses are not", () => {
  assert.equal(isShareLink("https://vt.tiktok.com/ZSHfabc12/"), true);
  assert.equal(isShareLink("https://vm.tiktok.com/ZMabc123/"), true);
  assert.equal(isShareLink("https://www.tiktok.com/t/ZTabc123/"), true);
  assert.equal(isShareLink("https://vt.tiktok.com/"), false);
  assert.equal(isShareLink("https://www.tiktok.com/@user/video/7606831942381718797"), false);
});

test("a resolved short link keeps only the post", () => {
  assert.equal(
    canonicalTiktok("https://www.tiktok.com/@strawbvrriezz/photo/7606831942381718797?_r=1&_t=ZS-abc"),
    "https://www.tiktok.com/@strawbvrriezz/photo/7606831942381718797",
  );
  assert.equal(
    canonicalTiktok("https://m.tiktok.com/@user/video/7606831942381718797/"),
    "https://www.tiktok.com/@user/video/7606831942381718797",
  );
  // A dead code lands on the home page, which is not worth handing on.
  assert.equal(canonicalTiktok("https://www.tiktok.com/?_r=1"), null);
  assert.equal(canonicalTiktok("https://evil.example/@user/photo/7606831942381718797"), null);
});
