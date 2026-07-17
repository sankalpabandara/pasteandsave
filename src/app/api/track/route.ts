import type { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

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

// Records an anonymous pageview. No cookies or IPs are stored, only the path
// and, for visits arriving from another site, the referring hostname.
export async function POST(request: NextRequest) {
  if (!rateLimit(`track:${clientIp(request)}`, 120, 60_000)) {
    return new Response(null, { status: 204 });
  }

  let body: { path?: string; ref?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const raw = typeof body.path === "string" ? body.path : "/";
  // Store the path only, capped, and strip any query string.
  const path = raw.split("?")[0]!.slice(0, 120);
  const ref = externalRefHost(body.ref, request.nextUrl.hostname.toLowerCase());

  void logEvent({ type: "pageview", path, ...(ref ? { ref } : {}) });
  return new Response(null, { status: 204 });
}
