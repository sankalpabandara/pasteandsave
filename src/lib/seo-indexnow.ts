import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { SITE_URL } from "./site";
import { TOOL_PAGES } from "./seo-pages";

// IndexNow: the instant-indexing protocol used by Bing, Yandex, Seznam and
// Naver. Instead of waiting for a crawl, we push our URLs the moment an
// audit runs, so new and updated pages get picked up in minutes. Google does
// not use IndexNow; it discovers changes through the sitemap instead.

const DATA_DIR = path.join(process.cwd(), "data");
const KEY_FILE = path.join(DATA_DIR, "indexnow-key.txt");
const STATE_FILE = path.join(DATA_DIR, "indexnow-state.json");
const ENDPOINT = "https://api.indexnow.org/indexnow";

export type IndexNowState = {
  lastStatus: "ok" | "skipped" | "failed";
  lastDetail: string;
  lastSubmitAt: number;
  urlCount: number;
};

/** The site's IndexNow key. Generated once and reused forever after. */
export function getIndexNowKey(): string {
  const fromEnv = process.env.INDEXNOW_KEY;
  if (fromEnv && /^[a-f0-9-]{8,64}$/i.test(fromEnv)) return fromEnv;
  try {
    const existing = fs.readFileSync(KEY_FILE, "utf8").trim();
    if (existing) return existing;
  } catch {
    // fall through and generate
  }
  const key = crypto.randomBytes(16).toString("hex");
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(KEY_FILE, key, "utf8");
  } catch {
    // still return the key; it just won't survive a restart
  }
  return key;
}

export async function readIndexNowState(): Promise<IndexNowState | null> {
  try {
    return JSON.parse(await fsp.readFile(STATE_FILE, "utf8")) as IndexNowState;
  } catch {
    return null;
  }
}

async function saveState(state: IndexNowState) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(STATE_FILE, JSON.stringify(state), "utf8");
  } catch {
    // best effort
  }
}

export function allSiteUrls(): string[] {
  const base = SITE_URL.replace(/\/$/, "");
  return ["/", ...TOOL_PAGES.map((p) => `/${p.slug}`), "/terms"].map(
    (p) => `${base}${p === "/" ? "" : p}`,
  );
}

/**
 * Pushes every site URL to IndexNow. On localhost this is a no-op (search
 * engines cannot verify a key file they cannot reach), and the state records
 * why so the admin panel can show it honestly.
 */
export async function submitToIndexNow(): Promise<IndexNowState> {
  const base = SITE_URL.replace(/\/$/, "");
  let host = "";
  try {
    host = new URL(base).hostname;
  } catch {
    host = "";
  }

  const urls = allSiteUrls();

  if (!host || host === "localhost" || host.endsWith(".local") || /^[\d.]+$/.test(host)) {
    const state: IndexNowState = {
      lastStatus: "skipped",
      lastDetail:
        "Site URL is not public yet. Submission starts automatically once NEXT_PUBLIC_SITE_URL points at the live domain.",
      lastSubmitAt: Date.now(),
      urlCount: urls.length,
    };
    await saveState(state);
    return state;
  }

  const key = getIndexNowKey();
  let state: IndexNowState;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${base}/indexnow/${key}`,
        urlList: urls,
      }),
    });
    // IndexNow returns 200 or 202 on acceptance.
    state =
      res.status === 200 || res.status === 202
        ? {
            lastStatus: "ok",
            lastDetail: `Accepted ${urls.length} URLs (HTTP ${res.status}). Bing, Yandex, Seznam and Naver share the feed.`,
            lastSubmitAt: Date.now(),
            urlCount: urls.length,
          }
        : {
            lastStatus: "failed",
            lastDetail: `IndexNow answered HTTP ${res.status}.`,
            lastSubmitAt: Date.now(),
            urlCount: urls.length,
          };
  } catch (err) {
    state = {
      lastStatus: "failed",
      lastDetail: `Request failed: ${err instanceof Error ? err.message : "unknown error"}.`,
      lastSubmitAt: Date.now(),
      urlCount: urls.length,
    };
  }
  await saveState(state);
  return state;
}
