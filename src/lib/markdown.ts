import { Marked } from "marked";

// Turns a post's Markdown into HTML. The posts are our own files, not visitor
// input, so the HTML is used as it comes; the only additions are anchors on
// headings (for the table of contents), new tabs for links to other sites,
// a scrolling wrapper so a wide table never widens the page on a phone, and
// figures for images.

const md = new Marked({ gfm: true });

type ImageSizes = Record<string, { width: number; height: number; alt: string }>;

const unescape = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/**
 * An image on a line of its own, ![](src "Caption"), becomes a figure: the
 * alt text and size come from the image list (so the alt is written once,
 * the same as the description inside the file), the caption shows under
 * it, and the size stops the page jumping while it loads.
 */
function figure(src: string, alt: string, title: string | undefined, images: ImageSizes): string {
  const known = images[src];
  const text = known?.alt ?? alt;
  const size = known ? ` width="${known.width}" height="${known.height}"` : "";
  const caption = title ? `<figcaption>${title}</figcaption>` : "";
  return `<figure><img src="${src}" alt="${attr(unescape(text))}"${size} loading="lazy" decoding="async">${caption}</figure>`;
}

/** "Why a link won't work" becomes "why-a-link-wont-work". */
export function headingId(text: string): string {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z0-9#]+;/gi, "")
    .replace(/[*_`[\]()]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function renderMarkdown(source: string, images: ImageSizes = {}): string {
  return (md.parse(source, { async: false }) as string)
    .replace(
      /<p><img src="([^"]+)" alt="([^"]*)"(?: title="([^"]*)")?\s*\/?><\/p>/g,
      (_all, src: string, alt: string, title: string | undefined) => figure(src, alt, title, images),
    )
    .replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_all, level: string, inner: string) => {
      return `<h${level} id="${headingId(inner)}">${inner}</h${level}>`;
    })
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"')
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

/** The ## sections of a post, for its table of contents. */
export function tableOfContents(source: string): { id: string; text: string }[] {
  return source
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => {
      const text = line
        .slice(3)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim();
      return { id: headingId(text), text };
    });
}

/** The images a post shows, in order, with their captions. */
export function imagesIn(source: string): { src: string; caption: string }[] {
  return [...source.matchAll(/^!\[[^\]]*\]\((\S+)(?: "([^"]*)")?\)\s*$/gm)].map((m) => ({
    src: m[1],
    caption: m[2] ?? "",
  }));
}

/** Minutes to read at an unhurried 200 words a minute. */
export function readingMinutes(source: string): number {
  const words = source
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/\]\([^)]*\)/g, "]")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
