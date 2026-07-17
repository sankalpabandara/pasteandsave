// The tool pages define their own openGraph metadata, which replaces the
// inherited object and would drop the root share image. Re-exporting the
// same generated card here gives every tool page an og:image again.
export { default, alt, size, contentType } from "../opengraph-image";
