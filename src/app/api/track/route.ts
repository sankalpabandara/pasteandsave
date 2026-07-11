import type { NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logEvent } from "@/lib/analytics";

export const runtime = "nodejs";

// Records an anonymous pageview. No cookies or IPs are stored, only the path.
export async function POST(request: NextRequest) {
  if (!rateLimit(`track:${clientIp(request)}`, 120, 60_000)) {
    return new Response(null, { status: 204 });
  }

  let body: { path?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const raw = typeof body.path === "string" ? body.path : "/";
  // Store the path only, capped, and strip any query string.
  const path = raw.split("?")[0]!.slice(0, 120);

  void logEvent({ type: "pageview", path });
  return new Response(null, { status: 204 });
}
