// The extension a visitor downloads has to be the extension in this folder.
//
// public/pasteandsave-extension.zip is built by hand with
// `node extension/build-zip.mjs` and committed. Nothing rebuilds it on deploy,
// so a change to the extension that skips that step ships to nobody: the source
// said 2.1.0 for a month while the site handed out 2.0.2, without the Facebook
// share-link fix that release existed for. This fails until the zip is rebuilt.
//
// Run: node --test test/extension-package.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const extDir = path.join(root, "extension");
const zipPath = path.join(root, "public", "pasteandsave-extension.zip");

// Just enough of the ZIP format to read entries back: the central directory at
// the end lists every file, and each entry's local header says where its data
// starts.
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.notEqual(eocd, -1, "the zip has no end of directory record");
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + compressedSize);
    entries.set(name, method === 8 ? zlib.inflateRawSync(raw) : Buffer.from(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

// The same selection build-zip.mjs packages: everything except the test
// harness and the build script itself.
function sourceFiles(dir, prefix = "") {
  const out = new Map();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name === "test") continue;
      for (const [k, v] of sourceFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)) {
        out.set(k, v);
      }
    } else if (entry.name !== "build-zip.mjs") {
      out.set(`${prefix}${entry.name}`, fs.readFileSync(path.join(dir, entry.name)));
    }
  }
  return out;
}

// Git checks text out with CRLF on Windows and LF on the server, so line
// endings alone are not a difference worth failing over.
function normalise(name, buf) {
  return /\.png$/i.test(name) ? buf : Buffer.from(buf.toString("utf8").replace(/\r\n/g, "\n"));
}

const zipped = readZip(fs.readFileSync(zipPath));
const source = sourceFiles(extDir);

test("the published zip holds exactly the extension's files", () => {
  assert.deepEqual([...zipped.keys()].sort(), [...source.keys()].sort());
});

test("every file in the published zip matches the source", () => {
  const stale = [...source.keys()].filter((name) => {
    const inZip = zipped.get(name);
    return !inZip || !normalise(name, inZip).equals(normalise(name, source.get(name)));
  });
  assert.deepEqual(stale, [], `out of date in the zip: ${stale.join(", ")}. Run node extension/build-zip.mjs`);
});

test("the Chrome and Firefox manifests carry the same version", () => {
  // Both ship in the same zip, so a release bumps both or the Firefox
  // install reports a version that does not exist.
  const chrome = JSON.parse(source.get("manifest.json").toString("utf8"));
  const firefox = JSON.parse(source.get("manifest-firefox.json").toString("utf8"));
  assert.equal(firefox.version, chrome.version);
});
