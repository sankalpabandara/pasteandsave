// Ad placements: every slot asks Adsterra for a size it actually has codes for,
// its box is tall enough for that banner, and nothing still loads A-ADS.
//
// Run: node --test test/ads.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AD_SLOTS, ADSTERRA_SIZES, NATIVE_SLOTS, adsterraDimensions } from "../src/lib/ads.ts";
import {
  adsterraKey,
  policyFromSettings,
  scriptHost,
  scriptSrcFromCode,
} from "../src/lib/adsterra-code.ts";

const KEY = "0123456789abcdef0123456789abcdef";

test("a pasted Social Bar code gives its https script address", () => {
  const code = `<script type='text/javascript' src='//pl28001234.profitableratecpm.com/ab/cd/ef/abcdef12.js'></script>`;
  assert.equal(scriptSrcFromCode(code), "https://pl28001234.profitableratecpm.com/ab/cd/ef/abcdef12.js");
  // A bare address works too, and http is lifted to https.
  assert.equal(scriptSrcFromCode("http://example.com/a.js"), "https://example.com/a.js");
  assert.equal(scriptSrcFromCode("//example.com/a.js"), "https://example.com/a.js");
});

test("a pasted Native Banner code gives its address and container key", () => {
  const code = `<script async="async" data-cfasync="false" src="//pl28001235.profitableratecpm.com/${KEY}/invoke.js"></script>\n<div id="container-${KEY}"></div>`;
  const src = scriptSrcFromCode(code);
  assert.equal(src, `https://pl28001235.profitableratecpm.com/${KEY}/invoke.js`);
  assert.equal(adsterraKey(src), KEY);
  // Anti adblock codes end in the key instead.
  assert.equal(adsterraKey(`https://bellnewyork.org/22/${KEY}`), KEY);
});

test("codes without a usable script address are refused", () => {
  for (const bad of ["", "hello", "<div>no script</div>", "<script>alert(1)</script>", "javascript:alert(1)", "<script src='ftp://x.com/a.js'></script>"]) {
    assert.equal(scriptSrcFromCode(bad), null, bad);
  }
  assert.equal(scriptHost("https://ex ample.com/a.js"), null);
});

test("the content policy gets every saved ad host and knows when the Social Bar is on", () => {
  const policy = policyFromSettings({
    adsterra: { "728x90": { key: KEY, src: `https://bellnewyork.org/22/${KEY}` } },
    socialBar: "https://pl1.socialhost.com/a/b.js",
    native: `https://pl2.nativehost.com/${KEY}/invoke.js`,
    units: { homeTop: "2449325" },
  });
  assert.deepEqual(policy.hosts.sort(), [
    "https://*.bellnewyork.org",
    "https://*.pl1.socialhost.com",
    "https://*.pl2.nativehost.com",
    "https://bellnewyork.org",
    "https://pl1.socialhost.com",
    "https://pl2.nativehost.com",
  ]);
  assert.equal(policy.socialBar, true);
  assert.equal(policy.pageScripts, true);
  assert.equal(policyFromSettings({ socialBar: "" }).socialBar, false);
  assert.deepEqual(policyFromSettings(null), { hosts: [], socialBar: false, pageScripts: false });
  // A broken entry can never smuggle anything into the policy header.
  assert.deepEqual(policyFromSettings({ socialBar: "https://a.com; script-src *" }).hosts, []);
});

test("every format that runs in the page opens the policy, and its host is allowed", () => {
  // The Popunder, Interstitial and In-Page Push scripts run in the page like
  // the Social Bar, so each on its own has to set pageScripts: without it the
  // page refuses the eval their scripts need and the format silently earns
  // nothing, which looks exactly like a network that is not filling.
  for (const kind of ["socialBar", "popunder", "interstitial", "inPagePush"]) {
    const policy = policyFromSettings({ [kind]: "https://pl9.adhost.com/a/b.js" });
    assert.equal(policy.pageScripts, true, `${kind}: did not open the page policy`);
    assert.deepEqual(policy.hosts.sort(), ["https://*.pl9.adhost.com", "https://pl9.adhost.com"]);
  }
  // The banners sit in a sealed frame and need none of it.
  const banners = policyFromSettings({
    adsterra: { "320x50": { key: KEY, src: `https://bellnewyork.org/22/${KEY}` } },
  });
  assert.equal(banners.pageScripts, false);
  assert.equal(policyFromSettings({ popunder: "not a url" }).pageScripts, false);
});

test("the wait beside the Save buttons and the sticky bar are real places", () => {
  // The download wait is the attentive minute on this site: a visitor cannot
  // leave the page without losing the file. It carries a banner and a native
  // row, and the frame route only serves a slot that exists here.
  assert.equal(AD_SLOTS.downloadWait.banner, "300x250");
  assert.ok(NATIVE_SLOTS.waitNative);
  // The sticky bar is a phone banner, so it asks for the phone size.
  assert.equal(AD_SLOTS.stickyBottom.banner, "320x50");
  assert.equal(AD_SLOTS.stickyBottom.bannerMobile, undefined);
});

test("the side rails fit the empty margin they are meant to sit in", () => {
  // 1024px of page content plus a 160px rail and a gap on each side is 1392,
  // which is why the component renders nothing below 1440px. A rail that
  // overlapped the text would be worse than no rail, so if either of these
  // numbers is ever changed the other has to move with it.
  const CONTENT = 1024;
  const MIN_WIDTH = 1440;
  for (const slot of ["railLeft", "railRight"]) {
    assert.equal(AD_SLOTS[slot].banner, "160x600");
    assert.equal(AD_SLOTS[slot].maxWidth, 160);
    assert.ok(AD_SLOTS[slot].height >= 600);
  }
  const needed = CONTENT + 2 * (AD_SLOTS.railLeft.maxWidth + 24);
  assert.ok(MIN_WIDTH >= needed, `rails need ${needed}px but only wait for ${MIN_WIDTH}px`);
  // And the component has to be asking for that same width.
  const source = fs.readFileSync("src/components/ads/SideRails.tsx", "utf8");
  assert.match(source, new RegExp(`MIN_WIDTH = ${MIN_WIDTH};`));
});

test("native places reserve a sensible box", () => {
  for (const [key, cfg] of Object.entries(NATIVE_SLOTS)) {
    assert.ok(cfg.height >= 120 && cfg.height <= 600, `${key}: ${cfg.height}`);
    assert.ok(cfg.label.length > 5);
  }
});

test("every slot asks for a known Adsterra size and fits it", () => {
  for (const [key, cfg] of Object.entries(AD_SLOTS)) {
    for (const size of [cfg.banner, cfg.bannerMobile].filter(Boolean)) {
      assert.ok(ADSTERRA_SIZES.includes(size), `${key}: unknown size ${size}`);
      const { width, height } = adsterraDimensions(size);
      assert.ok(cfg.height >= height, `${key}: box ${cfg.height}px is shorter than ${size}`);
      if (size === cfg.banner) assert.ok(cfg.maxWidth >= width, `${key}: box narrower than ${size}`);
    }
    assert.ok(!("unitId" in cfg) && !("shareWith" in cfg), `${key}: still carries A-ADS fields`);
  }
});

test("no source file loads A-ADS any more", () => {
  const hits = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        if (/a-ads\.com|aads\.com|data-aa\b/.test(text)) hits.push(path.relative(process.cwd(), full));
      }
    }
  };
  walk(path.join(process.cwd(), "src"));
  assert.deepEqual(hits, []);
});
