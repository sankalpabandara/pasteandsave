import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Password-gated admin session. The password and signing secret come from
// environment variables (see .env.example). The session cookie is a signed,
// expiring token so it can't be forged without the secret.

const SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";

export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

/** True only when both the password and the signing secret are set. */
export function adminConfigured(): boolean {
  return SECRET.length >= 16 && PASSWORD.length > 0;
}

/**
 * Compares two secrets in constant time, whatever their lengths.
 *
 * timingSafeEqual needs equal lengths, and checking the length first returned
 * early on a mismatch, which told anyone timing the answer how long the real
 * value is. Comparing digests makes both sides the same length always.
 */
export function safeEqual(input: string, secret: string): boolean {
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

export function checkPassword(input: string): boolean {
  if (!PASSWORD) return false;
  return safeEqual(input, PASSWORD);
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
}

// Logging out has to end the session on the server, not only delete the cookie
// in one browser: a copied cookie otherwise stayed good for the full twelve
// hours. Every session issued before the last logout is refused. There is one
// admin, so "log out" meaning "log out everywhere" is the right behaviour, and
// it is kept on disk so a restart does not bring old sessions back.
//
// A session's issue time is its expiry minus the fixed lifetime, so the
// cookie format did not have to change and sessions open today stay valid.
function revokedFile(): string {
  return process.env.ADMIN_REVOKED_FILE || path.join(process.cwd(), "data", "admin-revoked.json");
}

let revokedBefore: number | null = null;

function sessionsRevokedBefore(): number {
  if (revokedBefore === null) {
    try {
      revokedBefore = Number(JSON.parse(fs.readFileSync(revokedFile(), "utf8")).before) || 0;
    } catch {
      revokedBefore = 0;
    }
  }
  return revokedBefore;
}

/** Ends every session issued up to now. */
export function revokeSessions(now = Date.now()): void {
  revokedBefore = now;
  try {
    fs.mkdirSync(path.dirname(revokedFile()), { recursive: true });
    fs.writeFileSync(revokedFile(), JSON.stringify({ before: now }));
  } catch {
    // Still revoked in memory until the next restart.
  }
}

export function createSession(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token: string | undefined): boolean {
  if (!token || !SECRET) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;
  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return false;
  return expiresAt - SESSION_TTL_MS >= sessionsRevokedBefore();
}
