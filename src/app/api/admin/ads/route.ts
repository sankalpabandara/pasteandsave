import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { AD_SLOTS, type AdSlotKey } from "@/lib/ads";
import { cleanAdsterra, isValidGaId, readSettings, writeSettings } from "@/lib/ads-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  return Response.json(await readSettings());
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: {
    snippets?: Record<string, unknown>;
    adsterra?: unknown;
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
    await writeSettings({ snippets, adsterra, gaId });
  } catch {
    return Response.json({ error: "Couldn't save. Check disk permissions." }, { status: 500 });
  }

  return Response.json({ ok: true, ...(await readSettings()) });
}
