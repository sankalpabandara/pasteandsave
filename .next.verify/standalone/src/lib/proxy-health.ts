// Keeps the proxy's exit address one that YouTube still accepts.
//
// Cloudflare WARP runs on the server itself, costs nothing and needs no machine
// at home. Its weakness is that the exit address is shared with everyone else
// on WARP, so YouTube eventually answers it with "Sign in to confirm you're not
// a bot". A fresh WARP registration comes with a fresh exit address, which
// YouTube accepts again. Measured on 2026-10-12: the flagged address passed 0
// of 3 lookups, the new one 3 of 3, seconds later.
//
// Two ways in. When a visitor's lookup or download is refused, the site swaps
// the address there and then and tries again, so the visitor gets their video
// rather than "try again in a bit". And every refusal also leaves a note for
// ops/warp-rotate.sh on cron, which covers anything the first path misses.

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const REWRITE_MS = 60_000;
let lastWrite = 0;

/** Where the note lives. Overridable so tests do not touch the real one. */
export function proxyRefusedFlagPath(): string {
  return process.env.PROXY_REFUSED_FLAG || path.join(process.cwd(), "data", "proxy-refused");
}

/**
 * Records that the proxy's address was refused, for the cron watchdog.
 * Rewritten at most once a minute, so a burst of refusals costs one write.
 * Never throws.
 */
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

// --- swapping the address while a visitor waits ---------------------------

// How long a visitor is kept waiting for a swap. The browser gives a lookup
// 120 seconds in all and the refused attempt has already used some of that.
// The script itself is never killed: stopping it between deleting the old
// registration and creating the new one would leave WARP with none at all.
// It carries on after this, and a late success still counts.
const SWAP_WAIT_MS = 90_000;

// After a swap that could not find an address YouTube accepts, every visitor
// would otherwise start another one, each costing up to eight registrations
// and the better part of a minute. Five minutes of plain failures is kinder
// to everyone, Cloudflare included.
const FAILED_SWAP_BACKOFF_MS = 5 * 60_000;

let swapping: Promise<boolean> | null = null;
let lastFailedSwap = 0;
let generation = 0;

/**
 * Counts successful swaps. A download notes it when it starts; if it has
 * changed by the time the download fails, the links it was using were signed
 * for an address that no longer exists.
 */
export function proxyGeneration(): number {
  return generation;
}

/** The rotation script, when this server can swap its proxy's address. */
export function rotateScriptPath(): string | null {
  if (process.platform === "win32") return null;
  // Only a WARP proxy on this machine can be swapped from here. A paid
  // provider or the home relay has no registration to replace.
  if (!/^socks5h?:\/\/(?:127\.0\.0\.1|localhost):\d+/i.test(process.env.YTDLP_PROXY || "")) {
    return null;
  }
  const script = process.env.WARP_ROTATE_SCRIPT || path.join(process.cwd(), "ops", "warp-rotate.sh");
  return fs.existsSync(script) ? script : null;
}

// Told when the address changes. The extractor cache subscribes, because
// every link it holds was signed for the address that just went away. A list
// of listeners rather than an import keeps this file free of the rest of the
// app, so its tests can load it on its own.
const swapListeners: Array<() => void> = [];
export function onProxySwapped(listener: () => void): void {
  swapListeners.push(listener);
}

function markSwapped(): void {
  generation++;
  for (const listener of swapListeners) {
    try {
      listener();
    } catch {
      // One listener failing must not stop the others hearing about it.
    }
  }
}

function runRotateScript(): Promise<boolean> {
  const script = rotateScriptPath();
  if (!script) return Promise.resolve(false);
  return new Promise((resolve) => {
    let answered = false;
    const answer = (ok: boolean) => {
      if (answered) return;
      answered = true;
      resolve(ok);
    };
    const child = spawn("bash", [script, "--now"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (c: Buffer) => (out += c.toString()));
    child.stderr.on("data", (c: Buffer) => (out += c.toString()));
    const timer = setTimeout(() => answer(false), SWAP_WAIT_MS);
    child.on("error", () => {
      clearTimeout(timer);
      answer(false);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      for (const line of out.split("\n")) if (line.trim()) console.log(`[warp] ${line.trim()}`);
      // Finished after the visitor stopped waiting. The address is still new
      // and the cached links still stale, so it is recorded all the same.
      if (answered && code === 0) markSwapped();
      answer(code === 0);
    });
  });
}

/**
 * Gets the proxy an exit address YouTube accepts, now. Resolves true when it
 * has one and the request is worth making again.
 *
 * Everyone refused at the same moment shares one swap: the second caller
 * waits for the first one's answer instead of starting its own.
 */
export function rotateProxyNow(
  runner: () => Promise<boolean> = runRotateScript,
  now = Date.now(),
): Promise<boolean> {
  if (swapping) return swapping;
  if (now - lastFailedSwap < FAILED_SWAP_BACKOFF_MS) return Promise.resolve(false);
  const attempt = runner()
    .catch(() => false)
    .then((ok) => {
      if (ok) markSwapped();
      else lastFailedSwap = Date.now();
      swapping = null;
      return ok;
    });
  swapping = attempt;
  return attempt;
}
