import { getIndexNowKey } from "@/lib/seo-indexnow";

export const runtime = "nodejs";

// Search engines verify IndexNow ownership by fetching the key location we
// give them and comparing its body to the key. Serve the key only at its own
// path so nothing else about the site is exposed.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const real = getIndexNowKey();
  if (key !== real) return new Response("Not found", { status: 404 });
  return new Response(real, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
