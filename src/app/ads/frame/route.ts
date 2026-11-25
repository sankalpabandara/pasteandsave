import type { NextRequest } from "next/server";
import {
  AD_SLOTS,
  adsterraDimensions,
  isAdsterraSize,
  type AdPlacement,
  type AdSlotKey,
} from "@/lib/ads";
import { isValidUnitId, readSettings } from "@/lib/ads-store";

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

function htmlDocument(body: string, nonce: string): Response {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex">
<style nonce="${attr(nonce)}">
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
body{display:flex;align-items:center;justify-content:center;height:100vh}
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

export async function GET(request: NextRequest) {
  // Set on the request by proxy.ts, which also sets the policy that enforces
  // it. Without the nonce the scripts below are blocked and the slot is blank.
  const nonce = request.headers.get("x-nonce") ?? "";

  const params = request.nextUrl.searchParams;
  const slot = params.get("slot") ?? "";
  const size = params.get("size") ?? "";

  if (!Object.prototype.hasOwnProperty.call(AD_SLOTS, slot) || !isAdsterraSize(size)) {
    return htmlDocument("", nonce);
  }

  const settings = await readSettings();
  const unit = settings.adsterra[size];

  // The A-ADS unit this slot would otherwise have shown, used when Adsterra
  // has nothing. A brand new Adsterra unit serves an empty response for a
  // while after it is created, and an empty slot earns nothing at all.
  // Typed as the shared shape, the way the component does: `satisfies` gives
  // each entry its own literal type, so the optional fields are missing from
  // the slots that omit them.
  const cfg: AdPlacement = AD_SLOTS[slot as AdSlotKey];
  const shared = cfg.shareWith
    ? (settings.units[cfg.shareWith as AdSlotKey] ?? "")
    : "";
  const fallbackId = (settings.units[slot as AdSlotKey] || shared || "").trim();
  const fallback = isValidUnitId(fallbackId) ? fallbackId : "";

  const fallbackTag = fallback
    ? `<iframe title="Advertisement" data-aa="${attr(fallback)}" src="https://acceptable.a-ads.com/${attr(fallback)}/?size=Adaptive" referrerpolicy="no-referrer" style="width:100%;height:100%"></iframe>`
    : "";

  if (!unit) {
    return htmlDocument(fallbackTag, nonce);
  }

  const { width, height } = adsterraDimensions(size);

  // The fallback is written by script rather than sitting in the markup, so
  // the two never load at once. Two banners loading in one slot would bill
  // both networks for an impression only one of them got to show.
  const body = `
<script nonce="${attr(nonce)}">
atOptions = { key: ${jsString(unit.key)}, format: "iframe", height: ${height}, width: ${width}, params: {} };
</script>
<script nonce="${attr(nonce)}" data-cfasync="false" src="${attr(unit.src)}"></script>
<script nonce="${attr(nonce)}">
(function () {
  var fallback = ${jsString(fallbackTag)};
  if (!fallback) return;
  var waited = 0;
  // Adsterra draws into this document when it has something to show. Polling
  // for that is the only signal available: the script is cross-origin, so it
  // reports nothing back, and it answers 200 with an empty body when it has
  // no banner, which is indistinguishable from a slow one until time passes.
  var timer = setInterval(function () {
    waited += 250;
    var drawn = document.querySelector("iframe, img, ins, a");
    if (drawn) { clearInterval(timer); return; }
    if (waited >= 4000) {
      clearInterval(timer);
      document.body.insertAdjacentHTML("beforeend", fallback);
    }
  }, 250);
})();
</script>`;

  return htmlDocument(body, nonce);
}
