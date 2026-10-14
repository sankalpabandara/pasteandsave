// Which yt-dlp failures count as the platform refusing our address.
//
// This decides two expensive things: the message a visitor reads, and whether
// the server throws away its WARP exit address for a new one. "Sign in to
// confirm your age" used to count, because the pattern matched "sign in to
// confirm" on its own, so an age-restricted video read as "this site is
// blocking our server" and cost a perfectly good address.
//
// Tested against the real functions in src/lib/ytdlp.ts, lifted out of the
// source, because that file cannot be loaded on its own here.
//
// Run: node --test test/failure-classes.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "ytdlp.ts"), "utf8");

function lift(name) {
  const start = src.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} not found in ytdlp.ts`);
  let depth = 0;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      // Drop the export and the type annotations so plain JavaScript runs it.
      const body = src
        .slice(start, j + 1)
        .replace(/^export /, "")
        .replace(/\(stderr: string\): boolean/, "(stderr)");
      return new Function(`${body}; return ${name};`)();
    }
  }
  throw new Error(`could not read ${name}`);
}

const isAddressRefused = lift("isAddressRefused");
const isBlockedByPlatform = lift("isBlockedByPlatform");

// Copied from the production log, apostrophe and all.
const BOT_CURLY = "ERROR: [youtube] 9x5NAqblesc: Sign in to confirm you’re not a bot. Use --cookies";
const BOT_STRAIGHT = "ERROR: [youtube] 9x5NAqblesc: Sign in to confirm you're not a bot.";
const AGE = "ERROR: [youtube] MM3CdHqeH8g: Sign in to confirm your age. This video may be inappropriate";

test("the bot wall is a refusal, whichever apostrophe YouTube uses", () => {
  assert.equal(isAddressRefused(BOT_CURLY), true);
  assert.equal(isAddressRefused(BOT_STRAIGHT), true);
  assert.equal(isBlockedByPlatform(BOT_CURLY), true);
});

test("an age-restricted video is not our address being refused", () => {
  assert.equal(isAddressRefused(AGE), false);
  assert.equal(isBlockedByPlatform(AGE), false);
});

test("rate limits count as a refusal", () => {
  assert.equal(isAddressRefused("ERROR: unable to download video data: HTTP Error 429: Too Many Requests"), true);
});

test("a bare 403 is a block worth reporting but not a reason to swap the address", () => {
  // Usually an expired or mis-signed media link, not our address.
  const msg = "ERROR: unable to download video data: HTTP Error 403: Forbidden";
  assert.equal(isBlockedByPlatform(msg), true);
  assert.equal(isAddressRefused(msg), false);
});

test("a removed video is neither", () => {
  const msg = "ERROR: [youtube] abc: Video unavailable. This video has been removed by the uploader";
  assert.equal(isAddressRefused(msg), false);
  assert.equal(isBlockedByPlatform(msg), false);
});
