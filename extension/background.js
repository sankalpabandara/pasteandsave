// PasteAndSave extension background worker.
//
// Watches network traffic the same way a download manager does: every video
// or audio response a page loads is recorded per tab, the toolbar badge shows
// how many were found, and the popup lists them. Plain files download
// directly through the browser. Segmented streams (HLS/DASH and protected
// hosts like YouTube) are handed to pasteandsave.com, which knows how to
// fetch them whole.

const api = globalThis.chrome ?? globalThis.browser;
const DEFAULT_SITE = "https://pasteandsave.com";

// The site address is configurable (options page) so the extension can point
// at a staging or local copy of PasteAndSave before the domain is live.
let siteBase = DEFAULT_SITE;

const MEDIA_URL = /\.(mp4|webm|mkv|mov|m4v|mp3|m4a|aac|ogg|opus|wav|flac)([?#]|$)/i;
const STREAM_URL = /\.(m3u8|mpd)([?#]|$)/i;
// Hosts that serve media in protected or split form; direct saving of their
// raw streams does not produce a usable file, so those go through the site.
// (googlevideo is handled separately below — YouTube runs on the user's IP.)
const STREAM_HOSTS = /(^|\.)(fbcdn\.net|cdninstagram\.com|tiktokcdn\S*\.com|twimg\.com)$/i;
const DEFAULT_MIN_BYTES = 200 * 1024; // ignore tiny blips like preview clips

// Minimum size and site address are user-adjustable and cached here.
let minBytes = DEFAULT_MIN_BYTES;

function normalizeSite(raw) {
  try {
    const u = new URL(String(raw).trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return DEFAULT_SITE;
    return u.origin;
  } catch {
    return DEFAULT_SITE;
  }
}

function loadSettings() {
  try {
    api.storage.sync.get({ minBytes: DEFAULT_MIN_BYTES, siteBase: DEFAULT_SITE }, (v) => {
      if (v && Number.isFinite(v.minBytes)) minBytes = v.minBytes;
      if (v && v.siteBase) siteBase = normalizeSite(v.siteBase);
    });
  } catch {
    // sync storage unavailable; the defaults stand
  }
}
loadSettings();
try {
  api.storage.onChanged?.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.minBytes && Number.isFinite(changes.minBytes.newValue)) {
      minBytes = changes.minBytes.newValue;
    }
    if (changes.siteBase) siteBase = normalizeSite(changes.siteBase.newValue);
  });
} catch {
  // fine
}

// --- YouTube client-side capture -------------------------------------------
// YouTube ciphers its stream URLs, so they can't be read from the page. But
// when the user plays a video, their own browser deciphers them and fetches
// the real streams from googlevideo on their own IP. We capture those — the
// one path YouTube can't block, because it's their own player doing the work.
const YT_ITAG = {
  18: { av: "av", label: "360p MP4 · with audio", ext: "mp4" },
  22: { av: "av", label: "720p MP4 · with audio", ext: "mp4" },
  139: { av: "audio", label: "Audio · low (M4A)", ext: "m4a" },
  140: { av: "audio", label: "Audio · medium (M4A)", ext: "m4a" },
  141: { av: "audio", label: "Audio · high (M4A)", ext: "m4a" },
  171: { av: "audio", label: "Audio (WebM)", ext: "webm" },
  249: { av: "audio", label: "Audio · low (WebM)", ext: "webm" },
  250: { av: "audio", label: "Audio · medium (WebM)", ext: "webm" },
  251: { av: "audio", label: "Audio · high (WebM)", ext: "webm" },
  137: { av: "video", label: "1080p · video only", ext: "mp4" },
  136: { av: "video", label: "720p · video only", ext: "mp4" },
  135: { av: "video", label: "480p · video only", ext: "mp4" },
  134: { av: "video", label: "360p · video only", ext: "mp4" },
  133: { av: "video", label: "240p · video only", ext: "mp4" },
  160: { av: "video", label: "144p · video only", ext: "mp4" },
  248: { av: "video", label: "1080p · video only (WebM)", ext: "webm" },
  247: { av: "video", label: "720p · video only (WebM)", ext: "webm" },
  244: { av: "video", label: "480p · video only (WebM)", ext: "webm" },
};

function youtubeStream(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (!/(^|\.)googlevideo\.com$/i.test(u.hostname)) return null;
  const itag = Number(u.searchParams.get("itag"));
  if (!itag) return null;
  const mime = decodeURIComponent(u.searchParams.get("mime") || "");
  const clen = Number(u.searchParams.get("clen")) || 0;
  const known = YT_ITAG[itag];
  const av = known?.av || (mime.startsWith("audio") ? "audio" : "video");
  const ext =
    known?.ext ||
    (mime.includes("webm") ? "webm" : mime.includes("mp4") ? "mp4" : "bin");
  const label = known?.label || `${av === "audio" ? "Audio" : "Video"} · itag ${itag}`;
  // Drop the byte-range so a plain GET returns the whole file, not one chunk.
  u.searchParams.delete("range");
  u.searchParams.delete("rn");
  u.searchParams.delete("rbuf");
  return { itag, av, label, ext, size: clen, url: u.toString() };
}

// tabId -> Map(key -> item). Mirrored to storage.session because MV3
// workers get shut down between events.
const tabMedia = new Map();

function mediaKey(url) {
  try {
    const u = new URL(url);
    const itag = u.searchParams.get("itag") ?? "";
    const mime = u.searchParams.get("mime") ?? "";
    return u.origin + u.pathname + itag + mime;
  } catch {
    return url;
  }
}

function filenameFrom(url, contentType) {
  try {
    const u = new URL(url);
    const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return last.slice(0, 120);
    const ext = (contentType ?? "").split("/")[1]?.split(";")[0];
    return `media${ext ? "." + ext : ""}`;
  } catch {
    return "media";
  }
}

function totalBytes(headers) {
  let length = 0;
  for (const h of headers ?? []) {
    const name = h.name.toLowerCase();
    if (name === "content-range") {
      const m = /\/(\d+)\s*$/.exec(h.value ?? "");
      if (m) return Number(m[1]);
    }
    if (name === "content-length") length = Number(h.value) || 0;
  }
  return length;
}

function contentTypeOf(headers) {
  for (const h of headers ?? []) {
    if (h.name.toLowerCase() === "content-type") return (h.value ?? "").toLowerCase();
  }
  return "";
}

function classify(url, type, contentType) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  if (STREAM_URL.test(url) || /mpegurl|dash\+xml/.test(contentType)) return "stream";
  if (STREAM_HOSTS.test(host)) return "stream";
  if (MEDIA_URL.test(url)) return "file";
  if (contentType.startsWith("video/") || contentType.startsWith("audio/")) {
    return type === "media" || type === "xmlhttprequest" || type === "other" ? "file" : null;
  }
  return null;
}

async function persist(tabId) {
  const items = [...(tabMedia.get(tabId)?.values() ?? [])];
  try {
    await api.storage.session.set({ ["tab:" + tabId]: items });
  } catch {
    // storage.session unavailable; in-memory copy still works while awake
  }
}

// Chrome fires network events for prerendered pages whose tab can vanish
// before the badge call lands, so every badge call swallows that failure.
function setBadge(tabId, text) {
  try {
    const p1 = api.action.setBadgeText({ tabId, text });
    if (p1 && typeof p1.catch === "function") p1.catch(() => {});
    const p2 = api.action.setBadgeBackgroundColor({ tabId, color: "#7c3aed" });
    if (p2 && typeof p2.catch === "function") p2.catch(() => {});
  } catch {
    // tab already gone
  }
}

function updateBadge(tabId) {
  const count = tabMedia.get(tabId)?.size ?? 0;
  setBadge(tabId, count ? String(count) : "");
}

async function restore(tabId) {
  if (tabMedia.has(tabId)) return;
  try {
    const stored = await api.storage.session.get("tab:" + tabId);
    const items = stored["tab:" + tabId];
    if (Array.isArray(items)) {
      tabMedia.set(tabId, new Map(items.map((it) => [it.key, it])));
    }
  } catch {
    // nothing stored
  }
}

function recordResponse(details) {
  const { tabId, url, type, responseHeaders, statusCode } = details;
  if (tabId < 0 || statusCode >= 400) return;

  // YouTube: capture the already-deciphered stream the browser is playing,
  // keyed by format so each quality appears once. No min-size gate.
  const yt = youtubeStream(url);
  let item;
  if (yt) {
    item = {
      key: "yt:" + yt.itag,
      url: yt.url,
      kind: "youtube",
      av: yt.av,
      label: yt.label,
      ext: yt.ext,
      size: yt.size,
      foundAt: Date.now(),
    };
  } else {
    const contentType = contentTypeOf(responseHeaders);
    const kind = classify(url, type, contentType);
    if (!kind) return;
    const bytes = totalBytes(responseHeaders);
    if (kind === "file" && bytes > 0 && bytes < minBytes) return;
    item = {
      key: mediaKey(url),
      url,
      kind,
      size: bytes,
      contentType,
      filename: filenameFrom(url, contentType),
      foundAt: Date.now(),
    };
  }

  return restore(tabId).then(() => {
    if (!tabMedia.has(tabId)) tabMedia.set(tabId, new Map());
    const items = tabMedia.get(tabId);
    const existing = items.get(item.key);
    // Keep the largest size seen; range requests report chunks.
    item.size = Math.max(item.size || 0, existing?.size ?? 0);
    item.foundAt = existing?.foundAt ?? item.foundAt;
    items.set(item.key, item);
    // Cap the list so a long session cannot grow without limit.
    if (items.size > 40) {
      const oldest = [...items.values()].sort((a, b) => a.foundAt - b.foundAt)[0];
      items.delete(oldest.key);
    }
    updateBadge(tabId);
    persist(tabId);
  });
}

api.webRequest.onResponseStarted.addListener(
  recordResponse,
  { urls: ["<all_urls>"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"],
);

function clearTab(tabId) {
  tabMedia.delete(tabId);
  setBadge(tabId, "");
  try {
    const p = api.storage.session.remove("tab:" + tabId);
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // fine
  }
}

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // A real navigation starts a fresh list for that tab.
  if (changeInfo.status === "loading" && changeInfo.url) clearTab(tabId);
});
api.tabs.onRemoved.addListener((tabId) => clearTab(tabId));

function openOnSite(target) {
  api.tabs.create({ url: `${siteBase}/?url=${encodeURIComponent(target)}` });
}

// Right-click entries: page, link, or the media element itself.
function setupMenus() {
  api.contextMenus.removeAll(() => {
    api.contextMenus.create({
      id: "ps-page",
      title: "Save this page's video with PasteAndSave",
      contexts: ["page"],
    });
    api.contextMenus.create({
      id: "ps-link",
      title: "Save link with PasteAndSave",
      contexts: ["link"],
    });
    api.contextMenus.create({
      id: "ps-media",
      title: "Save this media with PasteAndSave",
      contexts: ["video", "audio"],
    });
  });
}
api.runtime.onInstalled.addListener(setupMenus);
api.runtime.onStartup?.addListener(setupMenus);

api.contextMenus.onClicked.addListener((info) => {
  const target = info.srcUrl || info.linkUrl || info.pageUrl;
  if (target) openOnSite(target);
});

// Keyboard shortcut: send the current page to the site without the popup.
api.commands?.onCommand.addListener((command) => {
  if (command !== "send-page") return;
  api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs?.[0]?.url;
    if (url && /^https?:/i.test(url)) openOnSite(url);
  });
});

// Popup requests.
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "getMedia") {
    restore(msg.tabId).then(() => {
      const items = [...(tabMedia.get(msg.tabId)?.values() ?? [])];
      items.sort((a, b) => b.size - a.size || a.foundAt - b.foundAt);
      sendResponse({ items, minBytes, siteBase });
    });
    return true; // async response
  }
  if (msg?.type === "download") {
    api.downloads.download(
      { url: msg.url, filename: msg.filename || undefined },
      () => sendResponse({ ok: !api.runtime.lastError }),
    );
    return true;
  }
  if (msg?.type === "setMinBytes") {
    const n = Number(msg.minBytes);
    if (Number.isFinite(n) && n >= 0) {
      minBytes = n;
      try {
        api.storage.sync.set({ minBytes: n });
      } catch {
        // keep the in-memory value
      }
    }
    sendResponse({ ok: true, minBytes });
    return false;
  }
  return false;
});
