import type { CrawlReport, CrawledPage } from "./seo-crawler";
import type { SeoSnapshot } from "./seo-history";
import { TOOL_PAGES } from "./seo-pages";

// The SEO brain: a deterministic analysis engine that turns raw crawl data,
// score history and keyword targets into judgements a person can act on.
// It scores five categories, checks that every page still targets its
// keywords, reads the trend from history, and outputs a prioritised action
// plan sorted by expected impact.

export type CategoryScore = {
  key: "content" | "metadata" | "technical" | "performance" | "structure";
  label: string;
  score: number;
  detail: string;
};

export type ActionItem = {
  priority: number; // 1 = do first
  impact: "high" | "medium" | "low";
  title: string;
  detail: string;
  pages: string[];
};

export type KeywordCoverage = {
  path: string;
  keyword: string;
  inTitle: boolean;
  inDescription: boolean;
};

export type TrendVerdict = {
  direction: "up" | "down" | "flat";
  change: number;
  summary: string;
};

export type BrainAnalysis = {
  overall: number;
  verdict: string;
  categories: CategoryScore[];
  actions: ActionItem[];
  keywordGaps: KeywordCoverage[];
  keywordCoveragePct: number;
  trend: TrendVerdict;
  generatedAt: number;
};

// Which check labels feed which category. Labels come from seo-crawler.ts.
const CATEGORY_OF: Record<string, CategoryScore["key"]> = {
  "Missing title tag": "metadata",
  "Title length off": "metadata",
  "Duplicate title": "metadata",
  "Missing meta description": "metadata",
  "Meta description length off": "metadata",
  "Duplicate meta description": "metadata",
  "No Open Graph title": "metadata",
  "No Open Graph image": "metadata",
  "No Twitter card": "metadata",
  "No canonical tag": "technical",
  "Page did not return 200": "technical",
  "Missing lang attribute": "technical",
  "No viewport meta": "technical",
  "No structured data": "structure",
  "No H1": "structure",
  "Multiple H1s": "structure",
  "No H2 headings": "structure",
  "Few internal links": "structure",
  "Thin content": "content",
  "Images without alt text": "content",
  "Slow response": "performance",
};

const CATEGORY_LABELS: Record<CategoryScore["key"], string> = {
  content: "Content quality",
  metadata: "Titles & metadata",
  technical: "Technical health",
  performance: "Speed",
  structure: "Structure & schema",
};

// How much a single finding is expected to move rankings once fixed.
const IMPACT_OF: Record<string, ActionItem["impact"]> = {
  "Page did not return 200": "high",
  "Missing title tag": "high",
  "Duplicate title": "high",
  "Missing meta description": "high",
  "Duplicate meta description": "high",
  "Thin content": "high",
  "No H1": "high",
  "No canonical tag": "medium",
  "No structured data": "medium",
  "Title length off": "medium",
  "Meta description length off": "medium",
  "Slow response": "medium",
  "No Open Graph image": "medium",
  "Few internal links": "medium",
  "Images without alt text": "low",
  "No Open Graph title": "low",
  "No Twitter card": "low",
  "Multiple H1s": "low",
  "No H2 headings": "low",
  "Missing lang attribute": "low",
  "No viewport meta": "low",
};

const IMPACT_RANK: Record<ActionItem["impact"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function categoryScores(pages: CrawledPage[]): CategoryScore[] {
  const keys: CategoryScore["key"][] = [
    "content",
    "metadata",
    "technical",
    "performance",
    "structure",
  ];
  // Score each category per page, then average, so one sitewide finding
  // reads as a modest dent instead of wiping the category out.
  const totals = new Map<CategoryScore["key"], number>();
  const counts = new Map<CategoryScore["key"], number>();
  for (const p of pages) {
    const pageDeductions = new Map<CategoryScore["key"], number>();
    for (const c of p.checks) {
      if (c.severity === "good") continue;
      const cat = CATEGORY_OF[c.label] ?? "technical";
      const hit = c.severity === "error" ? 25 : 8;
      pageDeductions.set(cat, (pageDeductions.get(cat) ?? 0) + hit);
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    for (const key of keys) {
      const pageScore = Math.max(0, 100 - (pageDeductions.get(key) ?? 0));
      totals.set(key, (totals.get(key) ?? 0) + pageScore);
    }
  }
  return keys.map((key) => {
    const score = pages.length
      ? Math.round((totals.get(key) ?? 0) / pages.length)
      : 100;
    const n = counts.get(key) ?? 0;
    return {
      key,
      label: CATEGORY_LABELS[key],
      score,
      detail: n === 0 ? "No issues found." : `${n} finding${n === 1 ? "" : "s"} across the site.`,
    };
  });
}

function buildActions(pages: CrawledPage[]): ActionItem[] {
  // Group identical findings across pages into one action item.
  const grouped = new Map<string, { detail: string; impact: ActionItem["impact"]; pages: string[] }>();
  for (const p of pages) {
    for (const c of p.checks) {
      if (c.severity === "good") continue;
      const g = grouped.get(c.label);
      if (g) g.pages.push(p.path);
      else
        grouped.set(c.label, {
          detail: c.detail,
          impact: IMPACT_OF[c.label] ?? "medium",
          pages: [p.path],
        });
    }
  }
  const items = [...grouped.entries()].map(([title, g]) => ({
    title,
    detail: g.detail,
    impact: g.impact,
    pages: g.pages,
  }));
  // High impact first; within a tier, the finding hitting more pages wins.
  items.sort(
    (a, b) =>
      IMPACT_RANK[a.impact] - IMPACT_RANK[b.impact] || b.pages.length - a.pages.length,
  );
  return items.map((it, i) => ({ priority: i + 1, ...it }));
}

function keywordAnalysis(pages: CrawledPage[]): {
  gaps: KeywordCoverage[];
  coveragePct: number;
} {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const gaps: KeywordCoverage[] = [];
  let checked = 0;
  let covered = 0;
  for (const tool of TOOL_PAGES) {
    const page = byPath.get(`/${tool.slug}`);
    if (!page || !page.title) continue;
    // The primary keyword is the first in the list; that is the one the
    // page must visibly target.
    const keyword = tool.keywords[0];
    if (!keyword) continue;
    checked++;
    const title = (page.title ?? "").toLowerCase();
    const desc = (page.description ?? "").toLowerCase();
    const kw = keyword.toLowerCase();
    const inTitle = title.includes(kw);
    const inDescription = desc.includes(kw);
    if (inTitle && inDescription) covered++;
    else gaps.push({ path: page.path, keyword, inTitle, inDescription });
  }
  return {
    gaps,
    coveragePct: checked ? Math.round((covered / checked) * 100) : 100,
  };
}

function readTrend(history: SeoSnapshot[]): TrendVerdict {
  if (history.length < 2) {
    return { direction: "flat", change: 0, summary: "Not enough history yet. Trends appear after a few audits." };
  }
  const recent = history.slice(-5);
  const first = recent[0]!.score;
  const last = recent[recent.length - 1]!.score;
  const change = last - first;
  if (change > 1)
    return {
      direction: "up",
      change,
      summary: `Score climbed ${change} points over the last ${recent.length} audits. Keep going.`,
    };
  if (change < -1)
    return {
      direction: "down",
      change,
      summary: `Score dropped ${Math.abs(change)} points over the last ${recent.length} audits. Check the action plan.`,
    };
  return { direction: "flat", change: 0, summary: "Score is holding steady across recent audits." };
}

function verdictFor(overall: number, actions: ActionItem[], trend: TrendVerdict): string {
  const high = actions.filter((a) => a.impact === "high").length;
  if (high > 0)
    return `${high} high-impact issue${high === 1 ? "" : "s"} found. Fix these first; they hold rankings back the most.`;
  if (overall >= 95)
    return trend.direction === "down"
      ? "Site is technically strong but slipping. Review recent changes."
      : "Site is in top technical shape. Growth now comes from content and links, not fixes.";
  if (overall >= 80) return "Solid foundation with room to tighten. Work the action plan top to bottom.";
  return "The site needs technical work before it can rank well. Start at priority 1.";
}

export function analyze(report: CrawlReport, history: SeoSnapshot[]): BrainAnalysis {
  const categories = categoryScores(report.pages);
  const actions = buildActions(report.pages);
  const { gaps, coveragePct } = keywordAnalysis(report.pages);
  const trend = readTrend(history);
  return {
    overall: report.score,
    verdict: verdictFor(report.score, actions, trend),
    categories,
    actions,
    keywordGaps: gaps,
    keywordCoveragePct: coveragePct,
    trend,
    generatedAt: Date.now(),
  };
}
