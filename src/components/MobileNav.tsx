"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Phone navigation: a hamburger that opens a glass dropdown with full-width
// touch targets. Desktop keeps the inline links; this renders only below sm.
export default function MobileNav({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close when tapping outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
    <div ref={rootRef} className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-9 w-9 place-items-center rounded-xl text-neutral-700 transition hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path d="M3 6 H17 M3 10 H17 M3 14 H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      {open && (
        <nav className="glass-strong glass-hairline absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl">
          <ul className="divide-y divide-[var(--hairline)]">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-5 py-3.5 text-sm font-medium text-neutral-800 transition hover:bg-white/40 hover:text-violet-700 dark:text-neutral-200 dark:hover:bg-white/5 dark:hover:text-violet-300"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
