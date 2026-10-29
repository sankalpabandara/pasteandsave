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
import { headingId, imagesIn, readingMinutes, renderMarkdown, tableOfContents } from "../src/lib/markdown.ts";
import { IMAGES } from "../src/content/blog/images.ts";

const dir = path.join(process.cwd(), "src", "content", "blog");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && f !== "images.ts");
const publicDir = path.join(process.cwd(), "public");
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

test("the basics are lessons numbered 1, 2, 3 and on with no gap, and every post has a known category", () => {
  const lessons = posts.map(({ post }) => post).filter((p) => p.category === "basics").map((p) => p.lesson);
  assert.ok(lessons.length >= 4);
  assert.deepEqual(
    lessons.sort((a, b) => a - b),
    lessons.map((_, i) => i + 1),
  );
  for (const { post } of posts) {
    assert.ok(["basics", "guides", "fixes"].includes(post.category));
    if (post.category !== "basics") assert.equal(post.lesson, undefined, `${post.slug} is not a lesson`);
  }
});

test("every post has a cover, with a small copy for the cards", () => {
  for (const { post } of posts) {
    const cover = IMAGES[`/blog/images/${post.slug}.jpg`];
    assert.ok(cover, `${post.slug} has no cover in images.ts`);
    assert.equal(cover.width, 1200, `${post.slug} cover width`);
    assert.equal(cover.height, 630, `${post.slug} cover height`);
    assert.ok(cover.small && fs.existsSync(path.join(publicDir, cover.small)), `${post.slug} small cover`);
  }
});

test("every image a post shows exists, is listed with its size, and has a caption", () => {
  for (const { post } of posts) {
    const shown = imagesIn(post.body);
    assert.ok(shown.length >= 1, `${post.slug} has no images in the body`);
    for (const { src, caption } of shown) {
      assert.ok(IMAGES[src], `${post.slug}: ${src} is not in images.ts`);
      assert.ok(fs.existsSync(path.join(publicDir, src)), `${post.slug}: ${src} is missing from public`);
      assert.ok(caption.length >= 10, `${post.slug}: ${src} has no caption`);
    }
    const html = renderMarkdown(post.body, IMAGES);
    assert.equal((html.match(/<figure>/g) ?? []).length, shown.length, `${post.slug}: an image is not on a line of its own`);
    assert.doesNotMatch(html, /<img(?![^>]*\bwidth=)/, `${post.slug}: an image has no size`);
  }
});

test("every image file carries its alt text, a description and copyright inside it", () => {
  for (const [src, img] of Object.entries(IMAGES)) {
    const file = path.join(publicDir, src);
    assert.ok(fs.existsSync(file), `${src} is missing`);
    assert.ok(img.alt.length >= 30 && img.alt.length <= 250, `${src} alt length ${img.alt.length}`);
    // XMP is stored as plain text in both JPEG and WebP, so it can be read
    // straight from the bytes.
    const bytes = fs.readFileSync(file).toString("latin1");
    assert.ok(bytes.includes("<dc:creator>"), `${src} has no creator`);
    assert.ok(bytes.includes("xmpRights:WebStatement"), `${src} has no rights statement`);
    assert.ok(bytes.includes(img.alt.replace(/&/g, "&amp;")), `${src}: the description inside the file differs from its alt`);
    for (const used of [img.small].filter(Boolean)) {
      assert.ok(fs.existsSync(path.join(publicDir, used)), `${used} is missing`);
    }
  }
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
    for (const { src, caption } of imagesIn(post.body)) fields.push(caption, IMAGES[src]?.alt ?? "");
    fields.push(IMAGES[`/blog/images/${post.slug}.jpg`]?.alt ?? "");
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
    for (const [, bang, href] of post.body.matchAll(/(!?)\[[^\]]*\]\((\/[^)#\s]*)/g)) {
      if (bang) continue; // an image, checked with the images
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

test("an image on its own line becomes a sized, lazy figure with the listed alt text", () => {
  const sizes = { "/a.webp": { width: 1200, height: 440, alt: 'Steps "one" to three' } };
  const html = renderMarkdown('Before\n\n![](/a.webp "The caption")\n\n![Own alt](/b.webp)\n', sizes);
  assert.ok(
    html.includes(
      '<figure><img src="/a.webp" alt="Steps &quot;one&quot; to three" width="1200" height="440" loading="lazy" decoding="async"><figcaption>The caption</figcaption></figure>',
    ),
    html,
  );
  assert.ok(html.includes('<img src="/b.webp" alt="Own alt" loading="lazy"'), "unlisted images keep their own alt");
  assert.deepEqual(imagesIn('![](/a.webp "The caption")\ntext ![x](/inline.png) text\n'), [
    { src: "/a.webp", caption: "The caption" },
  ]);
  assert.equal(readingMinutes("word ".repeat(400) + '\n![](/a.webp "a long caption that is not read")\n'), 2);
});
