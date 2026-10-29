import { coverOf, type BlogPost } from "@/lib/blog";

/**
 * A post's cover picture. A plain <img> on purpose: next/image would serve a
 * re-encoded copy from a /_next/image address with the description and
 * copyright stripped out of the file, and the original's address is the one
 * the sitemap and structured data name for search engines.
 */
export default function BlogCover({
  post,
  sizes,
  eager = false,
  className = "",
}: {
  post: BlogPost;
  /** Which width the picture shows at, so phones fetch the small copy. */
  sizes: string;
  /** For the cover at the top of a post, which is the page's largest paint. */
  eager?: boolean;
  className?: string;
}) {
  const cover = coverOf(post);
  if (!cover) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cover.src}
      srcSet={cover.small ? `${cover.small} 600w, ${cover.src} ${cover.width}w` : undefined}
      sizes={sizes}
      alt={cover.alt}
      width={cover.width}
      height={cover.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      className={`h-auto w-full ${className}`}
    />
  );
}
