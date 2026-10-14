// The guard that keeps visitor links away from this server's own network.
//
// Each blocked case below is a way of writing a local address that the old
// text-prefix checks let through (reproduced in the security audit), or a
// range they never covered. The allowed cases are ordinary sites, which must
// keep working.
//
// Run: node --test test/ip-guard.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { isSafeUrl, isPrivateHost, parseIPv6 } from "../src/lib/ip-guard.ts";

const blocked = [
  // The ones that used to get through.
  "http://[::127.0.0.1]/",
  "http://[::ffff:0:127.0.0.1]/",
  "http://[64:ff9b::127.0.0.1]/",
  "http://[64:ff9b::a9fe:a9fe]/", // NAT64 to 169.254.169.254, cloud metadata
  "http://[fe90::1]/",
  "http://[feb0::1]/",
  // Long-standing cases that must stay blocked.
  "http://[::1]:4100/",
  "http://[::]/",
  "http://[::ffff:127.0.0.1]:40000/",
  "http://[::ffff:7f00:1]/",
  "http://[fe80::1]/",
  "http://[fd00::1]/",
  "http://[fec0::1]/",
  "http://[ff02::1]/",
  "http://[2002:7f00:1::]/", // 6to4 wrapping 127.0.0.1
  "http://[2001::1]/", // Teredo
  "http://127.0.0.1:8081/",
  "http://2130706433/", // 127.0.0.1 as one number
  "http://0x7f.1/",
  "http://169.254.169.254/latest/meta-data/",
  "http://10.0.0.5/",
  "http://192.168.1.1/",
  "http://100.64.0.1/",
  "http://224.0.0.1/",
  "http://localhost:4100/",
  "http://localhost./", // trailing dot is the same host
  "http://app.localhost/",
  "http://user:pass@www.youtube.com/watch?v=x",
  "file:///etc/passwd",
  "ftp://example.com/",
  "not a url",
];

const allowed = [
  "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  "https://youtu.be/jNQXAC9IVRw",
  "https://www.tiktok.com/@scout2015/video/6718335390845095173",
  "https://www.instagram.com/reel/abc/",
  "https://x.com/user/status/1",
  "http://93.184.216.34/", // a public IPv4 address
  "https://[2606:4700:4700::1111]/", // a public IPv6 address
  "http://[::ffff:8.8.8.8]/", // mapped public address
];

for (const url of blocked) {
  test(`refused: ${url}`, () => assert.equal(isSafeUrl(url), false));
}
for (const url of allowed) {
  test(`allowed: ${url}`, () => assert.equal(isSafeUrl(url), true));
}

test("IPv6 is read as numbers, however it is written", () => {
  assert.deepEqual(parseIPv6("::1"), [0, 0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(parseIPv6("::ffff:127.0.0.1"), [0, 0, 0, 0, 0, 0xffff, 0x7f00, 1]);
  assert.deepEqual(parseIPv6("2001:db8::"), [0x2001, 0xdb8, 0, 0, 0, 0, 0, 0]);
  assert.equal(parseIPv6("1::2::3"), null);
  assert.equal(parseIPv6("12345::1"), null);
});

test("an IPv6 literal that cannot be read is refused, not waved through", () => {
  assert.equal(isPrivateHost("[1::2::3]"), true);
});
