import { Marked } from "marked";

// Turns a post's Markdown into HTML. The posts are our own files, not visitor
// input, so the HTML is used as it comes; the only additions are anchors on
// headings (for the table of contents), new tabs for links to other sites,
// and a scrolling wrapper so a wide table never widens the page on a phone.

const md = new Marked({ gfm: true });

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

export function renderMarkdown(source: string): string {
  return (md.parse(source, { async: false }) as string)
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

/** Minutes to read at an unhurried 200 words a minute. */
export function readingMinutes(source: string): number {
  const words = source.replace(/\]\([^)]*\)/g, "]").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
