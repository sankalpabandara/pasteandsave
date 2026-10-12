// The note that tells ops/warp-rotate.sh YouTube has started refusing WARP.
//
// Run: node --test test/proxy-health.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-health-"));
const flag = path.join(dir, "data", "proxy-refused");
process.env.PROXY_REFUSED_FLAG = flag;

const { noteProxyRefused, proxyRefusedFlagPath } = await import("../src/lib/proxy-health.ts");

test("the note goes where the watchdog looks for it", () => {
  assert.equal(proxyRefusedFlagPath(), flag);
});

test("a refusal leaves a note naming the time and the site", () => {
  const t = Date.parse("2026-10-12T15:30:00Z");
  noteProxyRefused("www.youtube.com", t);
  assert.equal(fs.readFileSync(flag, "utf8"), "2026-10-12T15:30:00.000Z www.youtube.com\n");
});

test("a burst of refusals is one write, not one per lookup", () => {
  const t = Date.parse("2026-10-12T15:30:30Z");
  noteProxyRefused("youtu.be", t);
  assert.match(fs.readFileSync(flag, "utf8"), /15:30:00\.000Z www\.youtube\.com/);
});

test("a refusal after the watchdog cleared the note writes it again", () => {
  fs.rmSync(flag);
  const t = Date.parse("2026-10-12T15:32:00Z");
  noteProxyRefused("youtu.be", t);
  assert.equal(fs.readFileSync(flag, "utf8"), "2026-10-12T15:32:00.000Z youtu.be\n");
});

test("an unwritable location never throws into a lookup", () => {
  process.env.PROXY_REFUSED_FLAG = path.join(dir, "data", "proxy-refused", "cannot", "nest");
  assert.doesNotThrow(() => noteProxyRefused("youtu.be", Date.parse("2026-10-12T15:40:00Z")));
  process.env.PROXY_REFUSED_FLAG = flag;
});
