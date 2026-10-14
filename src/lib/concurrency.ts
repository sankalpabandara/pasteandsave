// Caps how many yt-dlp / ffmpeg child processes can run at once. Without this,
// a burst of requests spawns unlimited processes and exhausts the machine.

// Plain fields rather than constructor parameter properties, here and below:
// Node's built-in TypeScript loader, which the tests run on, does not accept
// those, and this file was untestable until they went.
export class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  /**
   * Waits for a slot. Returns a release function.
   *
   * A queued caller gives up after timeoutMs rather than waiting forever:
   * behind a full queue of slow lookups the wait alone can outlast the
   * browser's own timeout, which showed up as a request that hung and then
   * died with no useful explanation. Failing fast lets the caller say
   * "server busy" while the answer is still worth something.
   */
  acquire(timeoutMs = 0): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve(() => this.release());
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const grant = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.active++;
        resolve(() => this.release());
      };
      const timer = timeoutMs
        ? setTimeout(() => {
            if (settled) return;
            settled = true;
            // Drop the waiter so a later release doesn't hand it a slot.
            const i = this.queue.indexOf(grant);
            if (i !== -1) this.queue.splice(i, 1);
            reject(new BusyError());
          }, timeoutMs)
        : undefined;
      this.queue.push(grant);
    });
  }

  /** Takes a slot only if one is free right now. Returns null if full. */
  tryAcquire(): (() => void) | null {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    return null;
  }

  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }

  get activeCount() {
    return this.active;
  }

  get queueLength() {
    return this.queue.length;
  }
}

/**
 * Caps how many slots any one visitor can hold.
 *
 * The download pool is three slots for the whole site and a download can hold
 * one for ten minutes. The per-minute rate limit does not help with that: one
 * address starting three long downloads stays well inside it and leaves every
 * other visitor told the server is busy until they finish. Two each leaves
 * room for someone else, and still lets people behind one shared mobile
 * address, which is common here, download side by side.
 */
export class PerKeyLimit {
  private readonly held = new Map<string, number>();
  private readonly max: number;

  constructor(max: number) {
    this.max = max;
  }

  /** Takes one for this key, or returns null when it already holds its share. */
  tryTake(key: string): (() => void) | null {
    const n = this.held.get(key) ?? 0;
    if (n >= this.max) return null;
    this.held.set(key, n + 1);
    let returned = false;
    return () => {
      if (returned) return;
      returned = true;
      const left = (this.held.get(key) ?? 1) - 1;
      // Deleted at zero, so the map holds only visitors with something running.
      if (left <= 0) this.held.delete(key);
      else this.held.set(key, left);
    };
  }

  heldBy(key: string): number {
    return this.held.get(key) ?? 0;
  }
}

export const MAX_CONCURRENT_LOOKUPS = 4;
export const MAX_CONCURRENT_JOBS = 3;
export const MAX_JOBS_PER_VISITOR = 2;
// If more than this many lookups are already waiting, shed load instead of
// letting the queue grow without bound.
export const MAX_LOOKUP_QUEUE = 20;
// Longest a request will sit waiting for a free extractor slot before it is
// turned away. Kept well under the browser's own 120s ceiling so the visitor
// gets a real message instead of a dead request.
export const QUEUE_WAIT_MS = 25_000;

export const lookupLimiter = new Semaphore(MAX_CONCURRENT_LOOKUPS);
export const jobLimiter = new Semaphore(MAX_CONCURRENT_JOBS);
export const jobsPerVisitor = new PerKeyLimit(MAX_JOBS_PER_VISITOR);

export class BusyError extends Error {
  constructor() {
    super("Server is busy. Try again in a moment.");
    this.name = "BusyError";
  }
}

/** This visitor already has as many downloads running as one person may. */
export class VisitorBusyError extends Error {
  constructor() {
    super("You already have two downloads running. Let one finish, then start the next.");
    this.name = "VisitorBusyError";
  }
}
