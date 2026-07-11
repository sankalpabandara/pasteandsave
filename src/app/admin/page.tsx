import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";
import { getStats } from "@/lib/analytics";
import { getGaSummary } from "@/lib/ga-data";
import AdminBar from "./AdminBar";

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
};

// Always render fresh; never cache the dashboard.
export const dynamic = "force-dynamic";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {sub}
        </p>
      )}
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const stats = await getStats();
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const ga = await getGaSummary();

  const maxDay = Math.max(
    1,
    ...stats.byDay.map((d) => Math.max(d.pageviews, d.downloads)),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
            Dashboard
          </h1>
          <div className="flex gap-3 text-sm">
            <Link
              href="/admin/seo"
              className="text-violet-600 hover:underline dark:text-violet-400"
            >
              SEO audit
            </Link>
            <Link
              href="/"
              className="text-violet-600 hover:underline dark:text-violet-400"
            >
              View site
            </Link>
          </div>
        </div>
        <AdminBar generatedAt={stats.generatedAt} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pageviews"
          value={stats.totalPageviews.toLocaleString()}
          sub={`${stats.pageviews24h.toLocaleString()} in last 24h`}
        />
        <StatCard
          label="Downloads"
          value={stats.totalDownloads.toLocaleString()}
          sub={`${stats.downloads24h.toLocaleString()} in last 24h`}
        />
        <StatCard
          label="Link lookups"
          value={stats.totalLookups.toLocaleString()}
          sub={`${pct(stats.lookupSuccessRate)} succeeded`}
        />
        <StatCard
          label="Lookup → download"
          value={pct(stats.conversionRate)}
          sub="conversion rate"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Last 14 days
        </h2>
        <div className="mt-4 flex items-end gap-1.5" style={{ height: 140 }}>
          {stats.byDay.map((d) => (
            <div
              key={d.day}
              className="group flex flex-1 flex-col items-center justify-end gap-1"
              title={`${d.day}: ${d.pageviews} views, ${d.downloads} downloads`}
            >
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 110 }}>
                <div
                  className="w-1/2 rounded-t bg-violet-200 dark:bg-violet-900/60"
                  style={{ height: `${(d.pageviews / maxDay) * 100}%` }}
                />
                <div
                  className="w-1/2 rounded-t bg-violet-600"
                  style={{ height: `${(d.downloads / maxDay) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-neutral-400">
                {d.day.slice(5)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-200 dark:bg-violet-900/60" />
            Pageviews
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-600" />
            Downloads
          </span>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Top sites downloaded
          </h2>
          {stats.topSites.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              No lookups recorded yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.topSites.map((s) => (
                <li key={s.site} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-700 dark:text-neutral-300">{s.site}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {s.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex gap-4 border-t border-black/5 pt-3 text-xs text-neutral-500 dark:border-white/10 dark:text-neutral-400">
            <span>Video: {stats.downloadsByMode.video.toLocaleString()}</span>
            <span>Audio (MP3): {stats.downloadsByMode.audio.toLocaleString()}</span>
          </div>
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Top pages
          </h2>
          {stats.topPages.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              No pageviews recorded yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stats.topPages.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-neutral-700 dark:text-neutral-300">
                    {p.path}
                  </span>
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {p.count.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
            Google Analytics
          </h2>
          <span className="text-xs text-neutral-400">last 28 days</span>
        </div>

        {ga.status === "ok" ? (
          <>
            <div className="mt-3 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {ga.data.activeUsers.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Users</p>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {ga.data.pageViews.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Pageviews</p>
              </div>
              <div>
                <p className="text-xl font-bold text-neutral-900 dark:text-white">
                  {ga.data.sessions.toLocaleString()}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Sessions</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Top countries
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {ga.data.topCountries.map((c) => (
                    <li key={c.name} className="flex justify-between">
                      <span className="text-neutral-700 dark:text-neutral-300">{c.name}</span>
                      <span className="text-neutral-500 dark:text-neutral-400">
                        {c.users.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  Top pages (GA)
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  {ga.data.topPages.map((p) => (
                    <li key={p.path} className="flex justify-between gap-3">
                      <span className="truncate text-neutral-700 dark:text-neutral-300">
                        {p.path}
                      </span>
                      <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
                        {p.views.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : ga.status === "error" ? (
          <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
            Couldn&apos;t load GA data: {ga.message}. Check GA4_PROPERTY_ID and
            that the service account has Viewer access to the property.
          </p>
        ) : (
          <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>
              {gaId
                ? "Client tracking is on. To show numbers here, connect the GA Data API:"
                : "Not connected. To pull GA numbers into this dashboard:"}
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-500 dark:text-neutral-400">
              <li>Create a Google Cloud service account and download its JSON key.</li>
              <li>
                In GA4, add the service account email as a Viewer on the property.
              </li>
              <li>
                Set <span className="font-mono">GOOGLE_SERVICE_ACCOUNT_JSON</span> and{" "}
                <span className="font-mono">GA4_PROPERTY_ID</span> in the environment.
              </li>
            </ol>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-black/5 bg-white p-5 dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-white">
          Recent activity
        </h2>
        {stats.recent.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
            Nothing yet.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 text-sm dark:divide-white/10">
            {stats.recent.map((ev, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2">
                <span className="text-neutral-700 dark:text-neutral-300">
                  {ev.type === "pageview" && `Viewed ${ev.path ?? "/"}`}
                  {ev.type === "lookup" &&
                    `Looked up ${ev.site ?? "a link"}${ev.ok === false ? " (failed)" : ""}`}
                  {ev.type === "download" && `Downloaded ${ev.mode === "audio" ? "MP3 audio" : "video"}`}
                </span>
                <span className="shrink-0 text-xs text-neutral-400">
                  {new Date(ev.t).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-neutral-400">
        First-party analytics store no cookies, IPs or personal data.
      </p>
    </main>
  );
}
