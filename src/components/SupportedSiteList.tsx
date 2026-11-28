"use client";

import { useMemo, useState } from "react";

// The whole list is in the markup from the start. The box only hides rows
// that do not match, so a crawler and a reader with no JavaScript still get
// every name, and a visitor who types gets an answer with no request.
export default function SupportedSiteList({ sites }: { sites: string[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle ? sites.filter((s) => s.toLowerCase().includes(needle)) : sites;
    const byLetter = new Map<string, string[]>();
    for (const site of matched) {
      const first = site[0].toUpperCase();
      const letter = first >= "A" && first <= "Z" ? first : "0 to 9";
      const bucket = byLetter.get(letter);
      if (bucket) bucket.push(site);
      else byLetter.set(letter, [site]);
    }
    return [...byLetter.entries()].sort((a, b) =>
      a[0] === "0 to 9" ? -1 : b[0] === "0 to 9" ? 1 : a[0].localeCompare(b[0]),
    );
  }, [query, sites]);

  const shown = groups.reduce((n, [, names]) => n + names.length, 0);

  return (
    <div>
      <div className="mx-auto max-w-md">
        <label htmlFor="site-filter" className="sr-only">
          Search the list of sites
        </label>
        <input
          id="site-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type a site name, for example Vimeo"
          autoComplete="off"
          className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-violet-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
        <p className="mt-2 text-center text-xs text-neutral-500 dark:text-neutral-400" aria-live="polite">
          {query.trim()
            ? shown === 0
              ? "Nothing in the list matches that. Paste the link anyway, it may still work."
              : `${shown.toLocaleString("en-US")} of ${sites.length.toLocaleString("en-US")} sites match`
            : `${sites.length.toLocaleString("en-US")} sites`}
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {groups.map(([letter, names]) => (
          <section key={letter}>
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
              {letter}
            </h3>
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm text-neutral-600 sm:grid-cols-3 lg:grid-cols-4 dark:text-neutral-400">
              {names.map((name) => (
                <li key={name} className="truncate" title={name}>
                  {name}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
