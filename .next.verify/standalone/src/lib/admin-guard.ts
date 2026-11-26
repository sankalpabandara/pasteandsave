import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "./auth";

// Server-side gate for admin pages. Call at the top of a protected server
// component; it redirects to the login page when the session is missing or
// invalid.
export async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!verifySession(token)) {
    redirect("/admin/login");
  }
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
