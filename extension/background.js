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
// raw streams does not produce a usable file, so those go through the site,
// which downloads them whole (YouTube included, via its server-side proxy).
const STREAM_HOSTS = /(^|\.)(googlevideo\.com|fbcdn\.net|cdninstagram\.com|tiktokcdn\S*\.com|twimg\.com)$/i;
const DEFAULT_MIN_BYTES = 200 * 1024; // ignore tiny blips like preview clips

// Minimum size and site address are user-adjustable and cached here.
let minBytes = DEFAULT_MIN_BYTES;
// Hostnames the user has switched the extension off for. Kept as a plain
// array in storage so it survives a worker restart and syncs across browsers.
let disabledHosts = [];

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function siteEnabled(hostOrUrl) {
  const host = hostOrUrl.includes("://")
    ? hostOf(hostOrUrl)
    : String(hostOrUrl).replace(/^www\./, "").toLowerCase();
  if (!host) return true;
  // A disabled entry covers its subdomains too, so switching off "example.com"
  // also covers "cdn.example.com" without listing every one.
  return !disabledHosts.some((h) => host === h || host.endsWith("." + h));
}

function setSiteEnabled(host, isEnabled) {
  const clean = String(host || "").replace(/^www\./, "").toLowerCase();
  if (!clean) return;
  const without = disabledHosts.filter((h) => h !== clean);
  disabledHosts = isEnabled ? without : [...without, clean];
  try {
    api.storage.sync.set({ disabledHosts });
  } catch {
    // keep the in-memory value
  }
}

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
    api.storage.sync.get(
      { minBytes: DEFAULT_MIN_BYTES, siteBase: DEFAULT_SITE, disabledHosts: [] },
      (v) => {
        if (v && Number.isFinite(v.minBytes)) minBytes = v.minBytes;
        if (v && v.siteBase) siteBase = normalizeSite(v.siteBase);
        if (v && Array.isArray(v.disabledHosts)) disabledHosts = v.disabledHosts;
      },
    );
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
    if (changes.disabledHosts && Array.isArray(changes.disabledHosts.newValue)) {
      disabledHosts = changes.disabledHosts.newValue;
    }
  });
} catch {
  // fine
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
  // Switched off for this site: capture nothing at all, rather than collecting
  // quietly and only hiding it from the popup.
  if (!siteEnabled(url)) return;

  const contentType = contentTypeOf(responseHeaders);
  const kind = classify(url, type, contentType);
  if (!kind) return;
  const bytes = totalBytes(responseHeaders);
  if (kind === "file" && bytes > 0 && bytes < minBytes) return;
  const item = {
    key: mediaKey(url),
    url,
    kind,
    size: bytes,
    contentType,
    filename: filenameFrom(url, contentType),
    foundAt: Date.now(),
  };

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
  // Any URL change starts a fresh list — including single-page navigations
  // like clicking to the next YouTube video, which never fully reload.
  if (changeInfo.url) clearTab(tabId);
});
api.tabs.onRemoved.addListener((tabId) => clearTab(tabId));

function openOnSite(target) {
  api.tabs.create({ url: `${siteBase}/?url=${encodeURIComponent(target)}` });
}

// --- talking to the site on the page's behalf -------------------------------
//
// The in-page menu cannot call the site itself: it runs on youtube.com or
// wherever, and a cross-origin request from there would be refused. The worker
// has host permissions, so it makes the call and passes the answer back. This
// is what lets a download finish where the visitor already is, instead of
// throwing them onto another tab.

async function fetchFormats(target) {
  const res = await fetch(`${siteBase}/api/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: target }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Couldn't read that link.");
  return data;
}

function tellTab(tabId, message) {
  if (!tabId) return;
  try {
    api.tabs.sendMessage(tabId, message);
  } catch {
    // tab closed or navigated away
  }
}

// Runs a download to completion and hands the finished file to the browser's
// own downloader, so it lands in the normal downloads folder with its proper
// name and the visitor never leaves the page.
async function runDownload(tabId, jobBody, requestId) {
  const start = await fetch(`${siteBase}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(jobBody),
  });
  const started = await start.json().catch(() => ({}));
  if (!start.ok || !started.jobId) {
    throw new Error(started.error || "Couldn't start the download.");
  }

  // The progress stream is read directly rather than with EventSource, which
  // does not exist in a service worker.
  const events = await fetch(`${siteBase}/api/jobs/${started.jobId}/events`);
  const reader = events.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  while (!finished) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = /^data: (.*)$/m.exec(chunk);
      if (!line) continue;
      let payload;
      try {
        payload = JSON.parse(line[1]);
      } catch {
        continue;
      }
      if (payload.status === "error") {
        throw new Error(payload.error || "The download failed.");
      }
      if (payload.status === "done") {
        finished = true;
        break;
      }
      tellTab(tabId, {
        type: "downloadProgress",
        requestId,
        status: payload.status,
        percent: payload.percent ?? 0,
      });
    }
  }
  try {
    reader.cancel();
  } catch {
    // already closed
  }

  if (!finished) throw new Error("The download stopped before it finished.");

  // Content-Disposition on that endpoint carries the filename, so the browser
  // names the file correctly without us guessing.
  api.downloads.download({ url: `${siteBase}/api/jobs/${started.jobId}/file` });
  tellTab(tabId, { type: "downloadProgress", requestId, status: "saved", percent: 100 });
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
      sendResponse({
        items,
        minBytes,
        siteBase,
        siteEnabled: msg.host ? siteEnabled(msg.host) : true,
      });
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
  // The in-page chip asks before drawing, and again whenever the popup
  // toggles the current site.
  if (msg?.type === "isSiteEnabled") {
    sendResponse({ enabled: siteEnabled(msg.host ?? "") });
    return false;
  }
  if (msg?.type === "setSiteEnabled") {
    setSiteEnabled(msg.host, msg.enabled !== false);
    // Tell the open tabs on that host right away so the chip appears or goes
    // without needing a reload.
    try {
      api.tabs.query({}, (tabs) => {
        for (const tab of tabs ?? []) {
          if (!tab.id || !tab.url) continue;
          if (hostOf(tab.url) !== String(msg.host).replace(/^www\./, "").toLowerCase()) continue;
          try {
            api.tabs.sendMessage(tab.id, {
              type: "siteEnabledChanged",
              enabled: msg.enabled !== false,
            });
          } catch {
            // no content script in that tab
          }
        }
      });
    } catch {
      // tabs API unavailable
    }
    sendResponse({ ok: true, enabled: msg.enabled !== false });
    return false;
  }
  if (msg?.type === "openOnSite") {
    if (msg.url) openOnSite(msg.url);
    sendResponse({ ok: true });
    return false;
  }
  // The in-page menu asks for the quality list, then for one of them.
  if (msg?.type === "getFormats") {
    fetchFormats(msg.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
  if (msg?.type === "startDownload") {
    const tabId = _sender?.tab?.id;
    runDownload(tabId, msg.job, msg.requestId)
      .catch((err) => {
        tellTab(tabId, {
          type: "downloadProgress",
          requestId: msg.requestId,
          status: "error",
          error: err.message,
        });
      });
    sendResponse({ ok: true });
    return false;
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
