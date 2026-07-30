import crypto from "node:crypto";
import fs from "node:fs";

// Authenticates to Google APIs with a service account, with no external
// libraries. It builds an RS256 JWT with node:crypto, exchanges it for an
// access token, and caches the token until it nears expiry.
//
// GOOGLE_SERVICE_ACCOUNT_JSON accepts any of three forms:
//   - an absolute path to the downloaded key file (preferred: the key can be
//     chmod 600 and never has to sit in an env file)
//   - the raw JSON
//   - that JSON base64-encoded, which avoids newline trouble in .env
//
// The path form is handled because the admin panel has been telling operators
// to use one. Without it, a path was base64-decoded into rubbish, the parse
// failed, and the panel reported "not configured", pointing at the setup
// rather than at the instruction that caused it.

type ServiceAccount = { client_email: string; private_key: string };

/** Why the key could not be loaded, for the admin panel to show. */
let lastLoadError = "";

export function serviceAccountError(): string {
  return lastLoadError;
}

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    lastLoadError = "GOOGLE_SERVICE_ACCOUNT_JSON is not set.";
    return null;
  }

  let json: string;
  try {
    if (raw.startsWith("{")) {
      json = raw;
    } else if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) {
      json = fs.readFileSync(raw, "utf8");
    } else {
      json = Buffer.from(raw, "base64").toString("utf8");
    }
  } catch {
    lastLoadError = "Could not read the service account key file at that path.";
    return null;
  }

  try {
    const parsed = JSON.parse(json);
    if (parsed.client_email && parsed.private_key) {
      lastLoadError = "";
      return {
        client_email: parsed.client_email,
        private_key: parsed.private_key,
      };
    }
    lastLoadError =
      "That file parsed but has no client_email or private_key. It may be an OAuth client secret rather than a service account key.";
  } catch {
    lastLoadError =
      "The value is not valid JSON, a readable file path, or base64-encoded JSON.";
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
