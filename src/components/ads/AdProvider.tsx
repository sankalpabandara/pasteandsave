"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AD_GATE_COOLDOWN_MS,
  AD_GATE_MIN_MS,
  AD_SLOTS,
  ADS_ENABLED,
} from "@/lib/ads";

type AdContextValue = {
  /**
   * Resolves after the interstitial ad has been shown, or immediately when
   * ads are disabled / unconfigured / still within the cooldown window. It
   * never blocks the underlying action from eventually running.
   */
  gate: () => Promise<void>;
};

const AdContext = createContext<AdContextValue>({ gate: async () => {} });
export const useAdGate = () => useContext(AdContext);

const LAST_SHOWN_KEY = "ad-gate-last";

export function AdProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [canContinue, setCanContinue] = useState(false);
  const resolveRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
    setCanContinue(false);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.();
  }, []);

  const gate = useCallback(() => {
    return new Promise<void>((resolve) => {
      const cfg = AD_SLOTS.interstitial;
      // No-op when ads are off or this slot has no unit id yet.
      if (!ADS_ENABLED || !cfg.unitId.trim()) {
        resolve();
        return;
      }
      // Frequency cap: don't interrupt the same user repeatedly.
      let last = 0;
      try {
        last = Number(localStorage.getItem(LAST_SHOWN_KEY) || "0");
      } catch {
        // ignore
      }
      if (Date.now() - last < AD_GATE_COOLDOWN_MS) {
        resolve();
        return;
      }
      try {
        localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      resolveRef.current = resolve;
      setCanContinue(false);
      setOpen(true);
      timerRef.current = setTimeout(() => setCanContinue(true), AD_GATE_MIN_MS);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cfg = AD_SLOTS.interstitial;

  return (
    <AdContext.Provider value={{ gate }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-label="Advertisement"
        >
          <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-4 shadow-xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-widest text-neutral-400">
                Advertisement
              </span>
              <button
                type="button"
                onClick={finish}
                aria-label="Close ad"
                className="grid h-6 w-6 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5"
              >
                ✕
              </button>
            </div>
            <div
              className="mx-auto mt-2 overflow-hidden rounded-xl bg-neutral-50 dark:bg-neutral-950/40"
              style={{ height: cfg.height, maxWidth: cfg.maxWidth, width: "100%" }}
            >
              <iframe
                title="Advertisement"
                data-aa={cfg.unitId}
                src={`//acceptable.a-ads.com/${cfg.unitId}`}
                referrerPolicy="no-referrer"
                style={{
                  border: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  backgroundColor: "transparent",
                }}
              />
            </div>
            <button
              type="button"
              onClick={finish}
              disabled={!canContinue}
              className="mt-3 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {canContinue ? "Continue" : "Please wait…"}
            </button>
          </div>
        </div>
      )}
    </AdContext.Provider>
  );
}
