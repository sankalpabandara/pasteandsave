"use client";

import { useEffect, useRef, useState } from "react";

type Option = { locale: string; name: string; href: string };

/**
 * The language switcher in the header. Choosing a language stores it in the
 * "lang" cookie before leaving, so the server keeps to it from then on and
 * never moves the visitor back to the language of their country. The links
 * are plain page loads rather than in-app navigation, so the server sees the
 * new cookie on the very next request.
 */
export default function LanguageMenu({
  current,
  options,
  label,
}: {
  current: string;
  options: Option[];
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-2.5 text-xs font-semibold uppercase text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
        </svg>
        {current}
      </button>
      {open && (
        <ul className="glass-strong glass-hairline absolute end-0 top-full z-40 mt-2 min-w-44 overflow-hidden rounded-2xl py-1">
          {options.map((o) => (
            <li key={o.locale}>
              <a
                href={o.href}
                lang={o.locale}
                aria-current={o.locale === current ? "true" : undefined}
                onClick={() => {
                  document.cookie = `lang=${o.locale}; path=/; max-age=31536000; samesite=lax`;
                }}
                className={`block px-4 py-2.5 text-sm transition hover:bg-white/40 dark:hover:bg-white/5 ${
                  o.locale === current
                    ? "font-semibold text-violet-700 dark:text-violet-300"
                    : "text-neutral-800 dark:text-neutral-200"
                }`}
              >
                {o.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
