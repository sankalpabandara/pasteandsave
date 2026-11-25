import { readSettings } from "@/lib/ads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public on purpose. A GA measurement id ends up in a script tag and a pasted
// embed ends up in the page, so neither is a secret. Serving them here keeps
// the pages themselves static and fast while still letting the admin panel
// change either one without a rebuild.
export async function GET() {
  const { snippets, adsterra, socialBar, native, gaId } = await readSettings();
  // Only which sizes exist, never the keys. A slot needs to know whether a
  // banner of its size can be asked for; the key itself belongs in the frame
  // route, which is the only place that turns it into a script tag. The same
  // goes for the Native Banner. The Social Bar address is sent as it is,
  // because the page itself loads that script.
  const adsterraSizes = Object.keys(adsterra);
  // Deliberately uncached. This was served with max-age and
  // stale-while-revalidate, which meant a browser kept handing back the
  // previous answer for several minutes: save an ad in the admin panel, load
  // the site, and still get the old empty config with no way to tell why.
  // The payload is a couple of hundred bytes once per page load, so freshness
  // is worth far more than the saving.
  return Response.json(
    { snippets, adsterraSizes, socialBar, native: Boolean(native), gaId },
    { headers: { "Cache-Control": "no-store" } },
  );
}
