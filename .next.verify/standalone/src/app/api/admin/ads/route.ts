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

/** The formats that are one pasted code each. */
const CODES = [
  { key: "socialBar", title: "Social Bar", needsKey: false },
  { key: "native", title: "Native Banner", needsKey: true },
  { key: "popunder", title: "Popunder", needsKey: false },
  { key: "interstitial", title: "Interstitial", needsKey: false },
  { key: "inPagePush", title: "In-Page Push", needsKey: false },
] as const;

/**
 * A pasted code for one of those formats. Undefined leaves the saved one
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
    codes?: Record<string, unknown>;
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

  // Each format's code is read on its own, and a bad one stops the save
  // rather than being quietly dropped: a code that was pasted and then
  // ignored looks exactly like a format that is not filling.
  const codes: Partial<Record<(typeof CODES)[number]["key"], string>> = {};
  for (const { key, title, needsKey } of CODES) {
    const read = readCode(body.codes?.[key], needsKey);
    if (read.error) {
      return Response.json({ error: `${title} code: ${read.error}.` }, { status: 400 });
    }
    if (read.value !== undefined) codes[key] = read.value;
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
    await writeSettings({ snippets, adsterra, ...codes, gaId });
  } catch {
    return Response.json({ error: "Couldn't save. Check disk permissions." }, { status: 500 });
  }

  return Response.json({ ok: true, ...(await readSettings()) });
}
