import { readAdUnits } from "@/lib/ads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public on purpose: an ad unit id is what ends up in an iframe src on every
// page, so it is not a secret. Serving it here keeps the pages themselves
// static and fast while still letting the admin panel change ads live.
export async function GET() {
  return Response.json(
    { units: await readAdUnits() },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } },
  );
}
