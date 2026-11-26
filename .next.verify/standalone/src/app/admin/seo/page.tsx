import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { maybeRunWeekly, readLatest, readHistory } from "@/lib/seo-history";
import type { CheckSeverity } from "@/lib/seo-crawler";
import { getSearchConsoleSummary } from "@/lib/search-console";
import { analyze } from "@/lib/seo-brain";
import { readAutoReports, readAutopilotState } from "@/lib/seo-autopilot";
import { readIndexNowState } from "@/lib/seo-indexnow";
import { getBacklinks } from "@/lib/analytics";
import RunAuditButton from "./RunAuditButton";

export const metadata: Metadata = {
  title: "SEO audit",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const dot: Record<CheckSeverity, string> = {
  good: "bg-emerald-500",
  warn: "bg-amber-500",
  error: "bg-red-500",
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default async function SeoAuditPage() {
  await requireAdmin();
  // Auto-run the weekly crawl if a fresh snapshot is due, then load results.
  await maybeRunWeekly();
  const [report, history, gsc, autoReports, autopilot, indexnow, backlinks] =
    await Promise.all([
      readLatest(),
      readHistory(),
      getSearchConsoleSummary(),
      readAutoReports(),
      readAutopilotState(),
      readIndexNowState(),
      getBacklinks(),
    ]);

  const brain = report ? analyze(report, history) : null;
  const latestAuto = autoReports[autoReports.length - 1] ?? null;
  const maxScore = 100;

  const impactColor: Record<string, string> = {
    high: "bg-red-500/15 text-red-700 dark:text-red-300",
    medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    low: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
            SEO audit
          </h1>
          <Link
            href="/admin"
            className="text-sm text-violet-600 hover:underline dark:text-violet-400"
          >
            Back to dashboard
          </Link>
        </div>
        <RunAuditButton />
      </div>

      {!report ? (
        <p className="glass glass-hairline mt-6 rounded-2xl p-5 text-sm text-neutral-600 dark:text-neutral-400">
          No audit has run yet. Click “Run audit now”, or wait for the weekly
          run.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="glass glass-hairline rounded-2xl p-5 text-center">
              <p className={`text-3xl font-bold ${scoreColor(report.score)}`}>
                {report.score}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Overall score
              </p>
            </div>
            <div className="glass glass-hairline rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {report.errors}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Errors
              </p>
            </div>
            <div className="glass glass-hairline rounded-2xl p-5 text-center">
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {report.warnings}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Warnings
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-neutral-400">
            Crawled {report.pageCount} live pages on{" "}
            {new Date(report.generatedAt).toLocaleString()}. This audits your
            own rendered HTML (titles, descriptions, headings, canonical tags,
            structured data, image alt text, content depth and load time). It
            can&apos;t see backlinks or keyword volumes; those live in paid
            tools. Search rankings come from Search Console below.
          </p>

          {brain && (
            <>
              <section className="glass glass-hairline mt-6 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-white">
                    Brain analysis
                  </h2>
                  <span
                    className={`text-xs ${
                      brain.trend.direction === "up"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : brain.trend.direction === "down"
                          ? "text-red-600 dark:text-red-400"
                          : "text-neutral-400"
                    }`}
                  >
                    {brain.trend.direction === "up"
                      ? "▲ trending up"
                      : brain.trend.direction === "down"
                        ? "▼ trending down"
                        : "steady"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {brain.verdict}
                </p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {brain.trend.summary}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-5">
                  {brain.categories.map((cat) => (
                    <div key={cat.key} title={cat.detail}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {cat.label}
                        </span>
                        <span
                          className={`text-sm font-bold ${scoreColor(cat.score)}`}
                        >
                          {cat.score}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                        <div
                          className={`h-full rounded-full ${
                            cat.score >= 90
                              ? "bg-emerald-500"
                              : cat.score >= 70
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-[var(--hairline)] pt-3">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                    Keyword coverage: {brain.keywordCoveragePct}% of tool pages
                    carry their main keyword in both title and description
                  </p>
                  {brain.keywordGaps.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                      {brain.keywordGaps.slice(0, 6).map((g) => (
                        <li key={g.path}>
                          <span className="font-medium">{g.path}</span> misses
                          &quot;{g.keyword}&quot; in{" "}
                          {!g.inTitle && !g.inDescription
                            ? "title and description"
                            : !g.inTitle
                              ? "the title"
                              : "the description"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              {brain.actions.length > 0 && (
                <section className="glass glass-hairline mt-4 rounded-2xl p-5">
                  <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-white">
                    Action plan
                  </h2>
                  <ol className="mt-3 space-y-2.5">
                    {brain.actions.map((a) => (
                      <li key={a.title} className="flex items-start gap-3 text-sm">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-violet-600 text-xs font-bold text-white">
                          {a.priority}
                        </span>
                        <div className="min-w-0">
                          <p className="text-neutral-900 dark:text-white">
                            <span className="font-medium">{a.title}.</span>{" "}
                            <span
                              className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${impactColor[a.impact]}`}
                            >
                              {a.impact} impact
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                            {a.detail} Affects {a.pages.length} page
                            {a.pages.length === 1 ? "" : "s"}:{" "}
                            {a.pages.slice(0, 4).join(", ")}
                            {a.pages.length > 4 ? ` and ${a.pages.length - 4} more` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}

          {history.length > 1 && (
            <section className="mt-6 glass glass-hairline rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
                Score over time
              </h2>
              <div className="mt-4 flex items-end gap-1.5" style={{ height: 90 }}>
                {history.slice(-26).map((s) => (
                  <div
                    key={s.t}
                    className="group flex flex-1 flex-col items-center justify-end"
                    title={`${new Date(s.t).toLocaleDateString()}: score ${s.score}, ${s.errors} errors, ${s.warnings} warnings`}
                  >
                    <div
                      className="w-full rounded-t bg-violet-500"
                      style={{ height: `${(s.score / maxScore) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Weekly snapshots (last {Math.min(history.length, 26)}).
              </p>
            </section>
          )}
        </>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="glass glass-hairline rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-white">
              Autopilot
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                autopilot
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }`}
            >
              {autopilot ? "running" : "waiting for first cycle"}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Audits every page, writes a change report and pings search engines
            on its own, every {autopilot?.cycleHours ?? 24} hours.
          </p>
          {autopilot && (
            <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
              Last cycle {new Date(autopilot.lastCycleAt).toLocaleString()} ·
              next due {new Date(autopilot.nextDueAt).toLocaleString()}
            </p>
          )}
          {latestAuto && (
            <div className="mt-3 border-t border-[var(--hairline)] pt-3">
              <p className="text-sm text-neutral-700 dark:text-neutral-300">
                {latestAuto.summary}
              </p>
              {latestAuto.newIssues.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-red-600 dark:text-red-400">
                  {latestAuto.newIssues.slice(0, 5).map((i) => (
                    <li key={i}>New: {i}</li>
                  ))}
                </ul>
              )}
              {latestAuto.resolvedIssues.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-emerald-600 dark:text-emerald-400">
                  {latestAuto.resolvedIssues.slice(0, 5).map((i) => (
                    <li key={i}>Resolved: {i}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="mt-3 border-t border-[var(--hairline)] pt-3">
            <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Instant indexing (IndexNow)
            </p>
            <p
              className={`mt-1 text-xs ${
                indexnow?.lastStatus === "ok"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : indexnow?.lastStatus === "failed"
                    ? "text-red-600 dark:text-red-400"
                    : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              {indexnow
                ? indexnow.lastDetail
                : "No submission yet. The first autopilot cycle handles it."}
            </p>
          </div>
        </section>

        <section className="glass glass-hairline rounded-2xl p-5">
          <h2 className="font-display text-sm font-semibold text-neutral-900 dark:text-white">
            Discovered backlinks
          </h2>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Sites that actually sent visitors here, straight from first-party
            traffic. Every domain below links to you somewhere.
          </p>
          {backlinks.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              None discovered yet. They appear as soon as another site sends a
              visitor.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {backlinks.slice(0, 10).map((b) => (
                <li
                  key={b.domain}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-neutral-700 dark:text-neutral-300">
                    {b.domain}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                    {b.hits.toLocaleString()} visit{b.hits === 1 ? "" : "s"} ·
                    last {new Date(b.lastSeen).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 glass glass-hairline rounded-2xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Search Console: real search queries
          </h2>
          <span className="text-xs text-neutral-400">last 28 days</span>
        </div>

        {gsc.status === "ok" ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {gsc.data.totalClicks.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Clicks</p>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {gsc.data.totalImpressions.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Impressions</p>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {gsc.data.avgPosition.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Avg position</p>
              </div>
            </div>
            {gsc.data.topQueries.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-neutral-400">
                      <th className="pb-2 font-medium">Query</th>
                      <th className="pb-2 text-right font-medium">Clicks</th>
                      <th className="pb-2 text-right font-medium">Impr.</th>
                      <th className="pb-2 text-right font-medium">CTR</th>
                      <th className="pb-2 text-right font-medium">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gsc.data.topQueries.map((q) => (
                      <tr key={q.query} className="border-t border-black/5 dark:border-white/10">
                        <td className="py-1.5 pr-3 text-neutral-700 dark:text-neutral-300">
                          {q.query}
                        </td>
                        <td className="py-1.5 text-right text-neutral-900 dark:text-white">
                          {q.clicks.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right text-neutral-500 dark:text-neutral-400">
                          {q.impressions.toLocaleString()}
                        </td>
                        <td className="py-1.5 text-right text-neutral-500 dark:text-neutral-400">
                          {(q.ctr * 100).toFixed(1)}%
                        </td>
                        <td className="py-1.5 text-right text-neutral-500 dark:text-neutral-400">
                          {q.position.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : gsc.status === "error" ? (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Couldn&apos;t load Search Console data: {gsc.message}. Check
            GSC_SITE_URL and that the service account is a user of that property.
          </p>
        ) : (
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>
              Not connected. This shows the real keywords people search to find
              you, the free version of what paid keyword tools sell. To connect:
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-500 dark:text-neutral-400">
              <li>Verify your domain in Google Search Console.</li>
              <li>
                Add the service account email as a user of the property in
                Search Console settings.
              </li>
              <li>
                Set <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> and{" "}
                <span className="font-mono">GSC_SITE_URL</span> in the environment.
              </li>
            </ol>
          </div>
        )}
      </section>

      {report && (
        <div className="mt-6 space-y-4">
          {report.pages.map((page) => (
            <section
              key={page.path}
              className="glass glass-hairline rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={page.path}
                    className="truncate font-medium text-neutral-900 hover:text-violet-600 dark:text-white dark:hover:text-violet-400"
                  >
                    {page.path}
                  </Link>
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    HTTP {page.status} · {page.loadMs} ms
                  </p>
                </div>
                <span className={`shrink-0 text-lg font-bold ${scoreColor(page.score)}`}>
                  {page.score}
                </span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {page.checks
                  .filter((c) => c.severity !== "good")
                  .map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot[c.severity]}`} />
                      <span className="text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium">{c.label}.</span>{" "}
                        <span className="text-neutral-500 dark:text-neutral-400">
                          {c.detail}
                        </span>
                      </span>
                    </li>
                  ))}
                {page.checks.every((c) => c.severity === "good") && (
                  <li className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    No issues found.
                  </li>
                )}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">
        The weekly audit runs automatically in the background. A scheduler can
        also POST to /api/admin/seo-report with a bearer token.
      </p>
    </main>
  );
}
