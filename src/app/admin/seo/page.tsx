import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { maybeRunWeekly, readLatest, readHistory } from "@/lib/seo-history";
import type { CheckSeverity } from "@/lib/seo-crawler";
import { getSearchConsoleSummary } from "@/lib/search-console";
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
  const [report, history, gsc] = await Promise.all([
    readLatest(),
    readHistory(),
    getSearchConsoleSummary(),
  ]);

  const maxScore = 100;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
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
        <p className="mt-6 rounded-2xl border border-black/5 bg-white p-5 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400">
          No audit has run yet. Click “Run audit now”, or wait for the weekly
          run.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-black/5 bg-white p-5 text-center dark:border-white/10 dark:bg-neutral-900">
              <p className={`text-3xl font-bold ${scoreColor(report.score)}`}>
                {report.score}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Overall score
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 text-center dark:border-white/10 dark:bg-neutral-900">
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {report.errors}
              </p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Errors
              </p>
            </div>
            <div className="rounded-2xl border border-black/5 bg-white p-5 text-center dark:border-white/10 dark:bg-neutral-900">
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

          {history.length > 1 && (
            <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
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

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Search Console — real search queries
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
              className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
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
