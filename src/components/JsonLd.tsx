export default function JsonLd({ data }: { data: object }) {
  // Escape "<" so a value can never break out of the <script> element, even
  // though the data here is developer-controlled. Defense in depth.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
