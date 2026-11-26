import { getAccessToken, googleConfigured } from "./google-auth";

// Pulls real search data from Google Search Console: the queries people
// actually use to find the site, with clicks, impressions, click-through rate
// and average ranking position. This is the free equivalent of the keyword
// data paid tools sell, straight from Google.
//
// Needs GSC_SITE_URL (e.g. "https://your-domain.com/" for a URL-prefix
// property, or "sc-domain:your-domain.com" for a domain property) and a
// service account added as a user of that property in Search Console.

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type GscQuery = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSummary = {
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  topQueries: GscQuery[];
};

export type GscResult =
  | { status: "ok"; data: GscSummary }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

function dateStr(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

type GscRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export async function getSearchConsoleSummary(): Promise<GscResult> {
  const site = process.env.GSC_SITE_URL?.trim();
  if (!googleConfigured() || !site) return { status: "unconfigured" };

  try {
    const token = await getAccessToken([SCOPE]);
    if (!token) return { status: "unconfigured" };

    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      site,
    )}/searchAnalytics/query`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    // GSC data lags ~2 days, so end the range yesterday.
    const startDate = dateStr(28);
    const endDate = dateStr(2);

    async function run(body: object): Promise<{ rows?: GscRow[] }> {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Search Console returned ${res.status}`);
      return res.json();
    }

    const [totals, byQuery] = await Promise.all([
      run({ startDate, endDate }),
      run({ startDate, endDate, dimensions: ["query"], rowLimit: 20 }),
    ]);

    const t = totals.rows?.[0];
    const topQueries: GscQuery[] = (byQuery.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? "",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));

    return {
      status: "ok",
      data: {
        totalClicks: t?.clicks ?? 0,
        totalImpressions: t?.impressions ?? 0,
        avgPosition: t?.position ?? 0,
        topQueries,
      },
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Failed to load Search Console data.",
    };
  }
}
