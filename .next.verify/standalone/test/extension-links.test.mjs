// Which addresses the extension treats as a single piece of content.
//
// Tested against the real extension/content.js rather than a copy of its rules.
// test/resolve-target.test.mjs keeps its own copy of the permalink pattern,
// which is fine for what it checks but cannot notice the file diverging from it,
// and this is exactly the kind of rule that goes stale: Facebook's Share button
// changed and /share/r/ matched nothing at all.
//
// Run: node --test test/extension-links.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.join(process.cwd(), "extension", "content.js"), "utf8");

// Lift the two rules out of the content script and run them for real. Brace
// counting rather than a regex, because the bodies contain braces themselves.
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} not found in content.js`);
  let i = src.indexOf("{", start);
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

const permalink = /const PERMALINK\s*=\s*(\/[\s\S]*?\/i)\s*;/.exec(src);
assert.ok(permalink, "PERMALINK not found");

const build = new Function(
  `const PERMALINK = ${permalink[1]};
   ${extract("hostSpecificContentLink")}
   ${extract("looksLikeContentLink")}
   return looksLikeContentLink;`,
);
const looksLikeContentLink = build();
const isContent = (u) => looksLikeContentLink(new URL(u));

test("Facebook share links are recognised", () => {
  // What the Share button produces today. /share/v/ used to match only through
  // the /v/ in the permalink pattern, and /share/r/ matched nothing.
  assert.equal(isContent("https://www.facebook.com/share/v/abcDEF123/"), true);
  assert.equal(isContent("https://www.facebook.com/share/r/abcDEF123/"), true);
  assert.equal(isContent("https://www.facebook.com/share/p/abcDEF123/"), true);
  assert.equal(isContent("https://fb.watch/abcd1234/"), true);
});

test("the older Facebook forms still work", () => {
  assert.equal(isContent("https://www.facebook.com/watch/?v=123456"), true);
  assert.equal(isContent("https://www.facebook.com/someone/videos/123456/"), true);
  assert.equal(isContent("https://www.facebook.com/reel/123456"), true);
});

test("a Facebook profile is not a piece of content", () => {
  // The reason these rules are not just "does it mention facebook".
  assert.equal(isContent("https://www.facebook.com/someone"), false);
  assert.equal(isContent("https://www.facebook.com/"), false);
});

test("a subreddit listing is not a post", () => {
  // A subreddit called "videos" looks exactly like Facebook's /videos/ permalink.
  assert.equal(isContent("https://www.reddit.com/r/videos/"), false);
  assert.equal(isContent("https://www.reddit.com/r/videos/comments/abc123/title/"), true);
});

test("the bare-id platforms still resolve", () => {
  assert.equal(isContent("https://youtu.be/dQw4w9WgXcQ"), true);
  assert.equal(isContent("https://vimeo.com/76979871"), true);
  assert.equal(isContent("https://soundcloud.com/artist/track"), true);
  assert.equal(isContent("https://soundcloud.com/artist"), false);
});
