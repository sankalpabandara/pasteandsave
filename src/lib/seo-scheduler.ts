import { maybeRunWeekly } from "./seo-history";

// Runs the weekly SEO audit in the background of the long-running server
// process, so no external cron is needed. It checks a few times a day and
// only crawls when a new weekly snapshot is actually due.

let started = false;

export function startSeoScheduler() {
  if (started) return;
  started = true;

  const tick = () => {
    maybeRunWeekly().catch(() => {
      // never let a failed audit crash the process
    });
  };

  // First catch-up shortly after boot, once the server can serve its own pages.
  setTimeout(tick, 15_000).unref?.();
  // Then check every 6 hours; maybeRunWeekly only crawls when due.
  setInterval(tick, 6 * 60 * 60 * 1000).unref?.();
}
