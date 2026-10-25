// The Trustpilot review prompt shown after a visitor's first download, and
// once more on their next one if they closed it without opening the review
// page.
//
// It asks every visitor the same way and gives nothing in return: Trustpilot
// removes reviews that were rewarded, and UK and EU rules count a rewarded
// review as a fake one. Downloads never depend on it.
//
// No imports on purpose: the tests load this file directly.

export const TRUSTPILOT_REVIEW_URL = "https://www.trustpilot.com/evaluate/pasteandsave.com";

/**
 * What this browser has seen: a count of times asked, or "opened" once the
 * review page was opened from the prompt, after which it never comes back.
 */
export const REVIEW_STATE_KEY = "pas-review";

/** Written by the first version, which asked once. Counts as one ask. */
const LEGACY_ASKED_KEY = "pas-review-asked";

/** The first download, then the next one, then never again. */
export const MAX_REVIEW_ASKS = 2;

/** What a visitor did with the prompt, as counted on the admin page. */
export const REVIEW_ACTIONS = ["shown", "opened", "closed"] as const;

export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && (REVIEW_ACTIONS as readonly string[]).includes(value);
}

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/** The browser's own storage, or null where it is missing or reading it throws. */
export function browserStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Whether to show the prompt after this download, and counts it as shown.
 * Storage can be missing or throw (private windows, blocked site data); then
 * the prompt is skipped rather than risk showing it on every download.
 */
export function takeReviewTurn(store: Store | null): boolean {
  if (!store) return false;
  try {
    const raw = store.getItem(REVIEW_STATE_KEY) ?? (store.getItem(LEGACY_ASKED_KEY) ? "1" : "0");
    if (raw === "opened") return false;
    const asked = Number.parseInt(raw, 10) || 0;
    if (asked >= MAX_REVIEW_ASKS) return false;
    store.setItem(REVIEW_STATE_KEY, String(asked + 1));
    return true;
  } catch {
    return false;
  }
}

/** The review page was opened from the prompt: never ask this browser again. */
export function markReviewOpened(store: Store | null): void {
  try {
    store?.setItem(REVIEW_STATE_KEY, "opened");
  } catch {
    // Nothing to keep it in. At most one more ask follows.
  }
}
