import type { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";
import { isShareChannel } from "@/lib/share";

export const runtime = "nodejs";

let ownHost = "";
try {
  ownHost = new URL(SITE_URL).hostname.toLowerCase();
} catch {
  // leave empty; every referrer then counts as external
}

/** Hostname of an external referrer, or undefined for same-site/invalid ones. */
function externalRefHost(raw: unknown, requestHost: string | null): string | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    if (!host || host === ownHost || host === requestHost) return undefined;
    return host.slice(0, 100);
  } catch {
    return undefined;
  }
}

// Records an anonymous pageview, or a press of a share button. No cookies or
// IPs are stored, only the path and, for visits arriving from another site,
// the referring hostname, or the channel a shared address was sent on.
export async function POST(request: NextRequest) {
  if (!rateLimit(`track:${clientIp(request)}`, 120, 60_000)) {
    return new Response(null, { status: 204 });
  }

  let body: { path?: string; ref?: string; from?: string; share?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  // Only the channel names the share row uses are kept, never free text.
  if (body.share !== undefined) {
    if (isShareChannel(body.share)) void logEvent({ type: "share", via: body.share });
    return new Response(null, { status: 204 });
  }

  const raw = typeof body.path === "string" ? body.path : "/";
  // Store the path only, capped, and strip any query string.
  const path = raw.split("?")[0]!.slice(0, 120);
  const ref = externalRefHost(body.ref, request.nextUrl.hostname.toLowerCase());
  const from = isShareChannel(body.from) ? body.from : undefined;

  void logEvent({ type: "pageview", path, ...(ref ? { ref } : {}), ...(from ? { from } : {}) });
  return new Response(null, { status: 204 });
}
