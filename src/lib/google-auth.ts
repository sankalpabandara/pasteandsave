import crypto from "node:crypto";

// Authenticates to Google APIs with a service account, with no external
// libraries. It builds an RS256 JWT with node:crypto, exchanges it for an
// access token, and caches the token until it nears expiry.
//
// Set GOOGLE_SERVICE_ACCOUNT_JSON to the service account key file, either as
// raw JSON or base64-encoded (base64 avoids newline problems in .env files).

type ServiceAccount = { client_email: string; private_key: string };

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    }
  } catch {
    // fall through to null
  }
  return null;
}

export function googleConfigured(): boolean {
  return loadServiceAccount() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const tokenCache = new Map<string, { token: string; exp: number }>();

export async function getAccessToken(scopes: string[]): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;

  const cacheKey = scopes.join(" ");
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.exp - 60 > now) return cached.token;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: cacheKey,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto.sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    sa.private_key,
  );
  const jwt = `${signingInput}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed (${res.status})`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache.set(cacheKey, {
    token: data.access_token,
    exp: now + (data.expires_in ?? 3600),
  });
  return data.access_token;
}
