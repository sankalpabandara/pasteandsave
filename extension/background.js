// PasteAndSave extension background worker.
//
// Watches network traffic the same way a download manager does: every video
// or audio response a page loads is recorded per tab, the toolbar badge shows
// how many were found, and the popup lists them. Plain files download
// directly through the browser. Segmented streams (HLS/DASH and protected
// hosts like YouTube) are handed to pasteandsave.com, which knows how to
// fetch them whole.

const api = globalThis.browser ?? globalThis.chrome;
const SITE = "https://pasteandsave.com";

const MEDIA_URL = /\.(mp4|webm|mkv|mov|m4v|mp3|m4a|aac|ogg|opus|wav|flac)([?#]|$)/i;
const STREAM_URL = /\.(m3u8|mpd)([?#]|$)/i;
// Hosts that serve media in protected or split form; direct saving of their
// raw streams does not produce a usable file, so those go through the site.
const STREAM_HOSTS = /(^|\.)(googlevideo\.com|youtube\.com|ytimg\.com|fbcdn\.net|cdninstagram\.com|tiktokcdn\S*\.com|twimg\.com)$/i;
const MIN_BYTES = 200 * 1024; // ignore tiny blips like preview thumbnails

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

function updateBadge(tabId) {
  const count = tabMedia.get(tabId)?.size ?? 0;
  api.action.setBadgeText({ tabId, text: count ? String(count) : "" });
  api.action.setBadgeBackgroundColor({ tabId, color: "#7c3aed" });
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

api.webRequest.onResponseStarted.addListener(
  (details) => {
    const { tabId, url, type, responseHeaders, statusCode } = details;
    if (tabId < 0 || statusCode >= 400) return;
    const contentType = contentTypeOf(responseHeaders);
    const kind = classify(url, type, contentType);
    if (!kind) return;

    const bytes = totalBytes(responseHeaders);
    if (kind === "file" && bytes > 0 && bytes < MIN_BYTES) return;

    restore(tabId).then(() => {
      if (!tabMedia.has(tabId)) tabMedia.set(tabId, new Map());
      const items = tabMedia.get(tabId);
      const key = mediaKey(url);
      const existing = items.get(key);
      // Keep the largest size seen; range requests report chunks.
      const size = Math.max(bytes, existing?.size ?? 0);
      items.set(key, {
        key,
        url,
        kind,
        size,
        contentType,
        filename: filenameFrom(url, contentType),
        foundAt: existing?.foundAt ?? Date.now(),
      });
      // Cap the list so a long session cannot grow without limit.
      if (items.size > 40) {
        const oldest = [...items.values()].sort((a, b) => a.foundAt - b.foundAt)[0];
        items.delete(oldest.key);
      }
      updateBadge(tabId);
      persist(tabId);
    });
  },
  { urls: ["<all_urls>"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"],
);

function clearTab(tabId) {
  tabMedia.delete(tabId);
  api.action.setBadgeText({ tabId, text: "" });
  try {
    api.storage.session.remove("tab:" + tabId);
  } catch {
    // fine
  }
}

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // A real navigation starts a fresh list for that tab.
  if (changeInfo.status === "loading" && changeInfo.url) clearTab(tabId);
});
api.tabs.onRemoved.addListener((tabId) => clearTab(tabId));

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
  if (!target) return;
  api.tabs.create({ url: `${SITE}/?url=${encodeURIComponent(target)}` });
});

// Popup requests.
api.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "getMedia") {
    restore(msg.tabId).then(() => {
      const items = [...(tabMedia.get(msg.tabId)?.values() ?? [])];
      items.sort((a, b) => b.size - a.size || a.foundAt - b.foundAt);
      sendResponse({ items });
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
  return false;
});
