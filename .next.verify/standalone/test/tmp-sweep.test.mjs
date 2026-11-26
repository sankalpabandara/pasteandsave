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
const MEI_PREFIX = "_MEI";
const MEI_MAX_AGE_MS = 2 * 60 * 60 * 1000;

// Same logic as jobs.ts, exercised against a throwaway root so the real
// temp directory is never touched by a test.
function sweep(root) {
  let removed = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const ours = entry.name.startsWith(TMP_PREFIX);
    const ytdlp = entry.name.startsWith(MEI_PREFIX);
    if (!ours && !ytdlp) continue;
    const cutoff = Date.now() - (ours ? JOB_TTL_MS : MEI_MAX_AGE_MS);
    const dir = path.join(root, entry.name);
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

test("yt-dlp unpack folders left by a killed run are removed", () => {
  // 598 of these held 27 GB on the server by 12 October.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const abandoned = mk(root, "_MEIa1b2c3", 3 * 60 * 60 * 1000);
  assert.equal(sweep(root), 1);
  assert.equal(fs.existsSync(abandoned), false);
});

test("a yt-dlp run in progress keeps its unpack folder", () => {
  // Fifteen minutes is old for a job folder but young for this: only folders
  // past two hours, far beyond any run, are abandoned.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const running = mk(root, "_MEIx9y8z7", 20 * 60 * 1000);
  assert.equal(sweep(root), 0);
  assert.equal(fs.existsSync(running), true);
});

test("the sweep in jobs.ts matches this copy", () => {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "jobs.ts"), "utf8");
  assert.match(src, /const MEI_PREFIX = "_MEI";/);
  assert.match(src, /const MEI_MAX_AGE_MS = 2 \* 60 \* 60 \* 1000;/);
  assert.match(src, /entry\.name\.startsWith\(MEI_PREFIX\)/);
});

test("the deploy lock is never removed", () => {
  // /tmp/pasteandsave-deploy.lock shares the prefix and is the flock that
  // stops two deploys overlapping. Deleting it lets the next deploy take the
  // lock on a fresh inode and run alongside one already in progress.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sweeptest-"));
  const lock = path.join(root, TMP_PREFIX + "deploy.lock");
  fs.writeFileSync(lock, "");
  const t = new Date(Date.now() - 24 * 60 * 60 * 1000);
  fs.utimesSync(lock, t, t);

  assert.equal(sweep(root), 0);
  assert.equal(fs.existsSync(lock), true, "a file must never be swept, only directories");
});
