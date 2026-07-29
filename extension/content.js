// In-page download button and quality menu.
//
// Puts a "Download now" chip on any real video, and opens the quality list
// right there rather than sending the visitor to another tab. The site is
// called through the background worker, because a request to pasteandsave.com
// from inside somebody else's page would be refused as cross-origin, and the
// finished file is handed to the browser's own downloader so it lands in the
// normal downloads folder.
//
// Rules this file sticks to, because it is a guest on pages we do not own:
//   - Everything lives inside a shadow root, so styling cannot cross either way.
//   - Nothing is inserted into the page's layout; the UI is fixed-positioned.
//   - Decoration, tiny clips and hidden players are ignored.
//   - Any failure is swallowed rather than allowed to break the page.

(function () {
  const api = globalThis.chrome ?? globalThis.browser;
  if (!api?.runtime?.sendMessage) return;
  if (window.top !== window) return;

  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 150;
  const HOST_ID = "pasteandsave-overlay-root";

  let enabled = true;
  let host = null;
  let shadow = null;
  let panel = null;
  let panelFor = null;
  const chips = new Map();
  const pending = new Map();

  function makeHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      .chip {
        position: fixed; display: inline-flex; align-items: center; gap: 6px;
        padding: 7px 11px; border-radius: 10px; border: 0;
        background: rgba(124,58,237,.95); color: #fff;
        font: 600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: pointer; pointer-events: auto;
        box-shadow: 0 4px 14px rgba(0,0,0,.35);
        opacity: 0; transition: opacity .15s ease; }
      .chip.show { opacity: .92; }
      .chip:hover { opacity: 1; background: rgba(109,40,217,1); }
      .chip .x { margin-left: 2px; opacity: .75; font-weight: 700; padding: 0 2px; }
      .chip .x:hover { opacity: 1; }
      .panel {
        position: fixed; width: 268px; max-height: 340px; overflow-y: auto;
        background: #fff; color: #111827; border-radius: 12px;
        border: 1px solid rgba(0,0,0,.08);
        box-shadow: 0 16px 40px rgba(0,0,0,.28);
        font: 400 13px/1.35 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        pointer-events: auto; z-index: 2147483647; }
      .panel .head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; padding: 10px 12px; border-bottom: 1px solid rgba(0,0,0,.06); }
      .panel .title {
        font-weight: 600; font-size: 12px; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis; }
      .panel .close {
        border: 0; background: none; cursor: pointer; font-size: 15px;
        line-height: 1; color: #9ca3af; padding: 2px 4px; }
      .panel .close:hover { color: #374151; }
      .panel .group {
        padding: 6px 12px 2px; font-size: 10px; font-weight: 700;
        letter-spacing: .08em; text-transform: uppercase; color: #9ca3af; }
      .row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; width: 100%; padding: 8px 12px; border: 0;
        background: none; cursor: pointer; text-align: left;
        font: inherit; color: inherit; }
      .row:hover { background: #f5f3ff; }
      .row:disabled { cursor: default; opacity: .65; }
      .row .q { font-weight: 600; }
      .row .sz { font-size: 11px; color: #6b7280; }
      .msg { padding: 12px; font-size: 12px; color: #6b7280; }
      .msg.err { color: #b91c1c; }
      .bar { height: 3px; background: #ede9fe; border-radius: 999px; overflow: hidden; margin-top: 6px; }
      .bar > i { display: block; height: 100%; background: #7c3aed; width: 0; transition: width .2s ease; }
    `;
    shadow.append(style);
    (document.body || document.documentElement).append(host);
  }

  function isWorthOffering(video) {
    const r = video.getBoundingClientRect();
    if (r.width < MIN_WIDTH || r.height < MIN_HEIGHT) return false;
    const cs = getComputedStyle(video);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") return false;
    if (video.muted && video.autoplay && video.loop && !video.controls) return false;
    return true;
  }

  // Players commonly stack more than one <video> in the same spot: a preview
  // layer behind the real one, or an ad slot sharing the frame. Offering a
  // button for each puts two chips on what looks like one video, so only the
  // largest of any overlapping set is offered.
  function pickVideos() {
    const all = [...document.querySelectorAll("video")].filter(isWorthOffering);
    all.sort(
      (a, b) =>
        b.getBoundingClientRect().width * b.getBoundingClientRect().height -
        a.getBoundingClientRect().width * a.getBoundingClientRect().height,
    );
    const kept = [];
    for (const video of all) {
      const r = video.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const covered = kept.some((k) => {
        const kr = k.getBoundingClientRect();
        return cx >= kr.left && cx <= kr.right && cy >= kr.top && cy <= kr.bottom;
      });
      if (!covered) kept.push(video);
    }
    return kept;
  }

  function place(chip, video) {
    const r = video.getBoundingClientRect();
    const off =
      r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
    if (off || !isWorthOffering(video)) {
      chip.classList.remove("show");
      return;
    }
    chip.classList.add("show");
    const width = chip.offsetWidth || 120;
    chip.style.top = `${Math.max(4, r.top + 10)}px`;
    chip.style.left = `${Math.min(innerWidth - width - 4, r.right - width - 10)}px`;
  }

  function fmtSize(bytes) {
    if (!bytes) return "";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${Math.round(bytes / 1024)} KB` : `${mb.toFixed(1)} MB`;
  }

  // Shapes of a link that points at one piece of content rather than a feed,
  // a profile or a hashtag.
  const PERMALINK =
    /\/(?:video|videos|watch|reel|reels|shorts|status|statuses|clip|clips|episode|comments|posts|post|pin|activity|update|track|sets|media|photo|story|stories|tv|live|embed|p|v|e|s)\/|[?&](?:v|story_fbid|fbid)=/i;

  // Some platforms have no word in the address to go on: a Vimeo link is a
  // bare number, a SoundCloud track is just artist and title, and a youtu.be
  // link is the id alone. Those are recognised by host instead, since a
  // pattern loose enough to catch them by shape would also match every
  // profile and category page on every other site.
  function hostSpecificContentLink(u) {
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);

    // youtu.be/VIDEOID
    if (host === "youtu.be") return parts.length === 1 && parts[0].length > 4;
    // vimeo.com/123456789 and vimeo.com/channels/x/123456789
    if (host.endsWith("vimeo.com")) return parts.some((p) => /^\d{6,}$/.test(p));
    // soundcloud.com/artist/track, but not soundcloud.com/artist
    if (host.endsWith("soundcloud.com")) return parts.length >= 2 && parts[0] !== "discover";
    // redd.it/abc123 and other short forms
    if (host === "redd.it" || host === "v.redd.it") return parts.length >= 1;
    // pin.it/abc
    if (host === "pin.it") return parts.length >= 1;
    // fb.watch/abc
    if (host === "fb.watch") return parts.length >= 1;
    return false;
  }

  function looksLikeContentLink(u) {
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    // A subreddit listing lives at /r/<name>/, and a subreddit called
    // "videos" therefore looks exactly like Facebook's /videos/ permalink.
    // On Reddit only a comments link is a single post.
    if (host.endsWith("reddit.com")) return /\/comments\//i.test(u.pathname);
    return PERMALINK.test(u.pathname + u.search) || hostSpecificContentLink(u);
  }

  /**
   * Works out what to send to the site for a given video.
   *
   * Not the media source. A player's currentSrc is a CDN address or a blob,
   * and the extractor has no idea what to do with either: handing it
   * v16-webapp...tiktokcdn.com gets "no suitable extractor" back, which is
   * what the "isn't from a site we can download from" message really means.
   * It also explains why a second attempt often worked — currentSrc is empty
   * until the player attaches, so an early click fell back to the page URL and
   * succeeded by accident.
   *
   * What the site can resolve is the page the video lives on. On a feed the
   * address bar points at the feed rather than any one clip, so the permalink
   * sitting next to the video in the markup is used when there is one.
   */
  function resolveTarget(video) {
    // 1. A permalink inside this video's own card, which is how a feed
    //    identifies each item.
    //
    //    The climb stops as soon as an ancestor holds more than one video,
    //    because that ancestor is the feed rather than this item. Without
    //    that guard the search reaches the whole page and happily returns a
    //    neighbour's link, so pressing download on the fifth clip would fetch
    //    the second one.
    let node = video;
    for (let depth = 0; node && depth < 8; depth++) {
      if (depth > 0 && (node.querySelectorAll?.("video")?.length ?? 0) > 1) break;
      const anchors = node.querySelectorAll?.("a[href]") ?? [];
      for (const a of anchors) {
        const href = a.getAttribute("href") || "";
        if (!href || href.startsWith("#")) continue;
        let abs;
        try {
          abs = new URL(href, location.href);
        } catch {
          continue;
        }
        if (!/^https?:$/.test(abs.protocol)) continue;
        if (abs.hostname !== location.hostname) continue;
        if (looksLikeContentLink(abs)) return abs.href;
      }
      node = node.parentElement;
    }

    // 2. The page itself, when it is already a single piece of content.
    const here = new URL(location.href);
    if (looksLikeContentLink(here)) return here.href;

    // 3. A canonical link, which most players set even inside a feed.
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    if (canonical) {
      try {
        const c = new URL(canonical);
        if (looksLikeContentLink(c)) return c.href;
      } catch {
        // ignore a malformed canonical
      }
    }

    // 4. A page that is itself a media file is worth passing through; a blob
    //    or a CDN fragment is not, so the page URL is the last resort.
    const src = video.currentSrc || video.src || "";
    if (/^https?:/i.test(src) && /\.(mp4|webm|m4v|mov|mp3|m4a)(\?|$)/i.test(src)) {
      return src;
    }
    return location.href;
  }

  function closePanel() {
    panel?.remove();
    panel = null;
    panelFor = null;
  }

  function openPanel(video, chip) {
    closePanel();
    panelFor = video;
    panel = document.createElement("div");
    panel.className = "panel";

    const head = document.createElement("div");
    head.className = "head";
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = "Reading this video…";
    const close = document.createElement("button");
    close.className = "close";
    close.textContent = "✕";
    close.title = "Close";
    close.addEventListener("click", closePanel);
    head.append(title, close);

    const body = document.createElement("div");
    const msg = document.createElement("p");
    msg.className = "msg";
    msg.textContent = "Fetching the available qualities…";
    body.append(msg);

    panel.append(head, body);
    shadow.append(panel);
    positionPanel(chip);

    const target = resolveTarget(video);

    const ask = () => {
      api.runtime.sendMessage({ type: "getFormats", url: target }, (res) => {
        if (!panel) return;
        body.textContent = "";
        if (!res || !res.ok) {
          title.textContent = "Couldn't read it";
          const err = document.createElement("p");
          err.className = "msg err";
          err.textContent = (res && res.error) || "Couldn't reach PasteAndSave.";
          body.append(err);
          // The cause, in small print. Every failure otherwise reads as the
          // same sentence, so a screenshot of one says nothing about which
          // of them it was, and the same investigation gets repeated.
          if (res && res.code && res.code !== "UNKNOWN") {
            const why = document.createElement("p");
            why.className = "msg";
            why.style.cssText = "opacity:.6;font-size:11px;margin-top:4px";
            why.textContent = `Reason: ${res.code}`;
            body.append(why);
          }
          // Sites rate-limit and time out, and the answer a moment later is
          // often different. Offering the retry beats making someone close
          // the menu and start again to find that out.
          const again = document.createElement("button");
          again.className = "row";
          const q = document.createElement("span");
          q.className = "q";
          q.textContent = "Try again";
          again.append(q);
          again.addEventListener("click", () => {
            body.textContent = "";
            title.textContent = "Reading this video…";
            const wait = document.createElement("p");
            wait.className = "msg";
            wait.textContent = "Fetching the available qualities…";
            body.append(wait);
            positionPanel(chip);
            ask();
          });
          body.append(again);
          positionPanel(chip);
          return;
        }
        renderFormats(body, title, res.data, target, chip);
      });
    };
    ask();
  }

  function renderFormats(body, title, data, target, chip) {
    title.textContent = data.title || "This video";
    const videos = Array.isArray(data.video) ? data.video : [];
    const audio = Array.isArray(data.audio) ? data.audio : [];

    if (videos.length === 0 && audio.length === 0) {
      const none = document.createElement("p");
      none.className = "msg";
      none.textContent = "No downloadable formats were found here.";
      body.append(none);
      positionPanel(chip);
      return;
    }

    const addRow = (label, size, job) => {
      const row = document.createElement("button");
      row.className = "row";
      const q = document.createElement("span");
      q.className = "q";
      q.textContent = label;
      const sz = document.createElement("span");
      sz.className = "sz";
      sz.textContent = size;
      row.append(q, sz);

      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("i");
      bar.append(fill);

      row.addEventListener("click", () => {
        if (row.disabled) return;
        row.disabled = true;
        sz.textContent = "starting…";
        row.append(bar);
        const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        pending.set(requestId, { sz, fill, row });
        api.runtime.sendMessage({ type: "startDownload", job, requestId });
      });
      body.append(row);
    };

    if (videos.length > 0) {
      const g = document.createElement("p");
      g.className = "group";
      g.textContent = "Video";
      body.append(g);
      for (const f of videos) {
        addRow(f.label, fmtSize(f.filesize), {
          url: target,
          mode: "video",
          formatId: f.formatId,
          hasAudio: f.hasAudio,
          title: data.title || "download",
        });
      }
    }
    if (audio.length > 0) {
      const g = document.createElement("p");
      g.className = "group";
      g.textContent = "Audio";
      body.append(g);
      // The whole ladder would bury the video list in a small panel, so the
      // two people actually pick are offered here.
      for (const a of audio.filter((x) => x.id === "mp3-320" || x.id === "mp3-128")) {
        addRow(`MP3 ${a.label}`, "", {
          url: target,
          mode: "audio",
          audioFormat: a.audioFormat,
          bitrate: a.bitrate,
          title: data.title || "download",
        });
      }
    }
    positionPanel(chip);
  }

  function positionPanel(chip) {
    if (!panel) return;
    const c = chip.getBoundingClientRect();
    const w = panel.offsetWidth || 268;
    const h = panel.offsetHeight || 200;
    let top = c.bottom + 6;
    if (top + h > innerHeight - 8) top = Math.max(8, c.top - h - 6);
    panel.style.top = `${top}px`;
    panel.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, c.right - w))}px`;
  }

  function chipFor(video) {
    let chip = chips.get(video);
    if (chip) return chip;

    chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.title = "Download this video with PasteAndSave";

    const label = document.createElement("span");
    label.textContent = "Download now";
    const close = document.createElement("span");
    close.className = "x";
    close.textContent = "✕";
    close.title = "Hide on this video";
    chip.append(label, close);

    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === close) {
        chip.remove();
        chips.delete(video);
        if (panelFor === video) closePanel();
        return;
      }
      if (panelFor === video) closePanel();
      else openPanel(video, chip);
    });

    shadow.append(chip);
    chips.set(video, chip);
    return chip;
  }

  function sync() {
    if (!enabled) return;
    const videos = pickVideos();
    if (videos.length === 0 && chips.size === 0) return;
    makeHost();

    const live = new Set(videos);
    for (const video of videos) place(chipFor(video), video);
    for (const [video, chip] of chips) {
      if (!video.isConnected || !live.has(video)) {
        chip.remove();
        chips.delete(video);
        if (panelFor === video) closePanel();
      } else {
        place(chip, video);
        if (panelFor === video) {
          // Scrolling a feed moves the clip away without changing anything
          // else. A menu still hanging there belongs to a video that is no
          // longer on screen, so it goes with it.
          const r = video.getBoundingClientRect();
          const gone = r.bottom < 40 || r.top > innerHeight - 40;
          if (gone) closePanel();
          else positionPanel(chip);
        }
      }
    }
  }

  function teardown() {
    closePanel();
    for (const [, chip] of chips) chip.remove();
    chips.clear();
    host?.remove();
    host = null;
    shadow = null;
  }

  // Feeds and players move between videos without ever loading a page, so
  // there is no navigation event to hang this off. The address is watched
  // instead, and any change resets everything: a menu left open from the last
  // clip would otherwise sit there listing that clip's qualities over the new
  // one, and picking one would download the video you had already scrolled
  // past.
  let lastUrl = location.href;
  function resetForNewPage() {
    closePanel();
    for (const [, chip] of chips) chip.remove();
    chips.clear();
    pending.clear();
  }

  function safeSync() {
    try {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        resetForNewPage();
      }
      sync();
    } catch {
      // Never let a broken page turn into a broken extension.
    }
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      safeSync();
    });
  }

  addEventListener("scroll", schedule, { passive: true, capture: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePanel();
  });
  document.addEventListener("fullscreenchange", schedule);

  const mo = new MutationObserver(schedule);
  function observe() {
    if (document.body) {
      mo.observe(document.body, { childList: true, subtree: true });
      schedule();
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observe);
  } else {
    observe();
  }
  // Players often attach the real <video> a beat after load. This calls sync
  // directly rather than through schedule(): requestAnimationFrame does not
  // run in a backgrounded tab or an embedded view that is not painting, and a
  // safety net that depends on the thing it is insuring against is no net at
  // all. Scroll and resize keep using rAF, where throttling is what you want.
  setInterval(safeSync, 2000);

  try {
    api.runtime.sendMessage({ type: "isSiteEnabled", host: location.hostname }, (res) => {
      if (res && res.enabled === false) {
        enabled = false;
        teardown();
      } else {
        schedule();
      }
    });
  } catch {
    // Worker asleep; defaults stand and the next sync draws.
  }

  api.runtime.onMessage?.addListener((msg) => {
    if (msg?.type === "siteEnabledChanged") {
      enabled = msg.enabled !== false;
      if (enabled) schedule();
      else teardown();
      return;
    }
    if (msg?.type !== "downloadProgress") return;
    const entry = pending.get(msg.requestId);
    if (!entry) return;
    if (msg.status === "error") {
      entry.sz.textContent = msg.error || "failed";
      entry.row.disabled = false;
      pending.delete(msg.requestId);
      return;
    }
    if (msg.status === "saved") {
      entry.sz.textContent = "saved";
      entry.fill.style.width = "100%";
      pending.delete(msg.requestId);
      return;
    }
    entry.sz.textContent =
      msg.status === "converting" ? "converting…" : `${Math.round(msg.percent)}%`;
    entry.fill.style.width = `${Math.max(2, msg.percent)}%`;
  });
})();
