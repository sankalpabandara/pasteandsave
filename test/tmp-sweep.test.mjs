// The orphaned-folder sweep.
//
// Job folders are deleted when a job finishes, but that relies on a map held
// in memory. A restart loses the map and leaves the folders, each holding a
// part-downloaded video. On a server that redeploys often they only pile up.
//
// Run: node --test test/tmp-sweep.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TMP_PREFIX = "pasteandsave-";
const JOB_TTL_MS = 15 * 60 * 1000;

// Same logic as jobs.ts, exercised against a throwaway root so the real
// temp directory is never touched by a test.
function sweep(root) {
  const cutoff = Date.now() - JOB_TTL_MS;
  let removed = 0;
  for (const name of fs.readdirSync(root)) {
    if (!name.startsWith(TMP_PREFIX)) continue;
    const dir = path.join(root, name);
    try {
      if (fs.statSync(dir).mtimeMs > cutoff) continue;
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch {}
  }
  return removed;
}

function mk(root, name, ageMs) {
  const d = path.join(root, name);
  fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, "file.mp4"), "x".repeat(1024));
  const t = new Date(Date.now() - ageMs);
  fs.utimesSync(d, t, t);
  return d;
}

test("an old job folder is removed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const old = mk(root, TMP_PREFIX + "old", 60 * 60 * 1000);
  assert.equal(sweep(root), 1);
  assert.equal(fs.existsSync(old), false);
});

test("a running download is left alone", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const fresh = mk(root, TMP_PREFIX + "fresh", 1000);
  assert.equal(sweep(root), 0);
  assert.equal(fs.existsSync(fresh), true, "a folder younger than the TTL must survive");
});

test("other programs' folders are never touched", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const other = mk(root, "systemd-private-abc", 60 * 60 * 1000);
  const npm = mk(root, "npm-12345", 60 * 60 * 1000);
  assert.equal(sweep(root), 0);
  assert.equal(fs.existsSync(other), true);
  assert.equal(fs.existsSync(npm), true);
});
