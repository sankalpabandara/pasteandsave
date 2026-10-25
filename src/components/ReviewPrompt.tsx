"use client";

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  TRUSTPILOT_REVIEW_URL,
  browserStore,
  markReviewOpened,
  type ReviewAction,
} from "@/lib/review";

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
 * A centred box asking for a Trustpilot review, after a browser's first
 * download and once more on its next (see takeReviewTurn).
 *
 * It only ever opens once the download is already running, and closing it
 * ("Not now", Escape, or a click outside) leaves everything as it was.
 * Nothing is offered for a review and nothing depends on one.
 */
export default function ReviewPrompt({ onClose }: { onClose: () => void }) {
  const primary = useRef<HTMLAnchorElement>(null);
  const secondary = useRef<HTMLButtonElement>(null);
  const counted = useRef(false);

  // Once per appearance, even where React runs effects twice.
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    countReview("shown");
  }, []);

  // Focus moves into the box and goes back where it was afterwards; the page
  // behind does not scroll while it is open.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primary.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);

  function close() {
    countReview("closed");
    onClose();
  }

  function onKeyDown(e: ReactKeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    // Two controls, so Tab simply moves between them.
    if (e.key === "Tab") {
      e.preventDefault();
      const next = document.activeElement === primary.current ? secondary.current : primary.current;
      next?.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-prompt-title"
        aria-describedby="review-prompt-text"
        onKeyDown={onKeyDown}
        className="glass-strong w-full max-w-md rounded-2xl p-6 text-center shadow-2xl transition-[opacity,scale] duration-200 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none"
      >
        <p id="review-prompt-title" className="font-display text-xl font-bold text-neutral-900 dark:text-white">
          How did it go?
        </p>
        <p id="review-prompt-text" className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
          Your download has started. If you have a minute, tell others what you
          think of PasteAndSave on Trustpilot. Good or bad, every review helps.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <a
            ref={primary}
            href={TRUSTPILOT_REVIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              countReview("opened");
              markReviewOpened(browserStore());
              onClose();
            }}
            className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
          >
            Write a review
          </a>
          <button
            ref={secondary}
            type="button"
            onClick={close}
            className="flex-1 rounded-xl border border-black/10 px-4 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
