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
// Pieces of an HLS or DASH stream. Each one is a few seconds of video, never a
// file anyone wants, and an hls.js player fetches dozens of them: recorded as
// files they filled the forty-item list and pushed the stream itself out.
const SEGMENT_URL = /\.(ts|m4s)([?#]|$)|\/(?:seg|segment|chunk|frag|fragment)[-_]?\d+/i;
const DEFAULT_MIN_BYTES = 200 * 1024; // ignore tiny blips like preview clips

// Minimum size and site address are user-adjustable and cached here.
let minBytes = DEFAULT_MIN_BYTES;
// Hostnames the user has switched the extension off for. Kept as a plain
// array in storage so it survives a worker restart and syncs across browsers.
let disabledHosts = [];

// Swallows the rejection a browser API promise gives when, for example, the
// tab it was aimed at has closed. A try/catch cannot catch those.
function quiet(p) {
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function cleanHost(hostOrUrl) {
  return String(hostOrUrl || "").includes("://")
    ? hostOf(hostOrUrl)
    : String(hostOrUrl || "").replace(/^www\./, "").toLowerCase();
}

function siteEnabled(hostOrUrl) {
  const host = cleanHost(hostOrUrl);
  if (!host) return true;
  // A disabled entry covers its subdomains too, so switching off "example.com"
  // also covers "cdn.example.com" without listing every one.
  return !disabledHosts.some((h) => host === h || host.endsWith("." + h));
}

function setSiteEnabled(host, isEnabled) {
  const clean = cleanHost(host);
  if (!clean) return;
  // Switching a site back on removes every entry that covers it. Removing
  // only the exact name left "youtube.com" in place when someone turned
  // m.youtube.com back on, so the switch said on and capture stayed off.
  const without = disabledHosts.filter((h) => h !== clean && !clean.endsWith("." + h));
  disabledHosts = isEnabled ? without : [...disabledHosts.filter((h) => h !== clean), clean];
  try {
    quiet(api.storage.sync.set({ disabledHosts }));
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

function applySettings(v) {
  if (v && Number.isFinite(v.minBytes)) minBytes = v.minBytes;
  if (v && v.siteBase) siteBase = normalizeSite(v.siteBase);
  if (v && Array.isArray(v.disabledHosts)) disabledHosts = v.disabledHosts;
}

// Settings arrive asynchronously, and the worker is woken constantly by the
// network listener, so the first events after every wake-up used to run on the
// defaults: a site switched off was captured anyway, the minimum size was
// ignored, and a user's own server address was bypassed in favour of
// production. Everything that reads a setting waits for this first.
const settingsReady = new Promise((resolve) => {
  let done = false;
  const finish = (v) => {
    if (done) return;
    done = true;
    applySettings(v);
    resolve();
  };
  try {
    const p = api.storage.sync.get(
      { minBytes: DEFAULT_MIN_BYTES, siteBase: DEFAULT_SITE, disabledHosts: [] },
      finish,
    );
    if (p && typeof p.then === "function") p.then(finish, () => finish(null));
  } catch {
    finish(null);
  }
  // Storage that never answers must not hold the extension up for good.
  setTimeout(() => finish(null), 2000);
});

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
// Counts navigations per tab, so work started for one page can tell that the
// tab has moved on before it lands.
const tabGeneration = new Map();
const restoring = new Map();

function generationOf(tabId) {
  return tabGeneration.get(tabId) ?? 0;
}

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

/**
 * A name the downloads API will accept, with its extension kept.
 *
 * The old version cut names at 120 characters after checking for an
 * extension, so a long one lost its ".mp4", and it decoded characters like
 * ":" and "?" straight into the name.
 */
function safeFilename(name, fallbackExt = "") {
  let clean = String(name || "")
    .replace(/[\\/:*?"<>|\x00-\x1f]+/g, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "");
  if (!clean) clean = "media";
  const m = /^(.*?)(\.[a-z0-9]{2,5})?$/i.exec(clean);
  let stem = m[1] || "media";
  let ext = m[2] || (fallbackExt ? `.${fallbackExt}` : "");
  stem = stem.slice(0, 120 - ext.length).replace(/[\s.]+$/, "") || "media";
  return stem + ext;
}

function filenameFrom(url, contentType) {
  const ext = (contentType ?? "").split("/")[1]?.split(";")[0] ?? "";
  try {
    const u = new URL(url);
    let last = u.pathname.split("/").filter(Boolean).pop() ?? "";
    try {
      last = decodeURIComponent(last);
    } catch {
      // a malformed escape; keep it as it came
    }
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return safeFilename(last);
    return safeFilename("media", ext);
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
  if (contentType === "video/mp2t" || /iso\.segment/.test(contentType) || SEGMENT_URL.test(url)) {
    return null;
  }
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
    quiet(api.action.setBadgeText({ tabId, text }));
    quiet(api.action.setBadgeBackgroundColor({ tabId, color: "#7c3aed" }));
  } catch {
    // tab already gone
  }
}

function updateBadge(tabId) {
  const count = tabMedia.get(tabId)?.size ?? 0;
  setBadge(tabId, count ? String(count) : "");
}

/**
 * Brings a tab's list back from session storage after the worker slept.
 *
 * One restore per tab at a time. A page loaded after the worker slept fires a
 * burst of responses at once, and each used to start its own restore; the one
 * that finished last replaced the list the others had already added to, so
 * captures went missing. And a restore that finishes after the tab navigated
 * no longer brings the previous page's items back.
 */
function restore(tabId) {
  if (tabMedia.has(tabId)) return Promise.resolve();
  if (!restoring.has(tabId)) {
    const gen = generationOf(tabId);
    const pending = Promise.resolve()
      .then(() => api.storage.session.get("tab:" + tabId))
      .then((stored) => {
        if (generationOf(tabId) !== gen || tabMedia.has(tabId)) return;
        const items = stored?.["tab:" + tabId];
        if (Array.isArray(items)) {
          tabMedia.set(tabId, new Map(items.map((it) => [it.key, it])));
        }
      })
      .catch(() => {})
      .finally(() => restoring.delete(tabId));
    restoring.set(tabId, pending);
  }
  return restoring.get(tabId);
}

const MAX_ITEMS = 40;

function recordResponse(details) {
  const { tabId, url, type, responseHeaders, statusCode } = details;
  if (tabId < 0 || statusCode >= 400) return;
  const gen = generationOf(tabId);

  // The page that asked for this, as well as the media address itself. The
  // switch is set per site, and YouTube's video comes from googlevideo.com,
  // so checking only the media address meant switching youtube.com off never
  // stopped anything being captured on YouTube. Chrome reports the page as
  // initiator, Firefox as documentUrl.
  const page = details.initiator || details.documentUrl || details.originUrl || "";

  return settingsReady.then(() => {
    // Switched off for this site: capture nothing at all, rather than collecting
    // quietly and only hiding it from the popup.
    if (!siteEnabled(url) || (page && !siteEnabled(page))) return;

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
      // The tab moved to another page while this was waiting.
      if (generationOf(tabId) !== gen) return;
      if (!tabMedia.has(tabId)) tabMedia.set(tabId, new Map());
      const items = tabMedia.get(tabId);
      const existing = items.get(item.key);
      // Keep the largest size seen; range requests report chunks.
      item.size = Math.max(item.size || 0, existing?.size ?? 0);
      item.foundAt = existing?.foundAt ?? item.foundAt;
      items.set(item.key, item);
      // Cap the list so a long session cannot grow without limit. A stream is
      // the one thing here that cannot be found again by reloading a file, so
      // the oldest plain file goes first.
      if (items.size > MAX_ITEMS) {
        const byAge = [...items.values()].sort((a, b) => a.foundAt - b.foundAt);
        const victim = byAge.find((it) => it.kind !== "stream") ?? byAge[0];
        items.delete(victim.key);
      }
      updateBadge(tabId);
      persist(tabId);
    });
  });
}

api.webRequest.onResponseStarted.addListener(
  recordResponse,
  { urls: ["<all_urls>"], types: ["media", "xmlhttprequest", "other"] },
  ["responseHeaders"],
);

function clearTab(tabId) {
  tabGeneration.set(tabId, generationOf(tabId) + 1);
  tabMedia.delete(tabId);
  setBadge(tabId, "");
  try {
    quiet(api.storage.session.remove("tab:" + tabId));
  } catch {
    // fine
  }
}

api.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Any URL change starts a fresh list — including single-page navigations
  // like clicking to the next YouTube video, which never fully reload.
  if (changeInfo.url) clearTab(tabId);
});
api.tabs.onRemoved.addListener((tabId) => {
  clearTab(tabId);
  tabGeneration.delete(tabId);
});

function openOnSite(target) {
  quiet(api.tabs.create({ url: `${siteBase}/?url=${encodeURIComponent(target)}` }));
}

// --- talking to tabs -------------------------------------------------------

function tellTab(tabId, message) {
  if (!tabId) return;
  try {
    quiet(api.tabs.sendMessage(tabId, message));
  } catch {
    // tab closed or navigated away
  }
}

/** Asks a tab's content script something, giving up after timeoutMs. */
function askTab(tabId, message, timeoutMs = 1500) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => {
      if (done) return;
      done = true;
      resolve(v ?? null);
    };
    setTimeout(() => finish(null), timeoutMs);
    try {
      const p = api.tabs.sendMessage(tabId, message, (res) => {
        void api.runtime.lastError; // read it so Chrome does not log it
        finish(res);
      });
      if (p && typeof p.then === "function") p.then(finish, () => finish(null));
    } catch {
      finish(null);
    }
  });
}

/**
 * The address worth sending to the site for whatever is on this tab.
 *
 * The page address is a feed on TikTok, X and Facebook, and the site cannot
 * do anything with a feed. The content script already knows how to find the
 * permalink for the video on screen, so it is asked first, the same way the
 * in-page button works. The page address is only the fallback.
 */
async function targetForTab(tab, fallback, clicked = false) {
  if (tab && tab.id >= 0) {
    const res = await askTab(tab.id, { type: "resolvePageTarget", clicked });
    if (res && typeof res.url === "string" && /^https?:/i.test(res.url)) return res;
  }
  return fallback ? { url: fallback, kind: "page" } : null;
}

/** A media address the browser can save as it is, rather than via the site. */
function isPlainFileUrl(url) {
  try {
    const u = new URL(url);
    return /^https?:$/.test(u.protocol) && !STREAM_HOSTS.test(u.hostname) && MEDIA_URL.test(url);
  } catch {
    return false;
  }
}

// --- downloads -------------------------------------------------------------

/** downloads.download in either callback or promise form; resolves with the id. */
function startBrowserDownload(opts) {
  return new Promise((resolve, reject) => {
    try {
      const p = api.downloads.download(opts, (id) => {
        const err = api.runtime.lastError;
        if (err || id === undefined) reject(new Error(err?.message || "The browser refused the download."));
        else resolve(id);
      });
      if (p && typeof p.then === "function") p.then(resolve, reject);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Resolves with "complete" or "interrupted" once the browser is done with it.
 *
 * "Saved" used to be sent the moment the download was asked for. The file
 * endpoint is single use, so a download the browser then failed or cancelled
 * could never be retried, while the page said it had been saved.
 */
function whenDownloadEnds(id) {
  const onChanged = api.downloads.onChanged;
  if (!onChanged?.addListener) return Promise.resolve("complete");
  return new Promise((resolve) => {
    const listener = (delta) => {
      if (delta.id !== id || !delta.state) return;
      if (delta.state.current === "complete" || delta.state.current === "interrupted") {
        onChanged.removeListener(listener);
        resolve(delta.state.current);
      }
    };
    onChanged.addListener(listener);
  });
}

// --- talking to the site on the page's behalf -------------------------------
//
// The in-page menu cannot call the site itself: it runs on youtube.com or
// wherever, and a cross-origin request from there would be refused. The worker
// has host permissions, so it makes the call and passes the answer back. This
// is what lets a download finish where the visitor already is, instead of
// throwing them onto another tab.

// Turns a failed request into something the visitor can act on. A network
// failure used to surface as the raw "Failed to fetch", and a server outage
// page as "Couldn't read that link", which blamed the link.
function friendlyError(err) {
  if (err && err.name === "TimeoutError") return "PasteAndSave took too long to answer. Please try again.";
  if (err && err.name === "TypeError") return "PasteAndSave isn't reachable right now. Check your connection and try again.";
  return err?.message || "Something went wrong. Please try again.";
}

async function readJson(res) {
  const type = res.headers.get("content-type") || "";
  if (!type.includes("json")) {
    throw new Error("PasteAndSave had a problem answering. Please try again in a moment.");
  }
  return res.json();
}

// A YouTube lookup can take a minute while the server swaps its proxy
// address, and Chrome stops a worker that has made no extension API call for
// thirty seconds. A cheap call every twenty keeps it awake for the wait.
function keepAwake() {
  const timer = setInterval(() => {
    try {
      quiet(api.runtime.getPlatformInfo?.(() => {}));
    } catch {
      // nothing to keep awake
    }
  }, 20000);
  return () => clearInterval(timer);
}

async function fetchFormats(target) {
  const stop = keepAwake();
  try {
    const res = await fetch(`${siteBase}/api/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: target }),
      signal: AbortSignal.timeout(150000),
    });
    const data = await readJson(res).catch((e) => {
      if (res.ok) throw e;
      return {};
    });
    if (!res.ok) throw new Error(data.error || "Couldn't read that link.");
    return data;
  } catch (err) {
    throw new Error(friendlyError(err));
  } finally {
    stop();
  }
}

// Runs a download to completion and hands the finished file to the browser's
// own downloader, so it lands in the normal downloads folder with its proper
// name and the visitor never leaves the page.
async function runDownload(tabId, jobBody, requestId) {
  let start;
  try {
    start = await fetch(`${siteBase}/api/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobBody),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err) {
    throw new Error(friendlyError(err));
  }
  const started = await readJson(start).catch(() => ({}));
  if (!start.ok || !started.jobId) {
    throw new Error(started.error || "Couldn't start the download.");
  }

  // The progress stream is read directly rather than with EventSource, which
  // does not exist in a service worker. A stream that goes quiet for a minute
  // is treated as lost rather than waited on for ever.
  const controller = new AbortController();
  let quietTimer = setTimeout(() => controller.abort(), 60000);
  const heard = () => {
    clearTimeout(quietTimer);
    quietTimer = setTimeout(() => controller.abort(), 60000);
  };

  let events;
  try {
    events = await fetch(`${siteBase}/api/jobs/${started.jobId}/events`, { signal: controller.signal });
  } catch (err) {
    clearTimeout(quietTimer);
    throw new Error(friendlyError(err));
  }
  if (!events.ok || !events.body) {
    clearTimeout(quietTimer);
    throw new Error("PasteAndSave lost track of this download. Please try again.");
  }

  const reader = events.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;
  let filename = "";

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      heard();
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
          filename = typeof payload.filename === "string" ? payload.filename : "";
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
  } catch (err) {
    if (err?.name === "AbortError") throw new Error("PasteAndSave stopped answering. Please try again.");
    throw err;
  } finally {
    clearTimeout(quietTimer);
    try {
      quiet(reader.cancel());
    } catch {
      // already closed
    }
  }

  if (!finished) throw new Error("The download stopped before it finished.");

  // The name comes from the site, which already worked it out; passing it
  // means the browser does not have to read it off a header, which Firefox
  // does not always do.
  const opts = { url: `${siteBase}/api/jobs/${started.jobId}/file` };
  if (filename) opts.filename = safeFilename(filename);
  let id;
  try {
    id = await startBrowserDownload(opts);
  } catch {
    // A name the browser will not take is no reason to lose the file.
    id = await startBrowserDownload({ url: opts.url });
  }
  tellTab(tabId, { type: "downloadProgress", requestId, status: "saving", percent: 100 });
  const outcome = await whenDownloadEnds(id);
  if (outcome !== "complete") throw new Error("The browser didn't finish saving the file.");
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

// Sends a resolved target where it can be handled: a plain media file is
// saved by the browser, anything else goes to the site.
function deliver(target) {
  if (!target) return;
  if (target.kind === "file" || isPlainFileUrl(target.url)) {
    quiet(startBrowserDownload({ url: target.url, filename: filenameFrom(target.url, "") }).catch(() => {}));
    return;
  }
  openOnSite(target.url);
}

api.contextMenus.onClicked.addListener((info, tab) => {
  settingsReady.then(async () => {
    // A link someone right-clicked says exactly what they want.
    if (info.menuItemId === "ps-link" && info.linkUrl) return openOnSite(info.linkUrl);
    // On every big platform a video's source is a blob or a CDN address,
    // which the site rejects, so the clicked video is resolved the way the
    // in-page button does it. A plain file is still taken as it is.
    if (info.menuItemId === "ps-media" && info.srcUrl && isPlainFileUrl(info.srcUrl)) {
      return deliver({ url: info.srcUrl, kind: "file" });
    }
    const target = await targetForTab(tab, info.pageUrl, info.menuItemId === "ps-media");
    deliver(target);
  });
});

// Keyboard shortcut: send the current page to the site without the popup.
api.commands?.onCommand.addListener((command) => {
  if (command !== "send-page") return;
  api.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0];
    if (!tab?.url || !/^https?:/i.test(tab.url)) return;
    settingsReady.then(async () => deliver(await targetForTab(tab, tab.url)));
  });
});

// --- who may ask for what ----------------------------------------------------
//
// Chrome's advice is to treat anything a content script sends as possibly
// crafted by an attacker, since a compromised page can take one over. The
// popup's requests read every tab's captured links and save arbitrary files,
// so only the extension's own pages may make them; a content script may only
// ask about its own tab.

function fromExtensionPage(sender) {
  if (!sender) return true; // the harness and some older engines send none
  if (sender.tab) return false;
  if (sender.id && api.runtime.id && sender.id !== api.runtime.id) return false;
  const base = typeof api.runtime.getURL === "function" ? api.runtime.getURL("") : "";
  return !sender.url || !base || sender.url.startsWith(base);
}

function fromOurContentScript(sender) {
  if (!sender?.tab) return false;
  return !sender.id || !api.runtime.id || sender.id === api.runtime.id;
}

function validJob(job) {
  if (!job || typeof job !== "object") return false;
  if (job.mode !== "video" && job.mode !== "audio") return false;
  if (typeof job.url !== "string" || !/^https?:\/\//i.test(job.url)) return false;
  if (job.mode === "video" && !/^[\w.+\-/]{1,80}$/.test(String(job.formatId || ""))) return false;
  return true;
}

const POPUP_ONLY = new Set(["getMedia", "download", "setSiteEnabled", "setMinBytes", "sendTabToSite"]);
const CONTENT_ONLY = new Set(["getFormats", "startDownload", "saveFile"]);

function handleMessage(msg, sender, sendResponse) {
  const type = msg?.type;
  if (POPUP_ONLY.has(type) && !fromExtensionPage(sender)) return sendResponse({ ok: false });
  if (CONTENT_ONLY.has(type) && !fromOurContentScript(sender)) return sendResponse({ ok: false });

  if (type === "getMedia") {
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
    return;
  }
  if (type === "download") {
    startBrowserDownload({ url: msg.url, filename: msg.filename ? safeFilename(msg.filename) : undefined })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return;
  }
  // The in-page chip asks before drawing, and again whenever the popup
  // toggles the current site.
  if (type === "isSiteEnabled") {
    return sendResponse({ enabled: siteEnabled(msg.host ?? "") });
  }
  if (type === "setSiteEnabled") {
    // Each open tab's state is noted before the change and compared after,
    // so a tab on a subdomain hears about its parent being switched off too.
    // Telling only exact host matches left the chip showing on m.youtube.com
    // after youtube.com was switched off.
    const apply = (tabs) => {
      const before = (tabs ?? [])
        .filter((t) => t.id && t.url)
        .map((t) => ({ id: t.id, url: t.url, on: siteEnabled(t.url) }));
      setSiteEnabled(msg.host, msg.enabled !== false);
      for (const t of before) {
        const on = siteEnabled(t.url);
        if (on !== t.on) tellTab(t.id, { type: "siteEnabledChanged", enabled: on });
      }
      sendResponse({ ok: true, enabled: siteEnabled(msg.host ?? "") });
    };
    try {
      api.tabs.query({}, apply);
    } catch {
      apply([]);
    }
    return;
  }
  if (type === "openOnSite") {
    if (typeof msg.url === "string" && /^https?:\/\//i.test(msg.url)) openOnSite(msg.url);
    return sendResponse({ ok: true });
  }
  // The popup's "this page" button: the same resolution the menu uses, so a
  // feed sends the clip on screen rather than the feed.
  if (type === "sendTabToSite") {
    const withTab = (tab) => {
      const fallback = tab?.url && /^https?:/i.test(tab.url) ? tab.url : msg.url || null;
      targetForTab(tab, fallback).then((target) => {
        deliver(target);
        sendResponse({ ok: Boolean(target) });
      });
    };
    if (typeof api.tabs.get !== "function") return withTab({ id: msg.tabId, url: msg.url });
    api.tabs.get(msg.tabId, (tab) => {
      void api.runtime.lastError;
      withTab(tab);
    });
    return;
  }
  // The in-page menu asks for the quality list, then for one of them.
  if (type === "getFormats") {
    if (typeof msg.url !== "string" || !/^https?:\/\//i.test(msg.url)) {
      return sendResponse({ ok: false, error: "That link isn't valid." });
    }
    fetchFormats(msg.url)
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return;
  }
  if (type === "startDownload") {
    const tabId = sender?.tab?.id;
    if (!validJob(msg.job)) {
      tellTab(tabId, { type: "downloadProgress", requestId: msg.requestId, status: "error", error: "That download isn't valid." });
      return sendResponse({ ok: false });
    }
    runDownload(tabId, msg.job, msg.requestId).catch((err) => {
      tellTab(tabId, {
        type: "downloadProgress",
        requestId: msg.requestId,
        status: "error",
        error: err.message,
      });
    });
    return sendResponse({ ok: true });
  }
  // A plain media file found by the in-page button, saved by the browser.
  if (type === "saveFile") {
    if (!isPlainFileUrl(msg.url)) return sendResponse({ ok: false });
    startBrowserDownload({ url: msg.url, filename: filenameFrom(msg.url, "") })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return;
  }
  if (type === "setMinBytes") {
    const n = Number(msg.minBytes);
    if (Number.isFinite(n) && n >= 0) {
      minBytes = n;
      try {
        quiet(api.storage.sync.set({ minBytes: n }));
      } catch {
        // keep the in-memory value
      }
    }
    return sendResponse({ ok: true, minBytes });
  }
  sendResponse(undefined);
}

// Every message waits for the settings first, so a reply never describes the
// defaults when the user has changed something.
api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  settingsReady.then(() => handleMessage(msg, sender, sendResponse));
  return true; // async response
});
