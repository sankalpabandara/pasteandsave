// Admin sign-in: the password check, the session cookie, and logging out.
//
// Run: node --test test/admin-auth.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-auth-"));
process.env.ADMIN_SESSION_SECRET = "a-test-secret-that-is-long-enough";
process.env.ADMIN_PASSWORD = "correct horse battery staple";
process.env.ADMIN_REVOKED_FILE = path.join(dir, "admin-revoked.json");

const auth = await import("../src/lib/auth.ts");

test("the right password is accepted and others are not", () => {
  assert.equal(auth.checkPassword("correct horse battery staple"), true);
  assert.equal(auth.checkPassword("correct horse battery stapl"), false);
  assert.equal(auth.checkPassword(""), false);
  // A different length is just a wrong answer, with no early way out.
  assert.equal(auth.checkPassword("x".repeat(500)), false);
});

test("safeEqual compares values of any length", () => {
  assert.equal(auth.safeEqual("Bearer abc", "Bearer abc"), true);
  assert.equal(auth.safeEqual("Bearer ab", "Bearer abc"), false);
  assert.equal(auth.safeEqual("", "Bearer abc"), false);
});

test("a session the server signed is accepted, a tampered one is not", () => {
  const token = auth.createSession();
  assert.equal(auth.verifySession(token), true);
  const [payload, sig] = token.split(".");
  assert.equal(auth.verifySession(`${Number(payload) + 1000}.${sig}`), false);
  assert.equal(auth.verifySession(`${payload}.${"0".repeat(sig.length)}`), false);
  assert.equal(auth.verifySession(undefined), false);
});

test("logging out ends sessions issued before it, including copies", () => {
  const before = auth.createSession();
  auth.revokeSessions(Date.now() + 1);
  assert.equal(auth.verifySession(before), false, "an old cookie is refused");
});

test("signing in again after a logout works", async () => {
  await new Promise((r) => setTimeout(r, 5));
  const after = auth.createSession();
  assert.equal(auth.verifySession(after), true);
});

test("the logout survives a restart", () => {
  const saved = JSON.parse(fs.readFileSync(process.env.ADMIN_REVOKED_FILE, "utf8"));
  assert.ok(Number(saved.before) > 0);
});
