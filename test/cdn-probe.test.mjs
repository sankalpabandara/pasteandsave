// Choosing which link to probe before deciding proxy or direct.
//
// Getting this wrong is expensive in one direction and broken in the other: a
// wrong "direct" leaves the visitor with a failed download, a wrong "proxy"
// spends metered bandwidth on bytes that did not need it. The rule is that
// anything uncertain means proxy.
//
// Run: node --test test/cdn-probe.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickProbeUrl } from "../src/lib/cdn-probe.ts";

const https = (n) => `https://rr1---cdn.googlevideo.com/videoplayback?itag=${n}`;

test("the chosen video format is what gets probed", () => {
  const info = {
    formats: [
      { format_id: "18", url: https(18), protocol: "https" },
      { format_id: "137", url: https(137), protocol: "https" },
    ],
  };
  assert.equal(pickProbeUrl(info, "137"), https(137));
});

test("a format the list does not contain means proxy", () => {
  const info = { formats: [{ format_id: "18", url: https(18), protocol: "https" }] };
  assert.equal(pickProbeUrl(info, "999"), null);
});

test("manifest formats are never probed", () => {
  // A manifest is a list of further requests, each signed separately, so the
  // manifest answering says nothing about whether the segments will.
  for (const protocol of ["m3u8_native", "m3u8", "http_dash_segments", "dash"]) {
    const info = { formats: [{ format_id: "hls", url: https(1), protocol }] };
    assert.equal(pickProbeUrl(info, "hls"), null, protocol);
  }
});

test("a format with no url means proxy", () => {
  const info = { formats: [{ format_id: "137", protocol: "https" }] };
  assert.equal(pickProbeUrl(info, "137"), null);
});

test("audio mode picks the highest bitrate direct stream", () => {
  const info = {
    formats: [
      { format_id: "139", url: https(139), acodec: "mp4a", abr: 48 },
      { format_id: "251", url: https(251), acodec: "opus", abr: 160 },
      { format_id: "137", url: https(137), acodec: "none", vcodec: "avc1" },
    ],
  };
  assert.equal(pickProbeUrl(info, null), https(251));
});

test("audio mode ignores video-only streams", () => {
  const info = {
    formats: [{ format_id: "137", url: https(137), acodec: "none", vcodec: "avc1" }],
  };
  assert.equal(pickProbeUrl(info, null), null);
});

test("a bare progressive url is usable when there is no format list", () => {
  assert.equal(pickProbeUrl({ url: "https://cdn.example/v.mp4" }, null), "https://cdn.example/v.mp4");
});

test("malformed json cannot throw", () => {
  assert.equal(pickProbeUrl({}, "137"), null);
  assert.equal(pickProbeUrl({ formats: null }, "137"), null);
  assert.equal(pickProbeUrl({ formats: [] }, null), null);
});

test("a non-http scheme is refused", () => {
  const info = { formats: [{ format_id: "x", url: "file:///etc/passwd", protocol: "https" }] };
  assert.equal(pickProbeUrl(info, "x"), null);
});
