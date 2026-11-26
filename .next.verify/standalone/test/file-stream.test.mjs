// The finished file sent to the visitor. Readable.toWeb went on writing after a
// visitor cancelled part way, and threw "Controller is already closed" where
// nothing caught it.
//
// Run: node --test test/file-stream.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileStream } from "../src/lib/file-stream.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pas-file-"));
const file = path.join(dir, "video.mp4");
const bytes = crypto.randomBytes(3 * 1024 * 1024 + 123);
fs.writeFileSync(file, bytes);

test("the whole file arrives, byte for byte", async () => {
  const reader = fileStream(fs.createReadStream(file)).getReader();
  const parts = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
  }
  assert.ok(Buffer.concat(parts).equals(bytes));
});

test("a visitor cancelling part way stops the read and throws nothing", async () => {
  const uncaught = [];
  const onUncaught = (e) => uncaught.push(e);
  process.on("uncaughtException", onUncaught);
  try {
    const node = fs.createReadStream(file, { highWaterMark: 16 * 1024 });
    const closed = new Promise((resolve) => node.on("close", resolve));
    const reader = fileStream(node).getReader();
    await reader.read();
    await reader.cancel();
    await closed;
    // Give any late write from the file a chance to land on the closed stream.
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(node.destroyed, true, "the file is no longer being read");
    assert.deepEqual(uncaught, []);
  } finally {
    process.off("uncaughtException", onUncaught);
  }
});

test("a file that cannot be read errors the stream instead of hanging", async () => {
  const reader = fileStream(fs.createReadStream(path.join(dir, "missing.mp4"))).getReader();
  await assert.rejects(reader.read());
});
