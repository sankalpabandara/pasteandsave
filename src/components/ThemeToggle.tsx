"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

// The server can't know the user's stored preference, so it always renders
// light; ThemeScript applies the real class before hydration and this store
// picks it up on the client without a hydration-mismatch warning.
function getServerSnapshot() {
  return false;
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("theme", dark ? "dark" : "light");
  listeners.forEach((listener) => listener());
}

export default function ThemeToggle() {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <button
      type="button"
      onClick={() => setTheme(!dark)}
      aria-label="Toggle dark mode"
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <path d="M20.7 14.9A9 9 0 1 1 9.1 3.3a7 7 0 0 0 11.6 11.6Z" />
        </svg>
      )}
    </button>
  );
}
