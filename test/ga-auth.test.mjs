// The three accepted forms of GOOGLE_SERVICE_ACCOUNT_JSON. The path form is
// what the admin panel instructs, and it used to fail silently.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ga-"));
const key = { client_email: "svc@x.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nX\n-----END PRIVATE KEY-----\n" };
const keyPath = path.join(dir, "ga-key.json");
fs.writeFileSync(keyPath, JSON.stringify(key));

async function load(value) {
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = value;
  const mod = await import("../src/lib/google-auth.ts?" + Math.random());
  return { ok: mod.googleConfigured(), why: mod.serviceAccountError() };
}

test("a file path is accepted (what the admin panel tells you to use)", async () => {
  const r = await load(keyPath);
  assert.equal(r.ok, true, r.why);
});

test("raw JSON is accepted", async () => {
  const r = await load(JSON.stringify(key));
  assert.equal(r.ok, true, r.why);
});

test("base64 JSON is accepted", async () => {
  const r = await load(Buffer.from(JSON.stringify(key)).toString("base64"));
  assert.equal(r.ok, true, r.why);
});

test("a missing file explains itself rather than saying 'not configured'", async () => {
  const r = await load(path.join(dir, "nope.json"));
  assert.equal(r.ok, false);
  assert.match(r.why, /could not read/i);
});

test("an OAuth client secret is named as the wrong file", async () => {
  const wrong = path.join(dir, "wrong.json");
  fs.writeFileSync(wrong, JSON.stringify({ installed: { client_id: "x" } }));
  const r = await load(wrong);
  assert.equal(r.ok, false);
  assert.match(r.why, /client_email/i);
});
