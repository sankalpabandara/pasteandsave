"use client";

import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "terms-accepted-v1";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// The server can't read localStorage, so it assumes accepted (gate hidden)
// to avoid a layout flash; the real value is picked up on the client via
// useSyncExternalStore without triggering a hydration-mismatch warning.
function getServerSnapshot() {
  return true;
}

function accept() {
  localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  listeners.forEach((listener) => listener());
}

export default function TermsGate() {
  const pathname = usePathname();
  const accepted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [checked, setChecked] = useState(false);

  if (accepted || pathname?.startsWith("/admin")) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-black/5 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-900">
        <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
          Before you continue
        </h2>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          PasteAndSave is meant for content you have the right to download. You
          are responsible for what you save and how you use it. Please read
          our{" "}
          <a href="/terms" target="_blank" className="font-medium text-violet-600 underline dark:text-violet-400">
            Terms of Service
          </a>{" "}
          before you continue.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-violet-600 focus:ring-violet-500 dark:border-neutral-600"
          />
          <span>
            I confirm I have the right to download the content I use this
            for, and I agree to the Terms of Service.
          </span>
        </label>
        <button
          type="button"
          onClick={accept}
          disabled={!checked}
          className="mt-5 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Agree & Continue
        </button>
      </div>
    </div>
  );
}
