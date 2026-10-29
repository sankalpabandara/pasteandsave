// The blog (src/content/blog, rendered by src/app/blog). Every post file is
// loaded directly and checked against the rules the site's copy follows.
//
// Run: node --test test/blog.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TOOL_PAGES } from "../src/lib/seo-pages.ts";
import { headingId, readingMinutes, renderMarkdown, tableOfContents } from "../src/lib/markdown.ts";

const dir = path.join(process.cwd(), "src", "content", "blog");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
const posts = [];
for (const f of files) {
  const mod = await import(pathToFileURL(path.join(dir, f)).href);
  posts.push({ file: f, post: mod.post });
}

const ROUTES = new Set([
  "/",
  "/blog",
  "/extension",
  "/terms",
  "/privacy",
  ...TOOL_PAGES.map((t) => `/${t.slug}`),
  ...posts.map(({ post }) => `/blog/${post.slug}`),
]);

/** The words a reader sees: link targets, list markers and table rules removed. */
function visibleText(md) {
  return md
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/^\s*(?:[*]|\d+\.)\s+/gm, "")
    .replace(/^\|?[\s:|-]+\|?$/gm, "")
    .replace(/\byt-dlp\b/g, "ytdlp");
}

test("there are posts, and each file is named after its slug", () => {
  assert.ok(posts.length >= 9);
  for (const { file, post } of posts) assert.equal(`${post.slug}.ts`, file);
  assert.equal(new Set(posts.map(({ post }) => post.slug)).size, posts.length);
});

test("titles and descriptions fit what search results show", () => {
  for (const { post } of posts) {
    assert.ok(post.seoTitle.length >= 30 && post.seoTitle.length <= 60, `${post.slug} seoTitle ${post.seoTitle.length}`);
    assert.ok(
      post.description.length >= 110 && post.description.length <= 160,
      `${post.slug} description ${post.description.length}`,
    );
    assert.ok(post.title.length <= 70, `${post.slug} title`);
    assert.ok(post.keywords.length >= 4, `${post.slug} keywords`);
  }
});

test("the basics are four numbered lessons and every post has a known category", () => {
  const lessons = posts.map(({ post }) => post).filter((p) => p.category === "basics").map((p) => p.lesson);
  assert.deepEqual(lessons.sort(), [1, 2, 3, 4]);
  for (const { post } of posts) assert.ok(["basics", "guides", "fixes"].includes(post.category));
});

test("every post answers three to five questions in full sentences", () => {
  for (const { post } of posts) {
    assert.ok(post.faqs.length >= 3 && post.faqs.length <= 5, post.slug);
    for (const f of post.faqs) {
      assert.ok(f.q.endsWith("?"), `${post.slug}: ${f.q}`);
      assert.ok(f.a.length >= 80, `${post.slug}: answer too short for ${f.q}`);
    }
  }
});

test("no dashes or hyphens anywhere a reader sees", () => {
  for (const { post } of posts) {
    const fields = [post.title, post.seoTitle, post.description, post.excerpt, visibleText(post.body)];
    for (const f of post.faqs) fields.push(f.q, f.a);
    // yt-dlp is the program's real name, so it is the one hyphen allowed.
    for (const text of fields.map((t) => t.replace(/\byt-dlp\b/g, "ytdlp"))) {
      const m = /.{0,30}[-‐-―].{0,30}/.exec(text);
      assert.equal(m, null, `${post.slug}: "${m?.[0]}"`);
    }
  }
});

test("none of the stock phrases that make copy read as machine written", () => {
  const banned = /\b(delve|comprehensive|robust|leverage|utili[sz]e|seamless(ly)?|in today's|landscape|game changer|unlock|elevate|furthermore|moreover|it is worth noting|in conclusion|dive into)\b/i;
  for (const { post } of posts) {
    const all = [post.title, post.description, post.excerpt, post.body, ...post.faqs.flatMap((f) => [f.q, f.a])].join("\n");
    const m = banned.exec(all);
    assert.equal(m, null, `${post.slug}: "${m?.[0]}"`);
  }
});

test("every link to our own site goes to a page that exists", () => {
  for (const { post } of posts) {
    for (const [, href] of post.body.matchAll(/\]\((\/[^)#\s]*)/g)) {
      assert.ok(ROUTES.has(href), `${post.slug} links to ${href}`);
    }
    if (post.tool) assert.ok(ROUTES.has(post.tool.href), `${post.slug} tool ${post.tool.href}`);
  }
});

test("the body has sections, no H1, and renders with anchors the contents can use", () => {
  for (const { post } of posts) {
    assert.doesNotMatch(post.body, /^# /m, `${post.slug} has an H1 in the body`);
    const toc = tableOfContents(post.body);
    assert.ok(toc.length >= 4, `${post.slug} has ${toc.length} sections`);
    const html = renderMarkdown(post.body);
    for (const item of toc) assert.ok(html.includes(`<h2 id="${item.id}">`), `${post.slug}: no anchor ${item.id}`);
    assert.equal(new Set(toc.map((t) => t.id)).size, toc.length, `${post.slug}: two sections share an anchor`);
    assert.doesNotMatch(html, /\*\*/, `${post.slug}: unrendered bold`);
    assert.ok(readingMinutes(post.body) >= 3, `${post.slug} is very short`);
  }
});

test("the renderer adds anchors, opens other sites in a new tab and wraps tables", () => {
  const html = renderMarkdown(
    "## Why it **won't** play\n\n[ours](/blog) and [theirs](https://example.com)\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n",
  );
  assert.ok(html.includes('<h2 id="why-it-wont-play">'));
  assert.ok(html.includes('<a href="/blog">'), "own links stay in the tab");
  assert.ok(html.includes('href="https://example.com" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('<div class="table-wrap"><table>'));
  assert.equal(headingId("MP4, WebM, MOV or MKV"), "mp4-webm-mov-or-mkv");
});
