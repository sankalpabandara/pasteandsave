import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { crawlSite, type CrawlReport } from "./seo-crawler";

// Stores the latest full crawl report plus a rolling history of weekly summary
// snapshots, so the admin panel can show current issues and trends over time.

const DATA_DIR = path.join(process.cwd(), "data");
const LATEST_FILE = path.join(DATA_DIR, "seo-latest.json");
const HISTORY_FILE = path.join(DATA_DIR, "seo-history.json");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SNAPSHOTS = 52;

export type SeoSnapshot = {
  t: number;
  score: number;
  errors: number;
  warnings: number;
  pageCount: number;
};

let running = false;

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export async function readLatest(): Promise<CrawlReport | null> {
  try {
    return JSON.parse(await fsp.readFile(LATEST_FILE, "utf8")) as CrawlReport;
  } catch {
    return null;
  }
}

export async function readHistory(): Promise<SeoSnapshot[]> {
  try {
    const arr = JSON.parse(await fsp.readFile(HISTORY_FILE, "utf8"));
    return Array.isArray(arr) ? (arr as SeoSnapshot[]) : [];
  } catch {
    return [];
  }
}

async function save(report: CrawlReport) {
  ensureDir();
  await fsp.writeFile(LATEST_FILE, JSON.stringify(report), "utf8");
  const history = await readHistory();
  history.push({
    t: report.generatedAt,
    score: report.score,
    errors: report.errors,
    warnings: report.warnings,
    pageCount: report.pageCount,
  });
  const trimmed = history.slice(-MAX_SNAPSHOTS);
  await fsp.writeFile(HISTORY_FILE, JSON.stringify(trimmed), "utf8");
}

/** Runs a fresh crawl and saves it. Guards against concurrent runs. */
export async function runAudit(): Promise<CrawlReport> {
  if (running) {
    const latest = await readLatest();
    if (latest) return latest;
  }
  running = true;
  try {
    const report = await crawlSite();
    await save(report);
    return report;
  } finally {
    running = false;
  }
}

/** Runs an audit only if the newest snapshot is missing or over a week old. */
export async function maybeRunWeekly(): Promise<void> {
  const history = await readHistory();
  const last = history[history.length - 1];
  if (!last || Date.now() - last.t > WEEK_MS) {
    await runAudit();
  }
}
