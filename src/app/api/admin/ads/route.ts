import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin-guard";
import { SESSION_TTL_MS } from "@/lib/auth";
import { ADMIN_MARKER_COOKIE, AD_SLOTS, type AdSlotKey } from "@/lib/ads";
import { cleanAdsterra, isValidGaId, readSettings, writeSettings } from "@/lib/ads-store";
import { adsterraKey, scriptSrcFromCode } from "@/lib/adsterra-code";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  // The admin panel calls this on every visit, so a session that started
  // before the marker cookie existed picks it up here, and the Social Bar
  // stays off for this admin from now on (see SocialBar).
  const store = await cookies();
  store.set(ADMIN_MARKER_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return Response.json(await readSettings());
}

/**
 * A pasted Social Bar or Native Banner code. Undefined leaves the saved one
 * alone, an empty string turns it off, anything else must hold a script
 * address (and, for the Native Banner, the key that names its container).
 */
function readCode(
  raw: unknown,
  needsKey: boolean,
): { value?: string; error?: string } {
  if (raw === undefined || raw === null) return {};
  const text = String(raw).trim();
  if (!text) return { value: "" };
  const src = scriptSrcFromCode(text);
  if (!src) return { error: "no script address found" };
  if (needsKey && !adsterraKey(src)) return { error: "no unit key found in the script address" };
  return { value: src };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    snippets?: Record<string, unknown>;
    adsterra?: unknown;
    socialBarCode?: unknown;
    nativeCode?: unknown;
    gaId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const gaId = String(body.gaId ?? "").trim();
  if (!isValidGaId(gaId)) {
    return Response.json(
      { error: "The analytics id should look like G-XXXXXXX, or be left empty." },
      { status: 400 },
    );
  }

  const social = readCode(body.socialBarCode, false);
  if (social.error) {
    return Response.json({ error: `Social Bar code: ${social.error}.` }, { status: 400 });
  }
  const native = readCode(body.nativeCode, true);
  if (native.error) {
    return Response.json({ error: `Native Banner code: ${native.error}.` }, { status: 400 });
  }

  // Snippets are taken as written. Every network formats its embed
  // differently, so a shape check would reject legitimate code; the admin
  // session is the gate here.
  const snippets: Record<string, string> = {};
  for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
    const raw = body.snippets?.[key];
    if (typeof raw === "string" && raw.trim()) snippets[key] = raw.trim();
  }

  // Omitted entirely when the panel did not send it, so writeSettings keeps
  // what is already on disk. An empty object would mean "remove them all".
  const adsterra =
    body.adsterra === undefined ? undefined : cleanAdsterra(body.adsterra);

  try {
    await writeSettings({ snippets, adsterra, socialBar: social.value, native: native.value, gaId });
  } catch {
    return Response.json({ error: "Couldn't save. Check disk permissions." }, { status: 500 });
  }

  return Response.json({ ok: true, ...(await readSettings()) });
}
