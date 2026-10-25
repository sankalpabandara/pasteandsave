// The Trustpilot prompt shown after a browser's first download, and once more
// on its next one if it was closed without opening the review page
// (src/components/ReviewPrompt.tsx).
//
// Run: node --test test/review.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_REVIEW_ASKS,
  REVIEW_ACTIONS,
  REVIEW_STATE_KEY,
  TRUSTPILOT_REVIEW_URL,
  browserStore,
  isReviewAction,
  markReviewOpened,
  takeReviewTurn,
} from "../src/lib/review.ts";

function memoryStore(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data,
  };
}

test("asked on the first download and the next one, then never again", () => {
  const store = memoryStore();
  assert.equal(MAX_REVIEW_ASKS, 2);
  assert.equal(takeReviewTurn(store), true, "first download");
  assert.equal(takeReviewTurn(store), true, "next download, after Not now");
  assert.equal(takeReviewTurn(store), false);
  assert.equal(takeReviewTurn(store), false);
  assert.equal(store.data.get(REVIEW_STATE_KEY), "2");
});

test("once the review page was opened, the prompt never comes back", () => {
  const store = memoryStore();
  assert.equal(takeReviewTurn(store), true);
  markReviewOpened(store);
  assert.equal(takeReviewTurn(store), false);
  assert.equal(store.data.get(REVIEW_STATE_KEY), "opened");
});

test("a browser asked by the first version gets one more ask, not two", () => {
  const store = memoryStore({ "pas-review-asked": "1792955541574" });
  assert.equal(takeReviewTurn(store), true);
  assert.equal(takeReviewTurn(store), false);
});

test("a damaged value starts the count again rather than breaking", () => {
  const store = memoryStore({ [REVIEW_STATE_KEY]: "garbage" });
  assert.equal(takeReviewTurn(store), true);
  assert.equal(store.data.get(REVIEW_STATE_KEY), "1");
});

test("without working storage the prompt is skipped, so it cannot repeat", () => {
  assert.equal(takeReviewTurn(null), false);
  const throwing = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(takeReviewTurn(throwing), false);
  // Marking it opened with nowhere to keep it is not an error either.
  markReviewOpened(throwing);
  markReviewOpened(null);
  // Outside a browser there is no storage at all.
  assert.equal(browserStore(), null);
});

test("the link opens the review form for this site on Trustpilot", () => {
  assert.equal(TRUSTPILOT_REVIEW_URL, "https://www.trustpilot.com/evaluate/pasteandsave.com");
});

test("only the prompt's own action names are accepted from a visitor", () => {
  for (const a of REVIEW_ACTIONS) assert.equal(isReviewAction(a), true);
  for (const bad of ["", "Shown", "submitted", "<script>", null, undefined, 1, {}]) {
    assert.equal(isReviewAction(bad), false, String(bad));
  }
});
