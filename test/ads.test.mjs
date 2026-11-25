// Ad placements: every slot asks Adsterra for a size it actually has codes for,
// its box is tall enough for that banner, and nothing still loads A-ADS.
//
// Run: node --test test/ads.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { AD_SLOTS, ADSTERRA_SIZES, adsterraDimensions } from "../src/lib/ads.ts";

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
