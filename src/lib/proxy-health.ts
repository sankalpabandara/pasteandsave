// Tells the server's WARP watchdog that a site has started refusing the
// proxy's exit address.
//
// Cloudflare WARP runs on the server itself, costs nothing and needs no machine
// at home. Its weakness is that the exit address is shared with everyone else
// on WARP, so YouTube eventually answers it with "Sign in to confirm you're not
// a bot". A fresh WARP registration comes with a fresh exit address, which
// YouTube accepts again. Measured on 2026-10-12: the flagged address passed 0
// of 3 lookups, the new one 3 of 3, seconds later.
//
// Swapping the registration needs root and warp-cli, which belong to the
// server rather than to the app. So the app only leaves a note, and
// ops/warp-rotate.sh, on cron, reads it and does the swap. The note is a plain
// file for that reason, rewritten at most once a minute so a burst of refused
// lookups costs one write.

import fs from "node:fs";
import path from "node:path";

const REWRITE_MS = 60_000;
let lastWrite = 0;

/** Where the note lives. Overridable so tests do not touch the real one. */
export function proxyRefusedFlagPath(): string {
  return process.env.PROXY_REFUSED_FLAG || path.join(process.cwd(), "data", "proxy-refused");
}

/** Records that the proxy's address was refused. Never throws. */
export function noteProxyRefused(host: string, now = Date.now()): void {
  if (now - lastWrite < REWRITE_MS) return;
  lastWrite = now;
  const flag = proxyRefusedFlagPath();
  try {
    fs.mkdirSync(path.dirname(flag), { recursive: true });
    fs.writeFileSync(flag, `${new Date(now).toISOString()} ${host}\n`);
  } catch {
    // A missed note costs a slower recovery, never a download.
  }
}
