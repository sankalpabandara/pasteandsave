import type { NextRequest } from "next/server";
import {
  AD_SLOTS,
  adsterraDimensions,
  isAdsterraSize,
  isNativeSlot,
  type AdPlacement,
  type AdSlotKey,
} from "@/lib/ads";
import { readSettings } from "@/lib/ads-store";
import { adsterraKey } from "@/lib/adsterra-code";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One Adsterra banner, in a document of its own.
//
// Adsterra's embed is two script tags: the first assigns a global called
// `atOptions` holding the size and key, the second loads a script that reads
// that global. Both run at whatever moment the browser gets to them, so two
// banners on one page race: the second assignment lands before the first
// script has read its own, and both slots end up asking for the same size, or
// one of them asks for nothing at all. The home page has three banners, so
// this is not a corner case.
//
// Giving each banner its own document gives each one its own `atOptions`,
// and the race disappears. It also keeps a network's script out of the page
// the site's own code runs in, which is worth having on its own.
//
// Nothing here comes from the query string except a slot name and a size,
// both checked against the tables in lib/ads. The key and the script URL are
// read from the settings file, where they were already validated.

/** Values that go into the page as JavaScript string literals. */
function jsString(value: string): string {
  return JSON.stringify(value);
}

/** Values that go into an HTML attribute. */
function attr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// A banner is centred in a box of its own size. A native widget is a grid that
// sets its own height, so its document flows normally and reports that height.
const BANNER_CSS = "body{display:flex;align-items:center;justify-content:center;height:100vh}";
const NATIVE_CSS = "body{padding:8px 0}";

// The frame is sandboxed without allow-same-origin, so the browser throws on
// document.cookie and on storage. Adsterra's scripts read both and die on that
// error, leaving the slot empty. These stand-ins keep values in memory for this
// one document, which is all an ad's own frequency cap needs.
const SANDBOX_SHIM = `(function () {
  var jar = "";
  try {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: function () { return jar; },
      set: function (v) {
        var pair = String(v).split(";")[0];
        var name = pair.split("=")[0];
        jar = jar.split("; ").filter(function (c) { return c && c.split("=")[0] !== name; }).concat(pair).join("; ");
      }
    });
  } catch (e) {}
  function mem() {
    var s = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null; },
      setItem: function (k, v) { s[k] = String(v); },
      removeItem: function (k) { delete s[k]; },
      clear: function () { s = {}; },
      key: function (i) { return Object.keys(s)[i] || null; },
      get length() { return Object.keys(s).length; }
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (n) {
    try { window[n].length; } catch (e) {
      try { Object.defineProperty(window, n, { configurable: true, value: mem() }); } catch (e2) {}
    }
  });
})();`;

function htmlDocument(body: string, nonce: string, layout = BANNER_CSS): Response {
  const shim = body ? `<script nonce="${attr(nonce)}">${SANDBOX_SHIM}</script>` : "";
  body = shim + body;
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style nonce="${attr(nonce)}">
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
${layout}
iframe,img{border:0;display:block;max-width:100%}
</style></head><body>${body}</body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // The banner inside changes per request and must never be shared
      // between visitors: a cached ad is an impression nobody is paid for.
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

/**
 * Tells the page how tall this frame's contents came out, so the box around it
 * can grow to fit instead of cutting the ad off. Only once something has been
 * drawn: reporting the empty document would shrink the box and grow it again a
 * moment later. The frame has no origin of its own to check, so the page
 * accepts the message only from this frame's own window (see AdSlot).
 */
function heightReporter(containerId: string): string {
  return `
(function () {
  var box = document.getElementById(${jsString(containerId)});
  var last = 0;
  function send() {
    var drawn = box ? box.offsetHeight : 0;
    if (!drawn) return;
    var h = Math.ceil(document.body.scrollHeight);
    if (h !== last) { last = h; parent.postMessage({ type: "pas-ad-height", h: h }, "*"); }
  }
  if (window.ResizeObserver && box) new ResizeObserver(send).observe(box);
  var n = 0, t = setInterval(function () { send(); if (++n > 40) clearInterval(t); }, 500);
})();`;
}

/**
 * Says so when the frame ended up with nothing in it.
 *
 * The network fills a banner about one time in fifty here, and a slot that
 * does not fill used to leave a grey box with the word Advertisement over
 * empty space. That is worse than no slot: it takes room on the page, it
 * tells a visitor an ad failed, and it earns nothing either way. So the
 * frame waits for the banner, then for the stand in where there is one, and
 * if neither drew anything it tells the page, which takes the box away.
 */
function emptyReporter(): string {
  return `
(function () {
  function drawn() { return !!document.querySelector("iframe, img, ins"); }
  var waited = 0;
  var timer = setInterval(function () {
    waited += 500;
    if (drawn()) { clearInterval(timer); return; }
    if (waited >= 6000) {
      clearInterval(timer);
      parent.postMessage({ type: "pas-ad-empty" }, "*");
    }
  }, 500);
})();`;
}

export async function GET(request: NextRequest) {
  // Set on the request by proxy.ts, which also sets the policy that enforces
  // it. Without the nonce the scripts below are blocked and the slot is blank.
  const nonce = request.headers.get("x-nonce") ?? "";

  const params = request.nextUrl.searchParams;
  const slot = params.get("slot") ?? "";
  const size = params.get("size") ?? "";

  if (params.get("kind") === "native") {
    return nativeDocument(slot, nonce);
  }

  // The slot name is only checked, never used: the size alone picks the code.
  // Checking it still keeps a stray URL from serving banners.
  if (!Object.prototype.hasOwnProperty.call(AD_SLOTS, slot) || !isAdsterraSize(size)) {
    return htmlDocument("", nonce);
  }

  const settings = await readSettings();
  const unit = settings.adsterra[size];
  // The Native Banner, as a stand in for a banner that does not fill.
  //
  // Measured over two days: 234 banner frames were loaded and Adsterra served
  // a banner into 9 of them. The Native Banner filled nearly every time it was
  // asked. So a box that would otherwise sit empty asks for native instead,
  // which is the difference between an impression and nothing at all.
  //
  // This is not the old A-ADS stand in, which could leave two banners in one
  // slot when the network answered after the timer had given up. Nothing is
  // added here until the network has had its chance and drawn nothing, and
  // once the native code is in, the banner has already lost its turn.
  //
  // Not in a box that cannot grow: the phone bar and the side rails are
  // pinned to an edge at exactly the banner's size, so a native grid in a
  // 50px bar would be clipped to a sliver.
  const placement: AdPlacement = AD_SLOTS[slot as AdSlotKey];
  const nativeSrc = placement.fixedBox ? "" : settings.native;
  const nativeKey = nativeSrc ? adsterraKey(nativeSrc) : null;

  // No code of this size: an empty document. There used to be an A-ADS banner
  // here as a stand in, and a timer that swapped it in when Adsterra was slow.
  // A-ADS paid too little to keep, and the swap could also leave both banners
  // in one slot when Adsterra answered after the timer had given up on it.
  if (!unit) {
    return htmlDocument("", nonce);
  }

  const { width, height } = adsterraDimensions(size);

  const fallback =
    nativeSrc && nativeKey
      ? `
<script nonce="${attr(nonce)}">
(function () {
  var waited = 0;
  // What the network draws when it has something: an iframe, a picture, or
  // the <ins> its own widgets use. The script tag itself proves nothing.
  function drawn() { return !!document.querySelector("iframe, img, ins"); }
  var timer = setInterval(function () {
    waited += 250;
    if (drawn()) { clearInterval(timer); return; }
    if (waited < 2500) return;
    clearInterval(timer);
    // Nothing came. Ask for the native widget in the same box.
    var box = document.createElement("div");
    box.id = ${jsString(`container-${nativeKey}`)};
    document.body.appendChild(box);
    // Built as an element, not written as markup: a script assigned through
    // innerHTML is parsed but never run. This one carries no nonce and does
    // not need one, because a script added by a script the nonce vouched for
    // is already trusted under strict-dynamic.
    var script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = ${jsString(nativeSrc)};
    document.body.appendChild(script);
    document.body.style.display = "block";
    ${heightReporter(`container-${nativeKey}`)}
  }, 250);
})();
</script>`
      : "";

  const body = `
<script nonce="${attr(nonce)}">
atOptions = { key: ${jsString(unit.key)}, format: "iframe", height: ${height}, width: ${width}, params: {} };
</script>
<script nonce="${attr(nonce)}" data-cfasync="false" src="${attr(unit.src)}"></script>${fallback}
<script nonce="${attr(nonce)}">${emptyReporter()}</script>`;

  return htmlDocument(body, nonce);
}

// The Adsterra Native Banner: a script and the div it fills, named after the
// unit's key. Then a small script that tells the page how tall the widget came
// out, so the box around the frame can grow to fit instead of cutting it off.
// The frame has no origin of its own to check, so the page only accepts the
// message from this frame's own window (see NativeSlot).
async function nativeDocument(slot: string, nonce: string): Promise<Response> {
  if (!isNativeSlot(slot)) return htmlDocument("", nonce, NATIVE_CSS);
  const { native } = await readSettings();
  const key = native ? adsterraKey(native) : null;
  if (!native || !key) return htmlDocument("", nonce, NATIVE_CSS);

  const body = `
<script nonce="${attr(nonce)}" async data-cfasync="false" src="${attr(native)}"></script>
<div id="container-${attr(key)}"></div>
<script nonce="${attr(nonce)}">${heightReporter(`container-${key}`)}</script>
<script nonce="${attr(nonce)}">${emptyReporter()}</script>`;

  return htmlDocument(body, nonce, NATIVE_CSS);
}
