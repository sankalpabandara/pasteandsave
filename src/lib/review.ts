// The Trustpilot review prompt shown once after a visitor's first download.
//
// It asks every visitor the same way and gives nothing in return: Trustpilot
// removes reviews that were rewarded, and UK and EU rules count a rewarded
// review as a fake one. Downloads never depend on it.
//
// No imports on purpose: the tests load this file directly.

export const TRUSTPILOT_REVIEW_URL = "https://www.trustpilot.com/evaluate/pasteandsave.com";

/** Remembers in the browser that the prompt has been shown, so it never comes back. */
export const REVIEW_ASKED_KEY = "pas-review-asked";

/** What a visitor did with the prompt, as counted on the admin page. */
export const REVIEW_ACTIONS = ["shown", "opened", "closed"] as const;

export type ReviewAction = (typeof REVIEW_ACTIONS)[number];

export function isReviewAction(value: unknown): value is ReviewAction {
  return typeof value === "string" && (REVIEW_ACTIONS as readonly string[]).includes(value);
}

type Store = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/**
 * Whether to show the prompt now, and marks it shown. Storage can be missing or
 * throw (private windows, blocked site data); then the prompt is skipped
 * rather than risk showing it on every download.
 */
export function takeReviewTurn(store: Store | null): boolean {
  if (!store) return false;
  try {
    if (store.getItem(REVIEW_ASKED_KEY)) return false;
    store.setItem(REVIEW_ASKED_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
