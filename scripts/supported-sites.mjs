#!/usr/bin/env node
// Rebuilds src/content/supported-sites.json from the yt-dlp binary this
// install actually runs, so the public list on /supported-sites is the real
// extractor set rather than a number somebody typed once.
//
//   node scripts/supported-sites.mjs            uses bin/yt-dlp
//   node scripts/supported-sites.mjs /path/yt-dlp
//
// What the list leaves out, and why:
//   * extractors yt-dlp marks CURRENTLY BROKEN, because they do not work
//   * the ":season", ":playlist" style variants of a site already listed
//   * sub extractors that are a listed site plus a word like Channel or User
//   * adult sites, which work but do not belong on a page we want indexed
//   * the same name twice in different case, which yt-dlp lists for a few
//
// Every exclusion only ever makes the published number smaller than the
// truth, which is the direction an honest claim should err in.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const exe = process.platform === "win32" ? ".exe" : "";
const binary = process.argv[2] || path.join(root, "bin", `yt-dlp${exe}`);
const out = path.join(root, "src", "content", "supported-sites.ts");

// A sub extractor is the parent's name with one of these stuck on the end.
// "NRKTVSeason" folds into "NRKTV"; "AcFunVideo" stays, because there is no
// bare "AcFun" to fold it into.
const SUB_PARTS = [
  "Playlists", "Playlist", "Seasons", "Season", "Series", "Shows", "Show",
  "Users", "User", "Channels", "Channel", "Profile", "Live", "Tags", "Tag",
  "Search", "Albums", "Album", "Collection", "Videos", "Video", "Clips",
  "Clip", "Pages", "Page", "Lists", "List", "Feed", "Embed", "Article",
  "Episode", "Program", "Stream", "Radio", "Podcast", "Movies", "Movie",
  "Category", "Bangumi", "Title", "Vod", "VOD", "Audio", "Images", "Image",
  "Post", "Story", "Stories", "Archive", "Base", "Home", "Main", "Mix",
  "Topic", "Trailer", "Section",
];

const ADULT = [
  "porn", "xxx", "xham", "xvideos", "xnxx", "hentai", "fap", "nsfw",
  "erotic", "camsoda", "chaturbate", "stripchat", "bongacams", "spankbang",
  "thisvid", "redtube", "youjizz", "tube8", "eporner", "motherless",
  "peekvids", "brazzers", "manyvids", "rule34", "tnaflix", "drtuber",
  "sunporno", "4tube", "fux", "noodlemagazine", "slutload", "behindkink",
  "hotmovies", "lovehomeporn", "cam4", "myvidster", "heavy-r", "txxx",
  "alphaporno", "hellporno", "moviefap", "nubiles", "zenporn", "sexu",
  "ixxx", "xxxy", "boobs", "milf", "gayporn",
];

function read(args) {
  return execFileSync(binary, args, { encoding: "utf8", maxBuffer: 32 << 20 });
}

const version = read(["--version"]).trim();
const lines = read(["--list-extractors"])
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const working = lines.filter((l) => !l.includes("CURRENTLY BROKEN"));
const families = [...new Set(working.map((l) => l.split(":")[0]))].sort();
const known = new Set(families);

const merged = families.filter((name) => {
  for (const part of SUB_PARTS) {
    if (name.length > part.length && name.endsWith(part) && known.has(name.slice(0, -part.length))) {
      return false;
    }
  }
  return true;
});

const clean = merged.filter((name) => {
  const lower = name.toLowerCase();
  return !ADULT.some((word) => lower.includes(word));
});

// yt-dlp lists a handful of sites twice, once as the class name and once as
// the domain ("TikTok" and "tiktok"). Keep whichever form carries more
// capitals, which is the one that looks like the brand.
const byLower = new Map();
for (const name of clean) {
  const key = name.toLowerCase();
  const capitals = (s) => s.replace(/[^A-Z]/g, "").length;
  const held = byLower.get(key);
  if (!held || capitals(name) > capitals(held)) byLower.set(key, name);
}

// Spellings worth getting right, because a page arguing for its own accuracy
// should not write Youtube. Anything not named here keeps yt-dlp's spelling,
// with a capital letter put back on bare words like "vimeo". Names with a dot
// are domains and are left alone.
const BRANDS = {
  youtube: "YouTube", vimeo: "Vimeo", soundcloud: "SoundCloud",
  dailymotion: "Dailymotion", twitter: "Twitter", facebook: "Facebook",
  instagram: "Instagram", tiktok: "TikTok", pinterest: "Pinterest",
  reddit: "Reddit", linkedin: "LinkedIn", twitch: "Twitch",
  bilibili: "BiliBili", threads: "Threads", tumblr: "Tumblr",
  bandcamp: "Bandcamp", mixcloud: "Mixcloud", rumble: "Rumble",
  snapchat: "Snapchat", telegram: "Telegram", spotify: "Spotify",
  bluesky: "Bluesky", imgur: "Imgur", odysee: "Odysee", kick: "Kick",
};

const sites = [...byLower.entries()]
  .map(([key, name]) => {
    if (BRANDS[key]) return BRANDS[key];
    if (name === name.toLowerCase() && !name.includes(".") && /^[a-z]/.test(name)) {
      return name[0].toUpperCase() + name.slice(1);
    }
    return name;
  })
  .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

const NEWLINE = String.fromCharCode(10);
const body = [
  "// Generated by scripts/supported-sites.mjs. Do not edit by hand.",
  `export const GENERATED = ${JSON.stringify(new Date().toISOString().slice(0, 10))};`,
  `export const YTDLP_VERSION = ${JSON.stringify(version)};`,
  "export const SITES: string[] = [",
  sites.map((s) => `  ${JSON.stringify(s)},`).join(NEWLINE),
  "];",
  "",
].join(NEWLINE);
fs.writeFileSync(out, body);

console.log(`yt-dlp ${version}`);
console.log(`extractors listed      ${lines.length}`);
console.log(`working                ${working.length}`);
console.log(`distinct families      ${families.length}`);
console.log(`after merging subparts ${merged.length}`);
console.log(`after dropping adult    ${clean.length}`);
console.log(`published              ${sites.length}`);
console.log(`written to             ${path.relative(root, out)}`);
