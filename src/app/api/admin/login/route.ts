import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  adminConfigured,
  checkPassword,
  createSession,
} from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // Tight limit to slow down password guessing.
  if (!rateLimit(`login:${clientIp(request)}`, 5, 60_000)) {
    return Response.json(
      { error: "Too many attempts. Wait a minute and try again." },
      { status: 429 },
    );
  }

  if (!adminConfigured()) {
    return Response.json(
      {
        error:
          "Admin is not configured. Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in your environment.",
      },
      { status: 503 },
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.password || !checkPassword(body.password)) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });

  return Response.json({ ok: true });
}
