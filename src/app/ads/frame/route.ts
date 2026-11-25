import type { NextRequest } from "next/server";
import { AD_SLOTS, adsterraDimensions, isAdsterraSize } from "@/lib/ads";
import { readSettings } from "@/lib/ads-store";

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

  // The slot name is only checked, never used: the size alone picks the code.
  // Checking it still keeps a stray URL from serving banners.
  if (!Object.prototype.hasOwnProperty.call(AD_SLOTS, slot) || !isAdsterraSize(size)) {
    return htmlDocument("", nonce);
  }

  const settings = await readSettings();
  const unit = settings.adsterra[size];

  // No code of this size: an empty document. There used to be an A-ADS banner
  // here as a stand in, and a timer that swapped it in when Adsterra was slow.
  // A-ADS paid too little to keep, and the swap could also leave both banners
  // in one slot when Adsterra answered after the timer had given up on it.
  if (!unit) {
    return htmlDocument("", nonce);
  }

  const { width, height } = adsterraDimensions(size);

  const body = `
<script nonce="${attr(nonce)}">
atOptions = { key: ${jsString(unit.key)}, format: "iframe", height: ${height}, width: ${width}, params: {} };
</script>
<script nonce="${attr(nonce)}" data-cfasync="false" src="${attr(unit.src)}"></script>`;

  return htmlDocument(body, nonce);
}
