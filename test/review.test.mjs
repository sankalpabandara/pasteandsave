// The Trustpilot prompt shown once after a browser's first download
// (src/components/ReviewPrompt.tsx).
//
// Run: node --test test/review.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REVIEW_ACTIONS,
  REVIEW_ASKED_KEY,
  TRUSTPILOT_REVIEW_URL,
  isReviewAction,
  takeReviewTurn,
} from "../src/lib/review.ts";

function memoryStore() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    data,
  };
}

test("the prompt is shown on the first download in a browser, never again", () => {
  const store = memoryStore();
  assert.equal(takeReviewTurn(store), true);
  assert.ok(store.data.get(REVIEW_ASKED_KEY));
  assert.equal(takeReviewTurn(store), false);
  assert.equal(takeReviewTurn(store), false);
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
