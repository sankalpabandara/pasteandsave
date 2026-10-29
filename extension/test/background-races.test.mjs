// The worker's behaviour when the browser answers late, the way real ones do.
//
// background.test.mjs uses storage that answers instantly, which is why it
// never caught these: settings read before they had loaded, captures lost to
// two restores racing, a previous page's items coming back after navigation.
// Each scenario here loads the real background.js into a fresh sandbox with
// asynchronous storage, so a worker waking from sleep is reproduced exactly.
//
// Run: node --test extension/test/background-races.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { chromeStoreBackground, chromeStoreManifest } from "../build-store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = fs.readFileSync(path.join(here, "..", "background.js"), "utf8");
const STORE_SOURCE = chromeStoreBackground(SOURCE);
const later = (ms, fn) => new Promise((r) => setTimeout(() => r(fn()), ms));
const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms));
const H = (obj) => Object.entries(obj).map(([name, value]) => ({ name, value }));

/** Loads background.js afresh. Storage answers after `delay` ms. */
function loadWorker({ sync = {}, session = {}, delay = 5, fetch, tabAnswers = {}, source = SOURCE } = {}) {
  const listeners = {};
  const opened = [];
  const tabMessages = [];
  const downloads = [];
  const downloadListeners = [];
  const syncStore = { ...sync };
  const sessionStore = { ...session };
  const chrome = {
    webRequest: { onResponseStarted: { addListener: (fn) => (listeners.webRequest = fn) } },
    tabs: {
      onUpdated: { addListener: (fn) => (listeners.tabUpdated = fn) },
      onRemoved: { addListener: (fn) => (listeners.tabRemoved = fn) },
      create: (o) => opened.push(o.url),
      query: (_q, cb) => cb([{ id: 1, url: "https://m.youtube.com/watch?v=abc" }]),
      sendMessage: (tabId, msg, cb) => {
        tabMessages.push({ tabId, msg });
        const answer = tabAnswers[msg?.type];
        if (cb) setTimeout(() => cb(answer), 1);
        return Promise.resolve(answer);
      },
    },
    action: { setBadgeText: async () => {}, setBadgeBackgroundColor: async () => {} },
    storage: {
      onChanged: { addListener: () => {} },
      sync: {
        get: (defaults, cb) => {
          later(delay, () => cb({ ...defaults, ...syncStore }));
        },
        set: (obj) => Object.assign(syncStore, obj),
      },
      session: {
        get: (key) => later(delay, () => ({ [key]: sessionStore[key] })),
        set: async (obj) => Object.assign(sessionStore, obj),
        remove: async (key) => delete sessionStore[key],
      },
    },
    contextMenus: {
      removeAll: (cb) => cb && cb(),
      create: () => {},
      onClicked: { addListener: (fn) => (listeners.menu = fn) },
    },
    runtime: {
      id: "ext",
      getURL: (p) => `chrome-extension://ext/${p}`,
      onInstalled: { addListener: (fn) => fn() },
      onStartup: { addListener: () => {} },
      onMessage: { addListener: (fn) => (listeners.message = fn) },
      lastError: null,
    },
    commands: { onCommand: { addListener: (fn) => (listeners.command = fn) } },
    downloads: {
      download: (opts, cb) => {
        downloads.push(opts);
        const id = downloads.length;
        if (cb) setTimeout(() => cb(id), 1);
      },
      onChanged: {
        addListener: (fn) => downloadListeners.push(fn),
        removeListener: (fn) => downloadListeners.splice(downloadListeners.indexOf(fn), 1),
      },
    },
  };
  const context = vm.createContext({
    chrome,
    fetch,
    URL,
    TextDecoder,
    AbortController,
    AbortSignal,
    Response,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
  });
  vm.runInContext(source, context);

  const POPUP = { id: "ext", url: "chrome-extension://ext/popup.html" };
  const ask = (msg, sender = POPUP) =>
    new Promise((r) => listeners.message(msg, sender, r));
  const fire = (d) =>
    listeners.webRequest({ statusCode: 200, type: "media", responseHeaders: [], ...d });
  const endDownload = (id, state) =>
    downloadListeners.slice().forEach((fn) => fn({ id, state: { current: state } }));
  return { listeners, opened, tabMessages, downloads, syncStore, sessionStore, ask, fire, endDownload };
}

test("settings are honoured from the very first event after waking", async () => {
  const w = loadWorker({
    sync: { disabledHosts: ["youtube.com"], minBytes: 1048576, siteBase: "http://localhost:3030" },
  });
  // Straight away, before storage has answered.
  const enabled = w.ask({ type: "isSiteEnabled", host: "www.youtube.com" }, { id: "ext", tab: { id: 3 } });
  // YouTube's video comes from googlevideo.com; the page that asked is YouTube.
  await w.fire({ tabId: 1, url: "https://rr1.googlevideo.com/videoplayback?itag=22", initiator: "https://www.youtube.com", responseHeaders: H({ "content-type": "video/mp4" }) });
  await w.fire({ tabId: 2, url: "https://cdn.example.com/half-meg.mp4", responseHeaders: H({ "content-length": "500000" }) });
  w.listeners.menu({ menuItemId: "ps-link", linkUrl: "https://example.com/post/1" });
  assert.equal((await enabled).enabled, false, "a switched-off site reports off");
  assert.equal((await w.ask({ type: "getMedia", tabId: 1 })).items.length, 0, "nothing captured on a site that is off");
  assert.equal((await w.ask({ type: "getMedia", tabId: 2 })).items.length, 0, "the minimum size applies");
  await tick();
  assert.ok(w.opened[0]?.startsWith("http://localhost:3030/"), "the user's own server is used");
});

test("switching a site off right after waking keeps the others", async () => {
  const w = loadWorker({ sync: { disabledHosts: ["a.com", "b.com"] } });
  await w.ask({ type: "setSiteEnabled", host: "c.com", enabled: false });
  assert.deepEqual([...w.syncStore.disabledHosts].sort(), ["a.com", "b.com", "c.com"]);
});

test("captures arriving together after a restart are all kept", async () => {
  const w = loadWorker({
    session: { "tab:1": [{ key: "https://cdn.example.com/x.mp4", url: "https://cdn.example.com/x.mp4", kind: "file", size: 9e6, filename: "x.mp4", foundAt: 1 }] },
  });
  await Promise.all([
    w.fire({ tabId: 1, url: "https://cdn.example.com/a.mp4", responseHeaders: H({ "content-length": "9000000" }) }),
    w.fire({ tabId: 1, url: "https://cdn.example.com/b.mp4", responseHeaders: H({ "content-length": "9000000" }) }),
  ]);
  // Array.from: arrays made inside the sandbox are a different realm's.
  const names = Array.from((await w.ask({ type: "getMedia", tabId: 1 })).items, (i) => i.filename).sort();
  assert.deepEqual(names, ["a.mp4", "b.mp4", "x.mp4"]);
});

test("a page left mid-restore does not bring its items back", async () => {
  const w = loadWorker({
    session: { "tab:4": [{ key: "k", url: "https://cdn.example.com/old.mp4", kind: "file", size: 9e6, filename: "old-page.mp4", foundAt: 1 }] },
  });
  const capture = w.fire({ tabId: 4, url: "https://cdn.example.com/late-old.mp4", responseHeaders: H({ "content-length": "9000000" }) });
  w.listeners.tabUpdated(4, { url: "https://example.com/new-page" });
  await capture;
  assert.equal((await w.ask({ type: "getMedia", tabId: 4 })).items.length, 0);
});

test("HLS segments are not listed, and never push the stream out", async () => {
  const w = loadWorker({ delay: 0 });
  await w.fire({ tabId: 6, type: "xmlhttprequest", url: "https://video.example.com/live/master.m3u8", responseHeaders: H({ "content-type": "application/vnd.apple.mpegurl" }) });
  for (let i = 0; i < 45; i++) {
    await w.fire({ tabId: 6, type: "xmlhttprequest", url: `https://video.example.com/live/seg-${String(i).padStart(5, "0")}.ts`, responseHeaders: H({ "content-type": "video/mp2t", "content-length": "1400000" }) });
  }
  const items = (await w.ask({ type: "getMedia", tabId: 6 })).items;
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "stream");
});

test("a content script cannot read other tabs or start arbitrary downloads", async () => {
  const w = loadWorker({ delay: 0 });
  await w.fire({ tabId: 77, url: "https://private.example.com/v.mp4?token=SECRET", responseHeaders: H({ "content-length": "9000000" }) });
  const page = { id: "ext", tab: { id: 5 }, url: "https://evil.example/" };
  assert.equal((await w.ask({ type: "getMedia", tabId: 77 }, page)).ok, false);
  assert.equal((await w.ask({ type: "download", url: "https://evil.example/x.exe" }, page)).ok, false);
  assert.equal(w.downloads.length, 0);
  // The popup still can.
  assert.equal((await w.ask({ type: "getMedia", tabId: 77 })).items.length, 1);
});

test("Save this media sends the clip, not a blob address", async () => {
  const w = loadWorker({
    delay: 0,
    tabAnswers: { resolvePageTarget: { url: "https://www.youtube.com/watch?v=CLIP", kind: "page" } },
  });
  w.listeners.menu(
    { menuItemId: "ps-media", srcUrl: "blob:https://www.youtube.com/2b1c-44", pageUrl: "https://www.youtube.com/" },
    { id: 9, url: "https://www.youtube.com/" },
  );
  await tick(30);
  assert.equal(w.opened.length, 1);
  assert.ok(w.opened[0].includes(encodeURIComponent("https://www.youtube.com/watch?v=CLIP")));
  assert.ok(!w.opened[0].includes("blob"));
});

test("a site can be switched back on from a subdomain", async () => {
  const w = loadWorker({ delay: 0, sync: { disabledHosts: ["youtube.com"] } });
  const res = await w.ask({ type: "setSiteEnabled", host: "m.youtube.com", enabled: true });
  assert.equal(res.enabled, true);
  assert.equal(
    (await w.ask({ type: "isSiteEnabled", host: "m.youtube.com" }, { id: "ext", tab: { id: 1 } })).enabled,
    true,
  );
  // And the open m.youtube.com tab hears that it changed.
  assert.ok(w.tabMessages.some((m) => m.msg?.type === "siteEnabledChanged" && m.msg.enabled === true));
});

test("long names keep their extension and lose characters a filename cannot hold", async () => {
  const w = loadWorker({ delay: 0 });
  const long = "a".repeat(200);
  await w.fire({ tabId: 8, url: `https://cdn.example.com/${long}.mp4`, responseHeaders: H({ "content-length": "9000000" }) });
  await w.fire({ tabId: 8, url: "https://cdn.example.com/%3A%20Intro%3F.mp4", responseHeaders: H({ "content-length": "9000000" }) });
  const names = (await w.ask({ type: "getMedia", tabId: 8 })).items.map((i) => i.filename);
  assert.ok(names.every((n) => n.endsWith(".mp4") && n.length <= 120), names.join(" | "));
  assert.ok(names.every((n) => !/[:?]/.test(n)), names.join(" | "));
});

function siteWith(events) {
  return async (url) => {
    if (url.endsWith("/api/jobs")) {
      return new Response(JSON.stringify({ jobId: "j1" }), { headers: { "content-type": "application/json" } });
    }
    if (url.endsWith("/events")) {
      const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
      return new Response(body, { headers: { "content-type": "text/event-stream" } });
    }
    return new Response("{}", { status: 404, headers: { "content-type": "application/json" } });
  };
}

const JOB = { url: "https://www.youtube.com/watch?v=abc", mode: "video", formatId: "18", title: "t" };
const CONTENT = { id: "ext", tab: { id: 12 }, url: "https://www.youtube.com/watch?v=abc" };
const statusesSent = (w) =>
  w.tabMessages.filter((m) => m.msg?.type === "downloadProgress").map((m) => m.msg.status);

test("'saved' waits until the browser has the file, and the name is passed on", async () => {
  const w = loadWorker({ delay: 0, fetch: siteWith([{ status: "downloading", percent: 50 }, { status: "done", filename: "My clip: part 1.mp4" }]) });
  await w.ask({ type: "startDownload", job: JOB, requestId: "r1" }, CONTENT);
  await tick(30);
  assert.ok(!statusesSent(w).includes("saved"), "not saved before the browser finishes");
  assert.equal(w.downloads[0].filename, "My clip_ part 1.mp4");
  w.endDownload(1, "complete");
  await tick();
  assert.equal(statusesSent(w).at(-1), "saved");
});

test("a download the browser abandons is reported, not called saved", async () => {
  const w = loadWorker({ delay: 0, fetch: siteWith([{ status: "done", filename: "x.mp4" }]) });
  await w.ask({ type: "startDownload", job: JOB, requestId: "r2" }, CONTENT);
  await tick(30);
  w.endDownload(1, "interrupted");
  await tick();
  assert.equal(statusesSent(w).at(-1), "error");
  assert.ok(!statusesSent(w).includes("saved"));
});

test("a malformed job from a page is refused", async () => {
  const w = loadWorker({ delay: 0, fetch: siteWith([]) });
  const res = await w.ask({ type: "startDownload", job: { url: "javascript:alert(1)", mode: "video", formatId: "18" }, requestId: "r3" }, CONTENT);
  assert.equal(res.ok, false);
});

// --- the Chrome Web Store copy (build-store.mjs) ------------------------------

const ON_PAGE = (url) => ({ id: "ext", tab: { id: 12 }, url });

test("the store copy captures nothing on YouTube and cannot be switched on there", async () => {
  const w = loadWorker({ delay: 0, source: STORE_SOURCE });
  await w.fire({ tabId: 1, url: "https://rr1.googlevideo.com/videoplayback?itag=22", initiator: "https://www.youtube.com", responseHeaders: H({ "content-type": "video/mp4" }) });
  await w.fire({ tabId: 1, url: "https://i.ytimg.com/an/clip.mp4", responseHeaders: H({ "content-length": "9000000" }) });
  const media = await w.ask({ type: "getMedia", tabId: 1, host: "m.youtube.com" });
  assert.equal(media.items.length, 0);
  assert.equal(media.offLimits, true, "the popup is told why");
  assert.equal(media.siteEnabled, false);
  await w.ask({ type: "setSiteEnabled", host: "youtube.com", enabled: true });
  for (const host of ["youtube.com", "www.youtube.com", "music.youtube.com", "youtu.be"]) {
    assert.equal((await w.ask({ type: "isSiteEnabled", host }, ON_PAGE("https://example.com/"))).enabled, false, host);
  }
});

test("the store copy never sends a YouTube address to the site, by any route", async () => {
  const w = loadWorker({
    delay: 0,
    source: STORE_SOURCE,
    fetch: siteWith([{ status: "done", filename: "x.mp4" }]),
    tabAnswers: { resolvePageTarget: { url: "https://youtu.be/CLIP", kind: "page" } },
  });
  w.listeners.menu({ menuItemId: "ps-link", linkUrl: "https://www.youtube.com/watch?v=abc" });
  w.listeners.menu({ menuItemId: "ps-page", pageUrl: "https://www.youtube.com/" }, { id: 9, url: "https://www.youtube.com/" });
  await w.ask({ type: "sendTabToSite", tabId: 9, url: "https://www.youtube.com/watch?v=abc" });
  await w.ask({ type: "openOnSite", url: "https://m.youtube.com/shorts/abc" }, ON_PAGE("https://example.com/"));
  const formats = await w.ask({ type: "getFormats", url: "https://www.youtube.com/watch?v=abc" }, ON_PAGE("https://example.com/"));
  const job = await w.ask({ type: "startDownload", job: JOB, requestId: "r4" }, ON_PAGE("https://example.com/"));
  await tick(30);
  assert.deepEqual(w.opened, [], "no tab opened on the site");
  assert.equal(formats.ok, false);
  assert.equal(job.ok, false);
  assert.equal(w.downloads.length, 0);
});

test("the store copy still works everywhere else", async () => {
  const w = loadWorker({ delay: 0, source: STORE_SOURCE });
  await w.fire({ tabId: 2, url: "https://v16.tiktokcdn-us.com/clip.mp4", initiator: "https://www.tiktok.com", responseHeaders: H({ "content-type": "video/mp4" }) });
  assert.equal((await w.ask({ type: "getMedia", tabId: 2, host: "tiktok.com" })).items.length, 1);
  w.listeners.menu({ menuItemId: "ps-link", linkUrl: "https://www.tiktok.com/@a/video/1" });
  await tick();
  assert.equal(w.opened.length, 1);
});

test("the copy on pasteandsave.com leaves YouTube working", async () => {
  const w = loadWorker({ delay: 0 });
  assert.equal((await w.ask({ type: "getMedia", tabId: 1, host: "youtube.com" })).offLimits, false);
  w.listeners.menu({ menuItemId: "ps-link", linkUrl: "https://www.youtube.com/watch?v=abc" });
  await tick();
  assert.equal(w.opened.length, 1);
});

test("the store manifest keeps the page script off YouTube and nowhere else", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  const store = chromeStoreManifest(manifest);
  const exclude = store.content_scripts[0].exclude_matches;
  assert.ok(exclude.includes("*://*.youtube.com/*"));
  assert.ok(exclude.includes("*://*.youtu.be/*"));
  assert.deepEqual(store.content_scripts[0].matches, manifest.content_scripts[0].matches);
  assert.equal(manifest.content_scripts[0].exclude_matches, undefined, "the original is not changed");
  assert.ok(manifest.description.length <= 132, "the Chrome Web Store limit");
  assert.doesNotMatch(manifest.name + manifest.description, /[-‐-―]|youtube/i);
});
