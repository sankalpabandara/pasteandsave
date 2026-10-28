import { getAccessToken, googleConfigured } from "./google-auth";

// Pulls headline numbers from the Google Analytics 4 Data API into the admin
// dashboard. Needs GA4_PROPERTY_ID (the numeric property id, not the G-XXXX
// measurement id) and a service account with Viewer access to the property.

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

export type GaSummary = {
  activeUsers: number;
  pageViews: number;
  sessions: number;
  topCountries: { name: string; users: number }[];
  topPages: { path: string; views: number }[];
};

export type GaResult =
  | { status: "ok"; data: GaSummary }
  | { status: "unconfigured" }
  | { status: "error"; message: string };

type ReportRow = {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
};

// pasteandsave.com's own GA4 property, used when GA4_PROPERTY_ID is not set,
// so connecting the dashboard needs only the key file.
const DEFAULT_PROPERTY_ID = "547077098";

/**
 * GA reports whole calendar days in the property's time zone, so a period of
 * N days here is the last N days including today, and 1 day is today so far.
 */
export function gaDateRange(days: number): { startDate: string; endDate: string } {
  return { startDate: days <= 1 ? "today" : `${days - 1}daysAgo`, endDate: "today" };
}

export async function getGaSummary(days = 28): Promise<GaResult> {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || DEFAULT_PROPERTY_ID;
  if (!googleConfigured() || !propertyId) return { status: "unconfigured" };

  try {
    const token = await getAccessToken([SCOPE]);
    if (!token) return { status: "unconfigured" };

    const endpoint = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const dateRanges = [gaDateRange(days)];

    async function run(body: object): Promise<{ rows?: ReportRow[] }> {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`GA Data API returned ${res.status}`);
      return res.json();
    }

    const [totals, countries, pages] = await Promise.all([
      run({
        dateRanges,
        metrics: [
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "sessions" },
        ],
      }),
      run({
        dateRanges,
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 6,
      }),
      run({
        dateRanges,
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 6,
      }),
    ]);

    const m = totals.rows?.[0]?.metricValues ?? [];
    return {
      status: "ok",
      data: {
        activeUsers: Number(m[0]?.value ?? 0),
        pageViews: Number(m[1]?.value ?? 0),
        sessions: Number(m[2]?.value ?? 0),
        topCountries: (countries.rows ?? []).map((r) => ({
          name: r.dimensionValues?.[0]?.value ?? "Unknown",
          users: Number(r.metricValues?.[0]?.value ?? 0),
        })),
        topPages: (pages.rows ?? []).map((r) => ({
          path: r.dimensionValues?.[0]?.value ?? "/",
          views: Number(r.metricValues?.[0]?.value ?? 0),
        })),
      },
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load GA data.",
    };
  }
}
