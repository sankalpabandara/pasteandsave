// The public site list is the one claim on this website that a reader can
// check for themselves, so it has to stay checkable: no duplicates, no adult
// names, no broken entries, and a number the rest of the copy does not
// contradict.
//
// Run: node --test test/supported-sites.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { SITES as SUPPORTED_SITES, GENERATED, YTDLP_VERSION } from "../src/content/supported-sites.ts";

const SUPPORTED_SITES_BUILT = GENERATED;
const SUPPORTED_SITES_SOURCE = `yt-dlp ${YTDLP_VERSION}`;

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), "utf8");

test("the list is long, sorted and free of repeats", () => {
  assert.ok(SUPPORTED_SITES.length > 900, `only ${SUPPORTED_SITES.length} sites`);
  assert.equal(new Set(SUPPORTED_SITES).size, SUPPORTED_SITES.length, "a site is listed twice");
  // yt-dlp names a few sites twice, once as a class and once as a domain
  // ("TikTok" and "tiktok"). Only one of each should reach the page.
  const lowered = SUPPORTED_SITES.map((s) => s.toLowerCase());
  assert.equal(new Set(lowered).size, lowered.length, "a site is listed twice in different case");
  const sorted = [...SUPPORTED_SITES].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  assert.deepEqual(SUPPORTED_SITES, sorted, "the list is not in order");
  for (const name of SUPPORTED_SITES) {
    assert.ok(name.trim() === name && name.length > 0, `bad entry ${JSON.stringify(name)}`);
  }
});

test("nothing broken or adult reaches the page", () => {
  for (const name of SUPPORTED_SITES) {
    assert.ok(!/CURRENTLY BROKEN/i.test(name), `${name} is marked broken`);
    assert.ok(!name.includes(":"), `${name} is a sub extractor, not a site`);
  }
  const blocked = ["porn", "xxx", "xham", "xvideos", "xnxx", "hentai", "chaturbate", "redtube"];
  for (const name of SUPPORTED_SITES) {
    const lower = name.toLowerCase();
    for (const word of blocked) {
      assert.ok(!lower.includes(word), `${name} should not be listed`);
    }
  }
});

test("the list says where it came from", () => {
  assert.match(SUPPORTED_SITES_BUILT, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(SUPPORTED_SITES_SOURCE, /^yt-dlp \d/);
});

// The whole point of the page is that the headline number can be trusted.
// A claim of more sites than the page can name would undo that, so the copy
// is held below the list rather than above it.
test("no page claims more sites than the list names", () => {
  const files = [
    "src/i18n/en.ts",
    "src/i18n/es.ts",
    "src/i18n/pt.ts",
    "src/i18n/id.ts",
    "src/app/layout.tsx",
    "src/app/extension/page.tsx",
    "src/app/opengraph-image.tsx",
    "src/lib/seo-pages.ts",
  ];
  for (const file of files) {
    const text = read(file);
    for (const match of text.matchAll(/([0-9][0-9.,]{2,})\+?\s*(?:other\s+)?(?:sites|sitios|situs)/gi)) {
      const claimed = Number(match[1].replace(/[.,]/g, ""));
      assert.ok(
        claimed <= SUPPORTED_SITES.length,
        `${file} claims ${claimed} sites but only ${SUPPORTED_SITES.length} are listed`,
      );
    }
  }
});

test("the page is linked and in the sitemap", () => {
  assert.match(read("src/app/sitemap.ts"), /"\/supported-sites"/);
  assert.match(read("src/components/Footer.tsx"), /href="\/supported-sites"/);
  assert.match(read("src/components/Platforms.tsx"), /href="\/supported-sites"/);
});
