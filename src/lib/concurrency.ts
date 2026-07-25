// Caps how many yt-dlp / ffmpeg child processes can run at once. Without this,
// a burst of requests spawns unlimited processes and exhausts the machine.

export class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

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

export const MAX_CONCURRENT_LOOKUPS = 4;
export const MAX_CONCURRENT_JOBS = 3;
// If more than this many lookups are already waiting, shed load instead of
// letting the queue grow without bound.
export const MAX_LOOKUP_QUEUE = 20;
// Longest a request will sit waiting for a free extractor slot before it is
// turned away. Kept well under the browser's own 120s ceiling so the visitor
// gets a real message instead of a dead request.
export const QUEUE_WAIT_MS = 25_000;

export const lookupLimiter = new Semaphore(MAX_CONCURRENT_LOOKUPS);
export const jobLimiter = new Semaphore(MAX_CONCURRENT_JOBS);

export class BusyError extends Error {
  constructor() {
    super("Server is busy. Try again in a moment.");
    this.name = "BusyError";
  }
}
