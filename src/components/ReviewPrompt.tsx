"use client";

import { useEffect, useRef } from "react";
import { TRUSTPILOT_REVIEW_URL, type ReviewAction } from "@/lib/review";

// Counted so the admin page can show how often the prompt is used.
function countReview(action: ReviewAction) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ review: action }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * A card at the foot of the screen asking for a Trustpilot review, shown once
 * per browser after the first download has started (see takeReviewTurn).
 *
 * Deliberately not modal: it covers nothing the visitor needs, the download is
 * already running underneath, and the rest of the page keeps working while it
 * is open. Nothing is offered for a review and nothing depends on one.
 */
export default function ReviewPrompt({ onClose }: { onClose: () => void }) {
  // Once per appearance, even where React runs effects twice.
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    countReview("shown");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        countReview("closed");
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="review-prompt-title"
      className="glass-strong fixed inset-x-4 bottom-4 z-50 rounded-2xl p-4 shadow-xl transition-[opacity,translate] duration-200 ease-out starting:translate-y-3 starting:opacity-0 motion-reduce:transition-none sm:left-auto sm:right-6 sm:bottom-6 sm:w-96"
    >
      <p id="review-prompt-title" className="font-semibold text-neutral-900 dark:text-white">
        How did it go?
      </p>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
        Your download has started. If you have a minute, tell others what you
        think of PasteAndSave on Trustpilot. Good or bad, every review helps.
      </p>
      <div className="mt-3 flex gap-2">
        <a
          href={TRUSTPILOT_REVIEW_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            countReview("opened");
            onClose();
          }}
          className="flex-1 rounded-xl bg-violet-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          Write a review
        </a>
        <button
          type="button"
          onClick={() => {
            countReview("closed");
            onClose();
          }}
          className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
