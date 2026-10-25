// The share row shown under a finished download (src/components/ShareBar.tsx).
//
// Run: node --test test/share.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARE_CHANNELS, SHARE_TEXT, isShareChannel, shareHref, sharedLink } from "../src/lib/share.ts";

const SITE = "https://pasteandsave.com";

test("every shared address names the channel it was sent on", () => {
  assert.equal(sharedLink(SITE, "whatsapp"), "https://pasteandsave.com/?from=whatsapp");
  // A trailing slash on the configured address does not double up.
  assert.equal(sharedLink(`${SITE}/`, "copy"), "https://pasteandsave.com/?from=copy");
});

test("each message channel opens with the text and the address filled in", () => {
  const link = encodeURIComponent(`${SITE}/?from=`);
  const wa = shareHref(SITE, "whatsapp");
  assert.ok(wa.startsWith("https://wa.me/?text="));
  assert.ok(wa.includes(`${link}whatsapp`));
  assert.ok(decodeURIComponent(wa).includes(SHARE_TEXT));
  assert.ok(shareHref(SITE, "telegram").startsWith(`https://t.me/share/url?url=${link}telegram&text=`));
  assert.equal(shareHref(SITE, "facebook"), `https://www.facebook.com/sharer/sharer.php?u=${link}facebook`);
  assert.ok(shareHref(SITE, "x").endsWith(`&url=${link}x`));
  // Copy and the phone's own share menu have no page to open.
  assert.equal(shareHref(SITE, "copy"), null);
  assert.equal(shareHref(SITE, "native"), null);
});

test("only the known channel names are accepted from a visitor", () => {
  for (const c of SHARE_CHANNELS) assert.equal(isShareChannel(c), true);
  for (const bad of ["", "WhatsApp", "email", "<script>", null, undefined, 3, {}]) {
    assert.equal(isShareChannel(bad), false, String(bad));
  }
});

test("the shared text reads plainly, with no dashes", () => {
  assert.doesNotMatch(SHARE_TEXT, /[-‐-―]/);
});
