import type { NextRequest } from "next/server";
import { isAdmin } from "@/lib/admin-guard";
import { AD_SLOTS, type AdSlotKey } from "@/lib/ads";
import { isValidUnitId, readAdUnits, writeAdUnits, type AdUnits } from "@/lib/ads-store";

export const runtime = "nodejs";

export async function GET() {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  return Response.json({ units: await readAdUnits() });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { units?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const incoming = body.units ?? {};
  const units: AdUnits = {};
  const rejected: string[] = [];

  // Only known slots are accepted, and each value has to look like an A-ADS
  // unit id before it goes anywhere near an iframe src.
  for (const key of Object.keys(AD_SLOTS) as AdSlotKey[]) {
    const raw = incoming[key];
    if (raw === undefined || raw === null) continue;
    const value = String(raw).trim();
    if (!isValidUnitId(value)) {
      rejected.push(key);
      continue;
    }
    units[key] = value;
  }

  if (rejected.length > 0) {
    return Response.json(
      {
        error: `These need to be a plain unit number (digits only): ${rejected.join(", ")}`,
      },
      { status: 400 },
    );
  }

  try {
    await writeAdUnits(units);
  } catch {
    return Response.json({ error: "Couldn't save. Check disk permissions." }, { status: 500 });
  }

  return Response.json({ ok: true, units: await readAdUnits() });
}
