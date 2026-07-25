// In-page download button.
//
// Puts a small "Save video" chip in the corner of any real video on the page,
// so a visitor never has to open the popup or copy a link to notice that the
// video can be saved. This is the one thing a download-manager extension is
// judged on, and it is also the easiest way to break somebody else's site, so
// the rules here are strict:
//
//   - Everything lives inside a shadow root, so no page CSS can touch our
//     styles and none of our styles can leak onto the page.
//   - Nothing is inserted into the page's own layout. The chip is fixed-
//     positioned and moved to follow its video, so no reflow is caused.
//   - Tiny videos, muted autoplay loops and background decoration are ignored,
//     because a button over a site's hero animation is just litter.
//   - The whole thing switches off for a site the moment the user says so.

(function () {
  const api = globalThis.chrome ?? globalThis.browser;
  if (!api?.runtime?.sendMessage) return;
  // Only run in the top document. Videos inside iframes are handled by the
  // frame's own injection, and running in both would double up the chips.
  if (window.top !== window) return;

  const MIN_WIDTH = 200;
  const MIN_HEIGHT = 150;
  const HOST_ID = "pasteandsave-overlay-root";

  let enabled = true;
  let host = null;
  let shadow = null;
  // video element -> chip element
  const chips = new Map();

  function makeHost() {
    if (host) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    // The host itself must never intercept clicks meant for the page.
    host.style.cssText =
      "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
    shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      .chip {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 11px;
        border-radius: 10px;
        border: 0;
        background: rgba(124, 58, 237, 0.95);
        color: #fff;
        font: 600 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        cursor: pointer;
        pointer-events: auto;
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
        opacity: 0;
        transition: opacity .15s ease, transform .15s ease;
        transform: translateY(-2px);
      }
      .chip.show { opacity: .92; transform: none; }
      .chip:hover { opacity: 1; background: rgba(109, 40, 217, 1); }
      .chip:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .chip .x {
        margin-left: 2px;
        opacity: .75;
        font-weight: 700;
        padding: 0 2px;
      }
      .chip .x:hover { opacity: 1; }
    `;
    shadow.append(style);
    (document.body || document.documentElement).append(host);
  }

  // A video worth offering. Skips the decorative background loops that many
  // marketing sites autoplay, and anything too small to be real content.
  function isWorthOffering(video) {
    const r = video.getBoundingClientRect();
    if (r.width < MIN_WIDTH || r.height < MIN_HEIGHT) return false;
    const cs = getComputedStyle(video);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") {
      return false;
    }
    // Muted + autoplay + loop with no controls is decoration, not content.
    if (video.muted && video.autoplay && video.loop && !video.controls) return false;
    return true;
  }

  function place(chip, video) {
    const r = video.getBoundingClientRect();
    const offscreen =
      r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth;
    if (offscreen || !isWorthOffering(video)) {
      chip.classList.remove("show");
      return;
    }
    chip.classList.add("show");
    // Top-right of the video, nudged in so it clears rounded corners and the
    // player's own controls, which sit along the bottom.
    const width = chip.offsetWidth || 110;
    chip.style.top = `${Math.max(4, r.top + 10)}px`;
    chip.style.left = `${Math.min(window.innerWidth - width - 4, r.right - width - 10)}px`;
  }

  function chipFor(video) {
    let chip = chips.get(video);
    if (chip) return chip;

    chip = document.createElement("button");
    chip.className = "chip";
    chip.type = "button";
    chip.title = "Save this video with PasteAndSave";

    const label = document.createElement("span");
    label.textContent = "Save video";
    const close = document.createElement("span");
    close.className = "x";
    close.textContent = "✕";
    close.title = "Hide on this page";
    chip.append(label, close);

    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === close) {
        chip.remove();
        chips.delete(video);
        return;
      }
      // The page URL is what the site can actually resolve; a blob: or
      // media-fragment src is meaningless once it leaves this tab.
      const src = video.currentSrc || video.src || "";
      const usable = /^https?:/i.test(src) ? src : location.href;
      api.runtime.sendMessage({ type: "openOnSite", url: usable });
    });

    shadow.append(chip);
    chips.set(video, chip);
    return chip;
  }

  function sync() {
    if (!enabled) return;
    const videos = document.querySelectorAll("video");
    if (videos.length === 0 && chips.size === 0) return;
    makeHost();

    for (const video of videos) {
      if (!isWorthOffering(video)) continue;
      place(chipFor(video), video);
    }
    // Drop chips whose video has gone (single-page navigation, lazy players).
    for (const [video, chip] of chips) {
      if (!video.isConnected) {
        chip.remove();
        chips.delete(video);
      } else {
        place(chip, video);
      }
    }
  }

  function teardown() {
    for (const [, chip] of chips) chip.remove();
    chips.clear();
    host?.remove();
    host = null;
    shadow = null;
  }

  // Cheap and steady rather than clever: a rAF-throttled reposition covers
  // scrolling, resizing, players going fullscreen and layout shifts, without
  // measuring on every one of hundreds of scroll events.
  function safeSync() {
    try {
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

  // Ask whether this site is switched off before drawing anything.
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
    // Worker asleep; the defaults stand and the next sync will draw.
  }

  // The popup toggles a site without a reload.
  api.runtime.onMessage?.addListener((msg) => {
    if (msg?.type !== "siteEnabledChanged") return;
    enabled = msg.enabled !== false;
    if (enabled) schedule();
    else teardown();
  });
})();
