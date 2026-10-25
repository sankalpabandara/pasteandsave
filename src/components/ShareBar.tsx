"use client";

import { useState } from "react";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SHARE_TEXT, shareHref, sharedLink, type ShareChannel } from "@/lib/share";

// Counted by channel, so the admin page can show which ones people use.
function countShare(via: ShareChannel) {
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ share: via }),
    keepalive: true,
  }).catch(() => {});
}

const LINK_CHANNELS: { via: ShareChannel; label: string }[] = [
  { via: "whatsapp", label: "WhatsApp" },
  { via: "telegram", label: "Telegram" },
  { via: "facebook", label: "Facebook" },
  { via: "x", label: "X" },
];

const BUTTON =
  "rounded-lg border border-black/10 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5";

/**
 * Shown under the result once a download has started: the moment a visitor
 * has just seen the site work is the moment they are most likely to pass it on.
 * Only ever rendered after a click, so reading navigator here never differs
 * between the server and the browser.
 */
export default function ShareBar() {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const [canShare] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );

  async function copyLink() {
    countShare("copy");
    try {
      await navigator.clipboard.writeText(sharedLink(SITE_URL, "copy"));
      setCopy("copied");
      setTimeout(() => setCopy("idle"), 2500);
    } catch {
      setCopy("failed");
    }
  }

  async function nativeShare() {
    countShare("native");
    try {
      await navigator.share({ title: SITE_NAME, text: SHARE_TEXT, url: sharedLink(SITE_URL, "native") });
    } catch {
      // Closed without sending. Nothing to do.
    }
  }

  return (
    <div className="glass glass-hairline mt-4 rounded-2xl p-4">
      <p className="text-sm font-medium text-neutral-900 dark:text-white">
        Download started. If it helped, share {SITE_NAME} with a friend.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={nativeShare} className={`${BUTTON} border-violet-600 bg-violet-600 text-white hover:bg-violet-700 dark:border-violet-600 dark:text-white dark:hover:bg-violet-700`}>
            Share
          </button>
        )}
        {LINK_CHANNELS.map(({ via, label }) => (
          <a
            key={via}
            href={shareHref(SITE_URL, via) ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => countShare(via)}
            className={BUTTON}
          >
            {label}
          </a>
        ))}
        <button type="button" onClick={copyLink} className={BUTTON}>
          {copy === "copied" ? "Link copied" : "Copy link"}
        </button>
      </div>
      <p aria-live="polite" className="sr-only">
        {copy === "copied" ? "Link copied" : ""}
      </p>
      {copy === "failed" && (
        <p className="mt-2 select-all break-all text-xs text-neutral-500 dark:text-neutral-400">
          {sharedLink(SITE_URL, "copy")}
        </p>
      )}
    </div>
  );
}
