import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";
import { runAutopilotCycle } from "@/lib/seo-autopilot";

export const runtime = "nodejs";
// Crawling several pages can take a few seconds.
export const maxDuration = 60;

async function authorized(request: NextRequest): Promise<boolean> {
  // Admin session cookie (the one-click button in the panel).
  const store = await cookies();
  if (verifySession(store.get(SESSION_COOKIE)?.value)) return true;

  // Bearer token, for an external scheduler (cron, Windows Task Scheduler).
  const token = process.env.SEO_REPORT_TOKEN;
  if (token) {
    const header = request.headers.get("authorization") ?? "";
    if (header === `Bearer ${token}`) return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // A manual run does everything a scheduled cycle does: audit, change
  // report and IndexNow submission.
  const auto = await runAutopilotCycle();
  return Response.json({
    ok: true,
    score: auto.score,
    errors: auto.errors,
    warnings: auto.warnings,
    pageCount: auto.pageCount,
    summary: auto.summary,
    indexing: auto.indexing,
    generatedAt: auto.t,
  });
}
