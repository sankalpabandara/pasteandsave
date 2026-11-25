// The page list that IndexNow and the SEO crawler use, and the root key file
// IndexNow needs before it accepts any of those pages.
//
// Run: node --test test/site-paths.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TOOL_PAGES } from "../src/lib/seo-pages.ts";
import { indexNowKeyPath, sitePaths } from "../src/lib/site-paths.ts";
import nextConfig from "../next.config.ts";

const blogDir = path.join(process.cwd(), "src", "content", "blog");
const postSlugs = [];
for (const f of fs.readdirSync(blogDir).filter((f) => f.endsWith(".ts") && f !== "images.ts")) {
  const mod = await import(pathToFileURL(path.join(blogDir, f)).href);
  postSlugs.push(mod.post.slug);
}
const paths = sitePaths(TOOL_PAGES.map((t) => t.slug), postSlugs);

test("every tool page, blog post and legal page is listed once", () => {
  for (const t of TOOL_PAGES) assert.ok(paths.includes(`/${t.slug}`), t.slug);
  for (const s of postSlugs) assert.ok(paths.includes(`/blog/${s}`), s);
  for (const p of ["/", "/blog", "/extension", "/terms", "/privacy"]) assert.ok(paths.includes(p), p);
  assert.equal(new Set(paths).size, paths.length);
  assert.ok(postSlugs.length >= 15);
});

test("the IndexNow key file sits at the root, so it covers every page", () => {
  const keyPath = indexNowKeyPath("521951b2d90fb66211e39c817ca11fbb");
  assert.equal(keyPath, "/521951b2d90fb66211e39c817ca11fbb.txt");
  const folder = keyPath.slice(0, keyPath.lastIndexOf("/") + 1);
  for (const p of paths) assert.ok(p.startsWith(folder), p);
});

test("next.config rewrites the root key file to the key route", async () => {
  const { beforeFiles } = await nextConfig.rewrites();
  const rule = beforeFiles.find((r) => r.destination === "/indexnow/:key");
  assert.ok(rule, "rewrite missing");
  const re = new RegExp("^/([a-fA-F0-9-]{8,64})\\.txt$");
  assert.equal(rule.source, "/:key([a-fA-F0-9-]{8,64}).txt");
  assert.ok(re.test(indexNowKeyPath("521951b2d90fb66211e39c817ca11fbb")));
  assert.ok(!re.test("/tiktok-video-downloader"));
});
