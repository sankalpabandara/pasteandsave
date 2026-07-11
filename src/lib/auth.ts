import crypto from "node:crypto";

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

export function checkPassword(input: string): boolean {
  if (!PASSWORD) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(PASSWORD);
  // Length check first; timingSafeEqual throws on mismatched lengths.
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sign(data: string): string {
  return crypto.createHmac("sha256", SECRET).update(data).digest("hex");
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
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
