import { readSettings } from "@/lib/ads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public on purpose. An ad unit id ends up in an iframe src and a GA
// measurement id ends up in a script tag, so neither is a secret. Serving them
// here keeps the pages themselves static and fast while still letting the
// admin panel change either one without a rebuild.
export async function GET() {
  const { units, snippets, gaId } = await readSettings();
  // Deliberately uncached. This was served with max-age and
  // stale-while-revalidate, which meant a browser kept handing back the
  // previous answer for several minutes: save an ad in the admin panel, load
  // the site, and still get the old empty config with no way to tell why.
  // The payload is a couple of hundred bytes once per page load, so freshness
  // is worth far more than the saving.
  return Response.json(
    { units, snippets, gaId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
