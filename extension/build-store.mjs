// Packages the extension for the web stores, into store/ at the repository
// root (not committed):
//
//   pasteandsave-chrome-store-<version>.zip   for the Chrome Web Store
//   pasteandsave-firefox-<version>.zip        for addons.mozilla.org
//
// The Chrome copy leaves YouTube alone completely, because the Chrome Web
// Store does not accept extensions that save YouTube videos: OFF_LIMITS in
// background.js lists YouTube's sites, and the in-page script is not loaded
// there at all. The Firefox copy is the same extension as the one on
// pasteandsave.com, with its own manifest in place of the Chrome one.
//
//   node extension/build-store.mjs

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { extensionFiles, repoRoot, writePackage } from "./zip.mjs";

export const CHROME_OFF_LIMITS = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "googlevideo.com",
  "ytimg.com",
];

const OFF_LIMITS_LINE = "const OFF_LIMITS = [];";

/** background.js with YouTube's sites switched off for good. */
export function chromeStoreBackground(source) {
  const count = source.split(OFF_LIMITS_LINE).length - 1;
  if (count !== 1) throw new Error(`expected one "${OFF_LIMITS_LINE}" in background.js, found ${count}`);
  return source.replace(OFF_LIMITS_LINE, `const OFF_LIMITS = ${JSON.stringify(CHROME_OFF_LIMITS)};`);
}

/** The Chrome manifest with the in-page script kept off YouTube's pages. */
export function chromeStoreManifest(manifest) {
  const out = structuredClone(manifest);
  const exclude = CHROME_OFF_LIMITS.filter((h) => !/googlevideo|ytimg/.test(h)).map((h) => `*://*.${h}/*`);
  out.content_scripts = out.content_scripts.map((cs) => ({ ...cs, exclude_matches: exclude }));
  return out;
}

function json(obj) {
  return Buffer.from(JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function main() {
  const files = extensionFiles();
  const text = (name) => files.find((f) => f.name === name).data.toString("utf8");
  const chromeManifest = JSON.parse(text("manifest.json"));
  const firefoxManifest = JSON.parse(text("manifest-firefox.json"));
  if (chromeManifest.version !== firefoxManifest.version) {
    throw new Error(`manifest versions differ: ${chromeManifest.version} and ${firefoxManifest.version}`);
  }
  const version = chromeManifest.version;
  const outDir = path.join(repoRoot, "store");
  // Each store wants its own manifest at the top, and nothing for the other.
  const shared = files.filter((f) => !f.name.startsWith("manifest") && f.name !== "README.md");

  const chrome = [
    ...shared.map((f) =>
      f.name === "background.js" ? { name: f.name, data: Buffer.from(chromeStoreBackground(f.data.toString("utf8"))) } : f,
    ),
    { name: "manifest.json", data: json(chromeStoreManifest(chromeManifest)) },
  ].sort((a, b) => a.name.localeCompare(b.name));
  writePackage(chrome, path.join(outDir, `pasteandsave-chrome-store-${version}.zip`));

  const firefox = [...shared, { name: "manifest.json", data: json(firefoxManifest) }].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  writePackage(firefox, path.join(outDir, `pasteandsave-firefox-${version}.zip`));
  fs.writeFileSync(path.join(outDir, "README.txt"), "Built by extension/build-store.mjs. Upload these to the stores; do not commit.\n");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
