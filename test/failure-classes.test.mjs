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
/** A function's body from the source, run with the named functions in scope. */
function liftWith(name, deps) {
  const start = src.indexOf(`export function ${name}(`);
  assert.notEqual(start, -1, `${name} not found in ytdlp.ts`);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      return new Function(...Object.keys(deps), `return function ${name}(stderr) ${src.slice(open, j + 1)};`)(
        ...Object.values(deps),
      );
    }
  }
  throw new Error(`could not read ${name}`);
}
const exitUnreachable = liftWith("exitUnreachable", {});
const exitBroke = liftWith("exitBroke", { isAddressRefused, exitUnreachable });

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

// userFacingError has a return type with braces in it, so it is lifted from
// the body that follows the signature, with stand ins for the classes it tests.
function liftUserFacingError() {
  const start = src.indexOf("export function userFacingError(");
  assert.notEqual(start, -1);
  const open = src.indexOf("} {", start) + 2;
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      return new Function(
        "isBlockedByPlatform",
        `class UnsupportedSiteError extends Error {}
         class ProxyUnreachableError extends Error {}
         class SiteUnavailableHereError extends Error {}
         class PlatformBlockedError extends Error {}
         function userFacingError(err) ${src.slice(open, j + 1)}
         return { userFacingError, PlatformBlockedError };`,
      )(isBlockedByPlatform);
    }
  }
  throw new Error("could not read userFacingError");
}
const { userFacingError, PlatformBlockedError } = liftUserFacingError();
const failureReason = (() => {
  const start = src.indexOf("export function failureReason(");
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      return new Function(`function failureReason(err) ${src.slice(open, j + 1)}; return failureReason;`)();
    }
  }
  throw new Error("could not read failureReason");
})();

// Copied from the server on 2026-10-19, which is in France.
const PORNHUB_FR = "ERROR: [PornHub] ph5af5fef7c2aa7: Redirection detected; the video may be deleted or require login";
const XVIDEOS_FR =
  "ERROR: [XVideos] ucfifdo284a: No video formats found!; please report this issue on  https://github.com/yt-dlp/yt-dlp/issues?q= , filling out the appropriate issue template.";
const XHAMSTER_FR = "ERROR: [XHamster] xh58v06: No video formats found!; please report this issue on  https://github.com/yt-dlp/yt-dlp/issues";

test("the French age check is named as such, not as a missing sign in or video", () => {
  for (const msg of [PORNHUB_FR, XVIDEOS_FR, XHAMSTER_FR]) {
    const r = userFacingError(new Error(msg));
    assert.equal(r.code, "AGE_CHECK_REGION", msg);
    assert.equal(r.status, 451);
  }
});

test("no formats on any other site is still a photo or text post", () => {
  const r = userFacingError(new Error("ERROR: [twitter] 1790637656616943991: No video could be found in this tweet"));
  assert.equal(r.code, "NO_FORMATS");
  const ig = userFacingError(new Error("ERROR: [Instagram] abc: No video formats found!"));
  assert.equal(ig.code, "NO_FORMATS");
});

test("a Vimeo embed limited to its owner's sites is not called a block of our server", () => {
  const r401 = userFacingError(new Error("ERROR: [vimeo] 33951933: Unable to download webpage: HTTP Error 401: Unauthorized"));
  assert.equal(r401.code, "EMBED_ONLY");
  // A 403 matches the block check, which would invite a retry that cannot work.
  const r403 = userFacingError(
    new PlatformBlockedError('ERROR: [vimeo] 54469442: Got HTTP Error 403 when using impersonate target "chrome-146:macos-26".'),
  );
  assert.equal(r403.code, "EMBED_ONLY");
  // What yt-dlp says when it knows the video is embed only.
  const named = userFacingError(
    new Error("ERROR: [vimeo] 756714419: Cannot download embed-only video without embedding URL. Please call yt-dlp with the URL of the page"),
  );
  assert.equal(named.code, "EMBED_ONLY");
  assert.match(named.error, /page where you watched it/);
  // A 403 anywhere else is still a block.
  assert.equal(userFacingError(new Error("ERROR: unable to download video data: HTTP Error 403: Forbidden")).code, "UPSTREAM_BLOCKED");
});

test("a broken exit is told apart from a video that fails everywhere", () => {
  // Worth the next exit: these are about the exit.
  assert.equal(exitBroke("ERROR: Unable to download webpage: ('Unable to connect to proxy', ConnectionRefusedError(111))"), true);
  assert.equal(exitBroke("yt-dlp timed out"), true);
  assert.equal(exitBroke("ERROR: [youtube] x: Sign in to confirm you're not a bot"), true);
  // Not worth it: every exit would say the same.
  assert.equal(exitBroke("ERROR: [facebook] 1889836315019111: Cannot parse data; please report this issue on"), false);
  assert.equal(exitBroke("ERROR: [facebook] 1: This video is private"), false);
  // Unreachable is the exit's fault for every site; a bot wall is one site's
  // view of it, and only counts against it for that site.
  assert.equal(exitUnreachable("ERROR: ('Unable to connect to proxy', ConnectionRefusedError(111))"), true);
  assert.equal(exitUnreachable("ERROR: [youtube] x: Sign in to confirm you're not a bot"), false);
});

test("a Facebook video only signed in viewers can see says so", () => {
  const r = userFacingError(
    new Error("ERROR: [facebook] 1889836315019111: Cannot parse data; please report this issue on  https://github.com/yt-dlp/yt-dlp/issues?q= ,"),
  );
  assert.equal(r.code, "LOGIN_ONLY");
  assert.equal(r.status, 422);
  assert.doesNotMatch(r.error, /[-‐-―]/);
  // A post with no video in it, which yt-dlp follows on to a 404.
  const post = userFacingError(
    new Error("ERROR: [facebook] pfbid02oLEnD5sp1913zmAaXYttEYLp3hKxChKh6M3jBEcQQJeb5HSSXuuEX2PRhZrobucol: Unable to download webpage: HTTP Error 404: Not Found"),
  );
  assert.equal(post.code, "NO_FORMATS");
  assert.match(post.error, /photo or text post/);
  assert.doesNotMatch(post.error, /[-‐-―]/);
  // Other sites' parse errors are not claimed for Facebook.
  assert.notEqual(userFacingError(new Error("ERROR: [SomeSite] 1: Cannot parse data")).code, "LOGIN_ONLY");
});

// Copied from the server log on 2026-10-20, ids and addresses cut.
const SEEN = {
  liability: "ERROR: [Liability] This website is not supported and will not be supported.\nThere are legal reasons",
  piracy: "ERROR: [Piracy] This website is no longer supported since it has been determined to be primarily used for piracy.",
  drmSite: "ERROR: [DRM] The requested site is known to use DRM protection. It will NOT be supported.",
  suspended: "ERROR: [twitter] 1599108751385972737: Suspended",
  xUnavailable: "ERROR: [twitter] 1599108751385972737: Video #1 is unavailable",
  xNotVideo: "ERROR: [twitter] 1: Media #1 is not a video",
  fb404: "ERROR: [facebook] 1794878554585921: Unable to download webpage: HTTP Error 404: Not Found (caused by <HTTPError 404: Not Found>)",
  igEmpty: "ERROR: [Instagram] C1a: Instagram sent an empty media response. Check if this post is accessible in your browser without being logged-in.",
  ttIp: "ERROR: [TikTok] 7300: Your IP address is blocked from accessing this post",
  ttLogin: "ERROR: [TikTok] 7300: This post may not be comfortable for some audiences. Log in for access. Use --cookies-from-browser",
  dmFrench: "ERROR: [dailymotion] x8: Le propriétaire de cette vidéo ne souhaite pas la diffuser dans votre pays.",
};

test("each failure seen in the log gets its own honest answer", () => {
  const code = (m) => userFacingError(new Error(m)).code;
  assert.equal(code(SEEN.liability), "SITE_NOT_SUPPORTED");
  assert.equal(code(SEEN.piracy), "SITE_NOT_SUPPORTED");
  assert.equal(code(SEEN.drmSite), "DRM_PROTECTED");
  assert.equal(code(SEEN.suspended), "MEDIA_REMOVED");
  assert.equal(code(SEEN.xUnavailable), "NO_FORMATS");
  assert.equal(code(SEEN.xNotVideo), "NO_FORMATS");
  assert.equal(code(SEEN.fb404), "MEDIA_REMOVED");
  assert.equal(code(SEEN.igEmpty), "LOGIN_REQUIRED");
  assert.equal(code(SEEN.ttIp), "GEO_BLOCKED");
  assert.equal(code(SEEN.ttLogin), "LOGIN_REQUIRED");
  assert.equal(code(SEEN.dmFrench), "GEO_BLOCKED");
  // A deleted X post found through the embed data.
  assert.equal(code("ERROR: [twitter] This post has been deleted"), "MEDIA_REMOVED");
});

test("none of those answers says unknown, and none has a dash", () => {
  for (const m of Object.values(SEEN)) {
    const r = userFacingError(new Error(m));
    assert.notEqual(r.code, "UNKNOWN", m);
    assert.doesNotMatch(r.error, /[-‐-―]/, r.error);
  }
});

test("an extractor that prints null is a failed lookup, not a crash", () => {
  const start = src.indexOf("function parseInfoJson(");
  const open = src.indexOf("{", start);
  let depth = 0, body = "";
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) { body = src.slice(open, j + 1); break; }
  }
  const parseInfoJson = new Function(`return function parseInfoJson(stdout) ${body.replace(/let parsed: unknown;/, "let parsed;").replace(/ as YtDlpInfo/g, "")};`)();
  assert.throws(() => parseInfoJson("null"), /emptyout/);
  assert.throws(() => parseInfoJson("[]"), /emptyout/);
  assert.throws(() => parseInfoJson(""), /emptyout/);
  assert.throws(() => parseInfoJson("<html>"), /badjson/);
  assert.equal(parseInfoJson('{"id":"x"}').id, "x");
});

test("a pool exit the impersonating client cannot reach counts as a broken exit", () => {
  const ig = "ERROR: [Instagram] C1a: Unable to download webpage: Failed to perform, curl: (7) Failed to connect to www.instagram.com:443 over proxy 127.0.0.1 after 0 ms";
  assert.equal(exitUnreachable(ig), true);
});

test("copy protection is final, whether found at lookup or by the extractor", () => {
  // DrmProtectedError carries exactly this message.
  assert.equal(userFacingError(new Error("DRM protected")).code, "DRM_PROTECTED");
  assert.equal(userFacingError(new Error("ERROR: [SomeSite] 1: This video is DRM protected")).code, "DRM_PROTECTED");
});

test("Vimeo's FairPlay key tag reads as DRM, plain AES and no key do not", () => {
  const m = src.match(/const DRM_KEY_TAG =\s*(\/.+\/i);/);
  assert.ok(m, "DRM_KEY_TAG not found in ytdlp.ts");
  const re = new Function(`return ${m[1]};`)();
  // From the variant playlists of 76979871 and 22439234, fetched 2026-10-19.
  assert.equal(
    re.test('#EXTM3U\n#EXT-X-VERSION:6\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://abc",KEYFORMAT="com.apple.streamingkeydelivery",KEYFORMATVERSIONS="1"\n'),
    true,
  );
  assert.equal(re.test('#EXT-X-KEY:METHOD=SAMPLE-AES-CTR,KEYFORMAT="urn:uuid:edef8ba9-79d6-4ace-a3c8-27dcd51d21ed"'), true);
  assert.equal(re.test('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="https://example.test/key"\n'), false);
  assert.equal(re.test("#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nseg1.mp4\n"), false);
});

test("visible error text has no dashes or hyphens", () => {
  for (const msg of [PORNHUB_FR, "ERROR: [vimeo] 1: HTTP Error 401", "DRM protected"]) {
    assert.doesNotMatch(userFacingError(new Error(msg)).error, /[-\u2010-\u2015]/);
  }
});

test("the logged reason keeps what the site said and drops ids, URLs and paths", () => {
  assert.equal(
    failureReason(new Error("WARNING: x\nERROR: [twitter] 1790637656616943991: No video could be found in this tweet")),
    "[twitter] No video could be found in this tweet",
  );
  assert.equal(failureReason(new Error(XVIDEOS_FR)), "[XVideos] No video formats found!");
  const proxied = failureReason(
    new Error("ERROR: Unable to connect to socks5h://user:secret@1.2.3.4:1080 while writing /tmp/ps-abc/file.part"),
  );
  assert.doesNotMatch(proxied, /secret|1\.2\.3\.4|ps-abc/);
  assert.equal(failureReason(new Error("no error line here")), "");
});

test("a removed video is neither", () => {
  const msg = "ERROR: [youtube] abc: Video unavailable. This video has been removed by the uploader";
  assert.equal(isAddressRefused(msg), false);
  assert.equal(isBlockedByPlatform(msg), false);
});
