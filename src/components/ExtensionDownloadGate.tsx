"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdSlot from "@/components/ads/AdSlot";

// The download button for the extension, with an ad-supported wait in front of
// it.
//
// The extension is given away and costs bandwidth to serve, so this is the one
// place on the site where asking for a few seconds of attention is fair. It is
// built to be honest about that: the wait is visible and counts down, the file
// is named and sized up front, the dialog can always be closed, and the
// download genuinely happens. No fake buttons, no second "real" download link,
// nothing that behaves differently from what it says.
//
// That is not only a decency point. A download page that tricks people gets
// reported, and both the ad network and the browser vendors act on those
// reports faster than they pay out.

const WAIT_SECONDS = 8;

type Step = "closed" | "waiting" | "started";

export default function ExtensionDownloadGate({
  href,
  sizeLabel,
}: {
  href: string;
  sizeLabel: string;
}) {
  const [step, setStep] = useState<Step>("closed");
  const [left, setLeft] = useState(WAIT_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const open = useCallback(() => {
    setStep("waiting");
    setLeft(WAIT_SECONDS);
    stop();
    timerRef.current = setInterval(() => {
      setLeft((n) => {
        if (n <= 1) {
          stop();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }, [stop]);

  const close = useCallback(() => {
    stop();
    setStep("closed");
  }, [stop]);

  useEffect(() => stop, [stop]);

  // Escape closes it. A dialog that traps someone is the kind of thing that
  // gets a site reported rather than bookmarked.
  useEffect(() => {
    if (step === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, close]);

  // Triggers the real download without navigating away, so the page — and the
  // install steps on it — stay in front of the person who needs them.
  const startDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = href;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStep("started");
  }, [href]);

  const ready = left <= 0;

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
      >
        <svg width="16" height="16" viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M20 9.5 V22" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M14.3 16.7 L20 22.6 L25.7 16.7"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M12 27.5 H28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        Download the extension
      </button>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Download the extension"
        >
          <div className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 text-left shadow-xl dark:bg-neutral-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white">
                  {step === "waiting" ? "Getting your download ready" : "Download started"}
                </h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  pasteandsave-extension.zip · {sizeLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 rounded-lg px-2 py-1 text-sm font-semibold text-neutral-500 hover:bg-black/5 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
              {step === "waiting"
                ? "The extension is free. An advert keeps it that way."
                : "Check your downloads folder. The steps to install it are below."}
            </p>

            <div className="mt-3">
              <AdSlot slot={step === "waiting" ? "extensionGate" : "extensionThanks"} />
            </div>

            {step === "waiting" ? (
              <button
                type="button"
                onClick={startDownload}
                disabled={!ready}
                className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {ready ? "Download now" : `Please wait ${left}s`}
              </button>
            ) : (
              <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
                <li>Unzip the file.</li>
                <li>
                  Open <span className="font-mono text-xs">chrome://extensions</span> and turn on
                  Developer mode.
                </li>
                <li>Click Load unpacked and pick the unzipped folder.</li>
              </ol>
            )}

            {step === "started" && (
              <button
                type="button"
                onClick={close}
                className="mt-4 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-black/5 dark:border-white/15 dark:text-neutral-200 dark:hover:bg-white/10"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
