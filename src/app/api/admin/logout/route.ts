import { cookies } from "next/headers";
import { SESSION_COOKIE, revokeSessions, verifySession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  const store = await cookies();
  // Only a signed-in admin can end the sessions. Otherwise anyone could post
  // here and keep logging the admin out.
  if (verifySession(store.get(SESSION_COOKIE)?.value)) revokeSessions();
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
