// Choosing a WARP exit for each YouTube request.
//
// Run: node --test test/proxy-pool.test.mjs

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "proxy-pool-"));
process.env.WARP_POOL_FILE = path.join(dir, "warp-pool.json");
process.env.WARP_POOL_SUSPECT_DIR = path.join(dir, "suspect");

const pool = await import("../src/lib/proxy-pool.ts");

const A = "socks5h://127.0.0.1:40000";
const B = "socks5h://127.0.0.1:40001";
const C = "socks5h://127.0.0.1:40002";

function writePool(members, updatedAt = Math.floor(Date.now() / 1000)) {
  fs.writeFileSync(process.env.WARP_POOL_FILE, JSON.stringify({ updatedAt, members }));
  pool.resetPoolMemory();
}

beforeEach(() => {
  writePool([
    { name: "host", proxy: A, healthy: true },
    { name: "ps-warp-1", proxy: B, healthy: false },
    { name: "ps-warp-2", proxy: C, healthy: true },
  ]);
});

test("only exits that passed their last test are used", () => {
  assert.deepEqual(pool.healthyExits().sort(), [A, C]);
  for (let i = 0; i < 6; i++) assert.notEqual(pool.pickExit(), B);
});

test("requests take healthy exits in turn", () => {
  const seen = new Set([pool.pickExit(), pool.pickExit()]);
  assert.deepEqual([...seen].sort(), [A, C]);
});

test("an exit already tried for this request is skipped", () => {
  assert.equal(pool.pickExit([A]), C);
  assert.equal(pool.pickExit([A, C]), undefined);
});

test("an exit refused here is left out at once and reported to the manager", () => {
  pool.markExitBad(C);
  assert.deepEqual(pool.healthyExits(), [A]);
  assert.ok(fs.existsSync(path.join(process.env.WARP_POOL_SUSPECT_DIR, "ps-warp-2")));
});

test("a refused exit comes back after a while, once the manager has had time to fix it", () => {
  const t = Date.now();
  pool.markExitBad(A, t);
  assert.deepEqual(pool.healthyExits(t + 1000), [C]);
  assert.deepEqual(pool.healthyExits(t + 11 * 60 * 1000).sort(), [A, C]);
});

test("a site turning an exit away puts it last for that site only", () => {
  // Instagram refusing an exit says nothing about YouTube or Facebook.
  pool.markExitBadFor("www.instagram.com", C);
  for (let i = 0; i < 4; i++) assert.equal(pool.pickExit([], undefined, "instagram.com"), A);
  const forOthers = new Set([0, 1, 2, 3].map(() => pool.pickExit([], undefined, "www.facebook.com")));
  assert.deepEqual([...forOthers].sort(), [A, C]);
  // Not a ban: with nothing else left it is still offered.
  assert.equal(pool.pickExit([A], undefined, "instagram.com"), C);
  // And the manager is not told, since it tests against YouTube.
  assert.equal(fs.existsSync(path.join(process.env.WARP_POOL_SUSPECT_DIR, "ps-warp-2-site")), false);
});

test("a site's mark wears off", () => {
  const t = Date.now();
  pool.markExitBadFor("instagram.com", C, t);
  const later = new Set([0, 1, 2, 3].map(() => pool.pickExit([], t + 11 * 60 * 1000, "instagram.com")));
  assert.deepEqual([...later].sort(), [A, C]);
});

test("a retry goes to a different IPv6 block when there is one", () => {
  // Measured: two of five exits shared one /48, which a site judging by block
  // sees as the same visitor.
  const D = "socks5h://127.0.0.1:40003";
  writePool([
    { name: "host", proxy: A, healthy: true, exit: "2a09:bac5:33e2:1c82::2d7:3b" },
    { name: "ps-warp-1", proxy: B, healthy: true, exit: "2a09:bac5:33e2:1c82::2d7:89" },
    { name: "ps-warp-2", proxy: C, healthy: true, exit: "2a09:bac5:33e1:1282::1d8:221" },
    { name: "ps-warp-3", proxy: D, healthy: true, exit: "2a09:bac5:33e7:18fa::27d:125" },
  ]);
  for (let i = 0; i < 6; i++) {
    assert.notEqual(pool.pickExit([A], undefined, "youtube.com"), B, "B is in A's block");
  }
  // Once the other blocks are tried too, the shared one is still used.
  assert.equal(pool.pickExit([A, C, D], undefined, "youtube.com"), B);
});

test("the block is the first three groups of an IPv6 address", () => {
  assert.equal(pool.blockOf("2a09:bac5:33e2:1c82::2d7:3b"), "2a09:bac5:33e2");
  assert.equal(pool.blockOf("104.28.196.54"), "104.28.196.54");
  assert.equal(pool.blockOf(undefined), "");
});

test("a pool file the manager stopped updating is not trusted", () => {
  // Falls back to the single configured proxy rather than to a stale list.
  writePool([{ name: "host", proxy: A, healthy: true }], Math.floor(Date.now() / 1000) - 3600);
  assert.equal(pool.poolActive(), false);
  assert.equal(pool.pickExit(), undefined);
});

test("no pool file means no pool", () => {
  fs.rmSync(process.env.WARP_POOL_FILE);
  pool.resetPoolMemory();
  assert.equal(pool.poolActive(), false);
});

test("entries that are not local SOCKS proxies are ignored", () => {
  writePool([
    { name: "x", proxy: "http://evil.example:8080", healthy: true },
    { name: "y", proxy: "socks5h://10.0.0.5:40000", healthy: true },
    { name: "host", proxy: A, healthy: true },
  ]);
  assert.deepEqual(pool.healthyExits(), [A]);
});

test("a half-written file does not break anything", () => {
  fs.writeFileSync(process.env.WARP_POOL_FILE, '{"updatedAt":');
  pool.resetPoolMemory();
  assert.equal(pool.pickExit(), undefined);
});
