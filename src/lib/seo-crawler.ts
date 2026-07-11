import { SITE_URL } from "./site";
import { TOOL_PAGES } from "./seo-pages";

// A self-crawler that fetches the site's own rendered pages and runs technical
// SEO checks on the real HTML, the way an Ahrefs/Semrush "Site Audit" does.
// It cannot see backlinks or keyword volumes (that is their paid crawl index);
// for search queries and rankings we use Google Search Console instead.

const CRAWL_BASE = (
  process.env.CRAWL_BASE_URL ||
  SITE_URL ||
  "http://localhost:3010"
).replace(/\/$/, "");

export type CheckSeverity = "good" | "warn" | "error";
export type PageCheck = { severity: CheckSeverity; label: string; detail: string };

export type CrawledPage = {
  path: string;
  status: number;
  loadMs: number;
  score: number;
  title: string | null;
  description: string | null;
  checks: PageCheck[];
};

export type CrawlReport = {
  score: number;
  pageCount: number;
  errors: number;
  warnings: number;
  pages: CrawledPage[];
  generatedAt: number;
};

const TITLE_MIN = 30;
const TITLE_MAX = 62;
const DESC_MIN = 110;
const DESC_MAX = 165;
const MIN_WORDS = 250;
const SLOW_MS = 1500;

function firstMatch(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? m[1].trim() : null;
}

function extractTitle(html: string): string | null {
  return firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
}

function extractMeta(html: string, name: string, attr: "name" | "property"): string | null {
  const a = firstMatch(
    html,
    new RegExp(`<meta[^>]+${attr}=["']${name}["'][^>]+content=["']([^"']*)["']`, "i"),
  );
  if (a) return a;
  return firstMatch(
    html,
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']${name}["']`, "i"),
  );
}

function countMatches(html: string, re: RegExp): number {
  return (html.match(re) || []).length;
}

function textWordCount(html: string): number {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped ? stripped.split(" ").length : 0;
}

function imagesMissingAlt(html: string): number {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  return imgs.filter((tag) => !/\balt\s*=/i.test(tag)).length;
}

function scoreFrom(checks: PageCheck[]): number {
  let score = 100;
  for (const c of checks) {
    if (c.severity === "error") score -= 20;
    else if (c.severity === "warn") score -= 8;
  }
  return Math.max(0, score);
}

async function auditPath(path: string): Promise<CrawledPage> {
  const url = `${CRAWL_BASE}${path}`;
  const start = Date.now();
  let status = 0;
  let html = "";
  try {
    const res = await fetch(url, {
      headers: { "user-agent": "SnapGrabSEOBot/1.0" },
      cache: "no-store",
    });
    status = res.status;
    html = await res.text();
  } catch {
    status = 0;
  }
  const loadMs = Date.now() - start;
  const checks: PageCheck[] = [];

  if (status !== 200) {
    checks.push({
      severity: "error",
      label: "Page did not return 200",
      detail: status === 0 ? "The request failed." : `Got HTTP ${status}.`,
    });
    return { path, status, loadMs, score: 0, title: null, description: null, checks };
  }

  // Title
  const title = extractTitle(html);
  if (!title) {
    checks.push({ severity: "error", label: "Missing title tag", detail: "No <title> found." });
  } else if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    checks.push({
      severity: "warn",
      label: "Title length off",
      detail: `${title.length} chars. Aim for ${TITLE_MIN}-${TITLE_MAX}.`,
    });
  } else {
    checks.push({ severity: "good", label: "Title is well formed", detail: `${title.length} chars.` });
  }

  // Meta description
  const desc = extractMeta(html, "description", "name");
  if (!desc) {
    checks.push({
      severity: "error",
      label: "Missing meta description",
      detail: "No description meta tag found.",
    });
  } else if (desc.length < DESC_MIN || desc.length > DESC_MAX) {
    checks.push({
      severity: "warn",
      label: "Meta description length off",
      detail: `${desc.length} chars. Aim for ${DESC_MIN}-${DESC_MAX}.`,
    });
  } else {
    checks.push({ severity: "good", label: "Meta description is good", detail: `${desc.length} chars.` });
  }

  // H1
  const h1s = countMatches(html, /<h1[\s>]/gi);
  if (h1s === 0) {
    checks.push({ severity: "error", label: "No H1", detail: "Every page needs one H1." });
  } else if (h1s > 1) {
    checks.push({ severity: "warn", label: "Multiple H1s", detail: `${h1s} H1 tags. Use one.` });
  }

  // Canonical
  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
    checks.push({
      severity: "warn",
      label: "No canonical tag",
      detail: "Add a canonical link to avoid duplicate-URL issues.",
    });
  }

  // Structured data
  if (countMatches(html, /application\/ld\+json/gi) === 0) {
    checks.push({
      severity: "warn",
      label: "No structured data",
      detail: "No JSON-LD found. Schema helps rich results.",
    });
  }

  // Open Graph
  if (!extractMeta(html, "og:title", "property")) {
    checks.push({
      severity: "warn",
      label: "No Open Graph title",
      detail: "og:title improves link previews on social.",
    });
  }

  // Images missing alt
  const noAlt = imagesMissingAlt(html);
  if (noAlt > 0) {
    checks.push({
      severity: "warn",
      label: "Images without alt text",
      detail: `${noAlt} <img> tag(s) missing alt.`,
    });
  }

  // Content depth
  const words = textWordCount(html);
  if (words < MIN_WORDS) {
    checks.push({
      severity: "warn",
      label: "Thin content",
      detail: `~${words} words of rendered text. Thin pages rank poorly.`,
    });
  } else {
    checks.push({ severity: "good", label: "Content depth is good", detail: `~${words} words.` });
  }

  // Load time
  if (loadMs > SLOW_MS) {
    checks.push({
      severity: "warn",
      label: "Slow response",
      detail: `${loadMs} ms to first byte+HTML. Aim for under ${SLOW_MS} ms.`,
    });
  }

  return {
    path,
    status,
    loadMs,
    score: scoreFrom(checks),
    title: title ?? null,
    description: desc ?? null,
    checks,
  };
}

export async function crawlSite(): Promise<CrawlReport> {
  const paths = ["/", ...TOOL_PAGES.map((p) => `/${p.slug}`), "/terms"];
  const pages = await Promise.all(paths.map(auditPath));

  // Flag pages that share a title or meta description with another page, then
  // rescore those pages to account for the added findings.
  const titleCounts = new Map<string, number>();
  const descCounts = new Map<string, number>();
  for (const p of pages) {
    if (p.title) titleCounts.set(p.title, (titleCounts.get(p.title) ?? 0) + 1);
    if (p.description) descCounts.set(p.description, (descCounts.get(p.description) ?? 0) + 1);
  }
  for (const p of pages) {
    if (p.title && (titleCounts.get(p.title) ?? 0) > 1) {
      p.checks.push({
        severity: "error",
        label: "Duplicate title",
        detail: "Another page uses the same title tag. Titles must be unique.",
      });
    }
    if (p.description && (descCounts.get(p.description) ?? 0) > 1) {
      p.checks.push({
        severity: "error",
        label: "Duplicate meta description",
        detail: "Another page uses the same description. Make each unique.",
      });
    }
    p.score = scoreFrom(p.checks);
  }

  const errors = pages.reduce(
    (n, p) => n + p.checks.filter((c) => c.severity === "error").length,
    0,
  );
  const warnings = pages.reduce(
    (n, p) => n + p.checks.filter((c) => c.severity === "warn").length,
    0,
  );
  const score = pages.length
    ? Math.round(pages.reduce((n, p) => n + p.score, 0) / pages.length)
    : 100;

  return { score, pageCount: pages.length, errors, warnings, pages, generatedAt: Date.now() };
}
