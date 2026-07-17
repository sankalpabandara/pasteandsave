import fsp from "node:fs/promises";
import path from "node:path";
import type { CrawlReport } from "./seo-crawler";
import { readLatest, runAudit } from "./seo-history";
import { submitToIndexNow } from "./seo-indexnow";

// The autopilot is the site's SEO heartbeat. Once the server is up it keeps
// working on its own: every cycle it re-audits all pages, writes a report of
// what changed since the previous audit, and pushes the URL list to IndexNow
// so search engines hear about updates immediately. No button needs pressing.

const DATA_DIR = path.join(process.cwd(), "data");
const REPORTS_FILE = path.join(DATA_DIR, "seo-reports.json");
const STATE_FILE = path.join(DATA_DIR, "seo-autopilot.json");
const MAX_REPORTS = 20;
const TICK_MS = 60 * 60 * 1000; // check hourly whether a cycle is due

const CYCLE_HOURS = (() => {
  const n = Number(process.env.SEO_AUTOPILOT_HOURS);
  return Number.isFinite(n) && n >= 1 ? n : 24;
})();

export type AutoReport = {
  t: number;
  score: number;
  deltaScore: number | null;
  errors: number;
  warnings: number;
  pageCount: number;
  newIssues: string[];
  resolvedIssues: string[];
  indexing: string;
  summary: string;
};

export type AutopilotState = {
  lastCycleAt: number;
  nextDueAt: number;
  cycleHours: number;
};

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(file, JSON.stringify(value), "utf8");
  } catch {
    // best effort
  }
}

export async function readAutoReports(): Promise<AutoReport[]> {
  return (await readJson<AutoReport[]>(REPORTS_FILE)) ?? [];
}

export async function readAutopilotState(): Promise<AutopilotState | null> {
  return readJson<AutopilotState>(STATE_FILE);
}

/** Unique "path :: issue" strings for every non-good finding in a report. */
function issueSet(report: CrawlReport): Set<string> {
  const set = new Set<string>();
  for (const p of report.pages) {
    for (const c of p.checks) {
      if (c.severity !== "good") set.add(`${p.path} :: ${c.label}`);
    }
  }
  return set;
}

function summarize(report: CrawlReport, deltaScore: number | null, newIssues: string[], resolved: string[]): string {
  const parts: string[] = [];
  if (deltaScore === null) parts.push(`First automated audit. Score ${report.score}.`);
  else if (deltaScore > 0) parts.push(`Score up ${deltaScore} points to ${report.score}.`);
  else if (deltaScore < 0) parts.push(`Score down ${Math.abs(deltaScore)} points to ${report.score}.`);
  else parts.push(`Score steady at ${report.score}.`);
  if (newIssues.length) parts.push(`${newIssues.length} new issue${newIssues.length === 1 ? "" : "s"}.`);
  if (resolved.length) parts.push(`${resolved.length} issue${resolved.length === 1 ? "" : "s"} resolved.`);
  if (!newIssues.length && !resolved.length && deltaScore !== null) parts.push("Nothing changed.");
  return parts.join(" ");
}

/** One full heartbeat: audit, report the diff, push URLs to search engines. */
export async function runAutopilotCycle(): Promise<AutoReport> {
  const previous = await readLatest();
  const report = await runAudit();

  const before = previous ? issueSet(previous) : null;
  const after = issueSet(report);
  const newIssues = before ? [...after].filter((i) => !before.has(i)) : [];
  const resolvedIssues = before ? [...before].filter((i) => !after.has(i)) : [];
  const deltaScore = previous ? report.score - previous.score : null;

  const indexing = await submitToIndexNow();

  const auto: AutoReport = {
    t: Date.now(),
    score: report.score,
    deltaScore,
    errors: report.errors,
    warnings: report.warnings,
    pageCount: report.pageCount,
    newIssues: newIssues.slice(0, 30),
    resolvedIssues: resolvedIssues.slice(0, 30),
    indexing: indexing.lastDetail,
    summary: summarize(report, deltaScore, newIssues, resolvedIssues),
  };

  const reports = await readAutoReports();
  reports.push(auto);
  await writeJson(REPORTS_FILE, reports.slice(-MAX_REPORTS));
  await writeJson(STATE_FILE, {
    lastCycleAt: auto.t,
    nextDueAt: auto.t + CYCLE_HOURS * 60 * 60 * 1000,
    cycleHours: CYCLE_HOURS,
  } satisfies AutopilotState);

  return auto;
}

// One heartbeat per server process, surviving hot reloads in dev.
const FLAG = Symbol.for("pasteandsave.seo-autopilot");

export function startAutopilot(): void {
  const g = globalThis as { [FLAG]?: boolean };
  if (g[FLAG]) return;
  g[FLAG] = true;

  const maybeCycle = async () => {
    try {
      const state = await readAutopilotState();
      if (!state || Date.now() >= state.nextDueAt) {
        await runAutopilotCycle();
      }
    } catch {
      // Never let the heartbeat take the server down; it tries again next tick.
    }
  };

  // First check shortly after boot (lets the server finish warming up),
  // then hourly. unref() keeps the timers from blocking a clean shutdown.
  const boot = setTimeout(maybeCycle, 90 * 1000);
  const tick = setInterval(maybeCycle, TICK_MS);
  boot.unref?.();
  tick.unref?.();
}
