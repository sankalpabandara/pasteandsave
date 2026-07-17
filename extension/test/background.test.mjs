// Test harness for background.js. Mocks the browser extension API, loads the
// real worker file, then feeds it synthetic network events and asserts on
// what the popup would see. Run with: node test/background.test.mjs

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- mock extension API ----------------------------------------------------
const listeners = { webRequest: null, tabUpdated: null, tabRemoved: null, message: null, command: null, menuClicked: null };
const badge = {};
const sessionStore = {};
const syncStore = {};
const downloads = [];
const createdTabs = [];

// API_STYLE=firefox exercises the `browser` global that Firefox provides.
const mockApi = {
  webRequest: {
    onResponseStarted: { addListener: (fn) => (listeners.webRequest = fn) },
  },
  tabs: {
    onUpdated: { addListener: (fn) => (listeners.tabUpdated = fn) },
    onRemoved: { addListener: (fn) => (listeners.tabRemoved = fn) },
    create: (opts) => createdTabs.push(opts.url),
    query: (_q, cb) => cb([{ id: 1, url: "https://example.com/watch" }]),
  },
  action: {
    setBadgeText: ({ tabId, text }) => (badge[tabId] = text),
    setBadgeBackgroundColor: () => {},
  },
  storage: {
    session: {
      set: async (obj) => Object.assign(sessionStore, obj),
      get: async (key) => ({ [key]: sessionStore[key] }),
      remove: async (key) => delete sessionStore[key],
    },
    sync: {
      get: (defaults, cb) => cb({ ...defaults, ...syncStore }),
      set: (obj) => Object.assign(syncStore, obj),
    },
  },
  contextMenus: {
    removeAll: (cb) => cb && cb(),
    create: () => {},
    onClicked: { addListener: (fn) => (listeners.menuClicked = fn) },
  },
  runtime: {
    onInstalled: { addListener: (fn) => fn() },
    onStartup: { addListener: () => {} },
    onMessage: { addListener: (fn) => (listeners.message = fn) },
    lastError: null,
  },
  commands: { onCommand: { addListener: (fn) => (listeners.command = fn) } },
  downloads: {
    download: (opts, cb) => {
      downloads.push(opts);
      if (cb) cb(123);
    },
  },
};

if (process.env.API_STYLE === "firefox") {
  globalThis.browser = mockApi;
} else {
  globalThis.chrome = mockApi;
}

// Load the real worker.
const require = createRequire(import.meta.url);
require(path.join(__dirname, "..", "background.js"));

// ---- helpers ---------------------------------------------------------------
let passed = 0;
let failed = 0;
function check(name, cond) {
  if (cond) {
    passed++;
    console.log("  ok  " + name);
  } else {
    failed++;
    console.log("FAIL  " + name);
  }
}

function fire(details) {
  return listeners.webRequest({
    statusCode: 200,
    type: "media",
    responseHeaders: [],
    ...details,
  });
}

function getMedia(tabId) {
  return new Promise((resolve) => {
    listeners.message({ type: "getMedia", tabId }, null, resolve);
  });
}

const H = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));

// ---- scenarios -------------------------------------------------------------
console.log("scenario: plain mp4 via <video> tag");
await fire({ tabId: 1, url: "https://cdn.example.com/clips/funny-cat.mp4", responseHeaders: H({ "content-length": "5000000" }) });
let r = await getMedia(1);
check("mp4 recorded", r.items.length === 1);
check("filename kept", r.items[0]?.filename === "funny-cat.mp4");
check("size read from content-length", r.items[0]?.size === 5000000);
check("classified as direct file", r.items[0]?.kind === "file");
check("badge shows 1", badge[1] === "1");

console.log("scenario: xhr with audio content-type and no extension");
await fire({ tabId: 1, type: "xmlhttprequest", url: "https://api.example.com/media/98765", responseHeaders: H({ "content-type": "audio/mpeg", "content-length": "4000000" }) });
r = await getMedia(1);
check("audio xhr recorded", r.items.length === 2);
check("extension derived from content-type", r.items.some((i) => i.filename === "media.mpeg"));

console.log("scenario: range request reveals full size via content-range");
await fire({ tabId: 1, url: "https://cdn.example.com/clips/funny-cat.mp4", statusCode: 206, responseHeaders: H({ "content-length": "1048576", "content-range": "bytes 0-1048575/52428800" }) });
r = await getMedia(1);
check("no duplicate from range request", r.items.length === 2);
check("size upgraded to full total", r.items.find((i) => i.filename === "funny-cat.mp4")?.size === 52428800);

console.log("scenario: HLS manifest counts as a stream");
await fire({ tabId: 1, type: "xmlhttprequest", url: "https://video.example.com/live/master.m3u8", responseHeaders: H({ "content-type": "application/vnd.apple.mpegurl" }) });
r = await getMedia(1);
check("stream recorded", r.items.some((i) => i.kind === "stream"));

console.log("scenario: googlevideo (YouTube) is always a stream");
await fire({ tabId: 1, url: "https://rr3---sn-abc.googlevideo.com/videoplayback?itag=22&mime=video%2Fmp4", responseHeaders: H({ "content-type": "video/mp4", "content-length": "90000000" }) });
r = await getMedia(1);
check("protected host forced to stream", r.items.find((i) => i.url.includes("googlevideo"))?.kind === "stream");

console.log("scenario: tiny file is ignored, non-media is ignored");
await fire({ tabId: 1, url: "https://cdn.example.com/preview-blip.mp4", responseHeaders: H({ "content-length": "50000" }) });
await fire({ tabId: 1, type: "xmlhttprequest", url: "https://api.example.com/data.json", responseHeaders: H({ "content-type": "application/json", "content-length": "9000000" }) });
await fire({ tabId: 1, url: "https://cdn.example.com/error.mp4", statusCode: 404, responseHeaders: H({ "content-length": "9000000" }) });
r = await getMedia(1);
check("blip, json and 404 all skipped", r.items.length === 4);

console.log("scenario: second tab is isolated");
await fire({ tabId: 2, url: "https://cdn.example.com/song.mp3", responseHeaders: H({ "content-length": "6000000" }) });
r = await getMedia(2);
check("tab 2 sees only its own file", r.items.length === 1 && r.items[0].filename === "song.mp3");
r = await getMedia(1);
check("tab 1 unchanged", r.items.length === 4);

console.log("scenario: navigation clears the tab");
listeners.tabUpdated(1, { status: "loading", url: "https://elsewhere.com" });
r = await getMedia(1);
check("tab 1 empty after navigation", r.items.length === 0);
check("badge cleared", badge[1] === "");
r = await getMedia(2);
check("tab 2 survives tab 1 navigation", r.items.length === 1);

console.log("scenario: worker restart restores from session storage");
listeners.tabRemoved(99); // no-op sanity
// tab 2's list came back through getMedia -> restore, so persistence works if
// a fresh map still finds it after we wipe in-memory state is not directly
// reachable; instead prove the session mirror holds the data.
check("session mirror holds tab 2", Array.isArray(sessionStore["tab:2"]) && sessionStore["tab:2"].length === 1);

console.log("scenario: download request goes to the downloads API");
await new Promise((res) => listeners.message({ type: "download", url: "https://cdn.example.com/song.mp3", filename: "song.mp3" }, null, res));
check("download called with filename", downloads[0]?.filename === "song.mp3");

console.log("scenario: min-size setting is applied and persisted");
await new Promise((res) => listeners.message({ type: "setMinBytes", minBytes: 1048576 }, null, res));
await fire({ tabId: 2, url: "https://cdn.example.com/mid-size.mp4", responseHeaders: H({ "content-length": "500000" }) });
r = await getMedia(2);
check("500 KB file skipped under 1 MB setting", r.items.length === 1);
check("setting persisted to sync storage", syncStore.minBytes === 1048576);

console.log("scenario: keyboard shortcut opens the site");
listeners.command("send-page");
await new Promise((res) => setTimeout(res, 10));
check("shortcut opened site with page url", createdTabs.some((u) => u.startsWith("https://pasteandsave.com/?url=https%3A%2F%2Fexample.com%2Fwatch")));

console.log("scenario: context menu click opens the site");
listeners.menuClicked({ pageUrl: "https://example.com/some-post" });
check("menu opened site", createdTabs.some((u) => u.includes("some-post")));

console.log("scenario: list is capped at 40 items");
for (let i = 0; i < 50; i++) {
  await fire({ tabId: 3, url: `https://cdn.example.com/v${i}.mp4`, responseHeaders: H({ "content-length": "9000000" }) });
}
r = await getMedia(3);
check("cap enforced", r.items.length === 40);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
