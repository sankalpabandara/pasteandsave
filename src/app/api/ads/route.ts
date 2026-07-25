import { readSettings } from "@/lib/ads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public on purpose. An ad unit id ends up in an iframe src and a GA
// measurement id ends up in a script tag, so neither is a secret. Serving them
// here keeps the pages themselves static and fast while still letting the
// admin panel change either one without a rebuild.
export async function GET() {
  const { units, gaId } = await readSettings();
  return Response.json(
    { units, gaId },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=600" } },
  );
}
