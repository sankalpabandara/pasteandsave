#!/usr/bin/env node
// Point the site's Adsterra ads at a new set of codes.
//
//   node ops/set-adsterra.mjs 728x90=<script url> 300x250=<url> 320x50=<url>
//   node ops/set-adsterra.mjs socialbar=<script url> native=<script url>
//
// The Social Bar and the Native Banner can also be pasted into the admin panel,
// which needs no restart. Since 2026-11-25 the content policy also picks up
// the host of every saved code by itself, so the env update below is a belt
// to go with those braces.
//
// Adsterra reissues these codes on a different domain when anti-adblock is
// turned on, and moves the serving domain on its own from time to time. Two
// things have to change together when that happens: the keys in
// data/site-settings.json, and AD_NETWORK_DOMAINS in .env.local, which is
// what the page's content policy is built from. Changing only the first
// leaves every banner blocked by the browser and the slots looking exactly
// like a network that is not filling, which is a slow thing to notice and a
// confusing thing to debug. So this does both, in that order, or neither.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.SITE_ROOT || "/opt/pasteandsave";
const SETTINGS = path.join(ROOT, "data", "site-settings.json");
const ENV = path.join(ROOT, ".env.local");
const SIZES = ["728x90", "300x250", "320x50"];
// Formats stored as a plain script address rather than a banner unit.
const FORMATS = { socialbar: "socialBar", native: "native" };

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    "usage: node ops/set-adsterra.mjs [728x90=<url>] [300x250=<url>] [320x50=<url>] [socialbar=<url>] [native=<url>]",
  );
  process.exit(1);
}

const wanted = {};
for (const arg of args) {
  const at = arg.indexOf("=");
  const size = arg.slice(0, at);
  let src = arg.slice(at + 1);
  if (src.startsWith("//")) src = `https:${src}`;
  if (!SIZES.includes(size) && !(size in FORMATS)) {
    console.error(`unknown name ${size}; expected one of ${[...SIZES, ...Object.keys(FORMATS)].join(", ")}`);
    process.exit(1);
  }
  let url;
  try {
    url = new URL(src);
  } catch {
    console.error(`${size}: not a URL: ${src}`);
    process.exit(1);
  }
  if (url.protocol !== "https:") {
    console.error(`${size}: must be https`);
    process.exit(1);
  }
  // The key is the same value the embed assigns to atOptions.key. Anti adblock
  // codes end in it (https://host/22/<key>); plain codes put it before
  // invoke.js (https://host/<key>/invoke.js). So take the last hex segment.
  const key =
    url.pathname
      .split("/")
      .filter((part) => /^[a-f0-9]{16,64}$/i.test(part))
      .pop() ?? "";
  // A Social Bar address need not carry a key the site uses; a banner and the
  // Native Banner (whose container div is named after it) do.
  if (size !== "socialbar" && !/^[a-f0-9]{16,64}$/i.test(key)) {
    console.error(`${size}: no key found in ${src}`);
    process.exit(1);
  }
  wanted[size] = { key, src: url.href, host: url.hostname };
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(SETTINGS, `${SETTINGS}.bak-${stamp}`);
fs.copyFileSync(ENV, `${ENV}.bak-${stamp}`);

// The policy first: a key whose host the browser refuses is worse than the
// old key, because the old one at least still renders.
const envText = fs.readFileSync(ENV, "utf8");
const line = envText.split(/\r?\n/).find((l) => l.startsWith("AD_NETWORK_DOMAINS="));
const current = line ? line.replace(/^AD_NETWORK_DOMAINS=/, "").replace(/^"|"$/g, "") : "";
const entries = new Set(current.split(/\s+/).filter(Boolean));
let added = 0;
for (const { host } of Object.values(wanted)) {
  for (const entry of [`https://${host}`, `https://*.${host}`]) {
    if (!entries.has(entry)) {
      entries.add(entry);
      added++;
    }
  }
}
const rebuilt = `AD_NETWORK_DOMAINS="${[...entries].join(" ")}"`;
const nextEnv = line
  ? envText.replace(line, rebuilt)
  : `${envText.replace(/\s*$/, "")}\n${rebuilt}\n`;
fs.writeFileSync(ENV, nextEnv);

const settings = JSON.parse(fs.readFileSync(SETTINGS, "utf8"));
settings.adsterra = settings.adsterra ?? {};
for (const [size, { key, src }] of Object.entries(wanted)) {
  if (size in FORMATS) settings[FORMATS[size]] = src;
  else settings.adsterra[size] = { key, src };
}
fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));

for (const [size, { host }] of Object.entries(wanted)) {
  console.log(`${size} -> ${host}`);
}
console.log(`${added} host entr${added === 1 ? "y" : "ies"} added to AD_NETWORK_DOMAINS`);
console.log(`backups: ${path.basename(SETTINGS)}.bak-${stamp}, ${path.basename(ENV)}.bak-${stamp}`);
console.log("now run: pm2 restart pasteandsave --update-env");
