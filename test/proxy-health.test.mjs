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

const {
  noteProxyRefused,
  proxyRefusedFlagPath,
  rotateProxyNow,
  proxyGeneration,
  onProxySwapped,
  rotateScriptPath,
} = await import("../src/lib/proxy-health.ts");

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

// --- swapping while a visitor waits ---------------------------------------

test("only a WARP proxy on this machine can be swapped from the site", () => {
  const saved = process.env.YTDLP_PROXY;
  process.env.YTDLP_PROXY = "http://127.0.0.1:8081"; // the home relay
  assert.equal(rotateScriptPath(), null);
  process.env.YTDLP_PROXY = "socks5h://proxy.example.net:1080"; // someone else's
  assert.equal(rotateScriptPath(), null);
  process.env.YTDLP_PROXY = saved;
});

test("visitors refused at the same moment share one swap", async () => {
  let runs = 0;
  let finish;
  const runner = () => {
    runs++;
    return new Promise((resolve) => (finish = resolve));
  };
  const first = rotateProxyNow(runner);
  const second = rotateProxyNow(runner);
  finish(true);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(runs, 1);
});

test("a swap moves the generation on and tells the cache", async () => {
  let told = 0;
  onProxySwapped(() => told++);
  const before = proxyGeneration();
  assert.equal(await rotateProxyNow(() => Promise.resolve(true)), true);
  assert.equal(proxyGeneration(), before + 1);
  assert.equal(told, 1);
});

test("a listener that throws does not break the swap", async () => {
  onProxySwapped(() => {
    throw new Error("listener fault");
  });
  assert.equal(await rotateProxyNow(() => Promise.resolve(true)), true);
});

test("after a failed swap, visitors are not made to wait for another for five minutes", async () => {
  let runs = 0;
  const failing = () => {
    runs++;
    return Promise.resolve(false);
  };
  const before = proxyGeneration();
  assert.equal(await rotateProxyNow(failing), false);
  assert.equal(proxyGeneration(), before, "a failed swap is not a new address");
  assert.equal(await rotateProxyNow(failing), false);
  assert.equal(await rotateProxyNow(failing, Date.now() + 4 * 60_000), false);
  assert.equal(runs, 1, "no second swap inside the five minutes");
  assert.equal(await rotateProxyNow(failing, Date.now() + 6 * 60_000), false);
  assert.equal(runs, 2, "tried again once they were up");
});

test("a runner that throws counts as a failed swap, not a crash", async () => {
  const later = Date.now() + 60 * 60_000;
  assert.equal(await rotateProxyNow(() => Promise.reject(new Error("spawn failed")), later), false);
});
