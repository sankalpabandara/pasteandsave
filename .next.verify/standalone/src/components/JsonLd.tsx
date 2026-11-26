import { headers } from "next/headers";

export default async function JsonLd({ data }: { data: object }) {
  // Escape "<" so a value can never break out of the <script> element, even
  // though the data here is developer-controlled. Defense in depth.
  const json = JSON.stringify(data).replace(/</g, "\u003c");
  // Carries the request nonce like any other inline script. Search engines
  // read this block, so a policy that blocked it would cost the rich results
  // it exists to produce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
