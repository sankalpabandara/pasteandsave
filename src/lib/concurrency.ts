// Caps how many yt-dlp / ffmpeg child processes can run at once. Without this,
// a burst of requests spawns unlimited processes and exhausts the machine.

export class Semaphore {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  /** Waits for a slot. Returns a release function. */
  acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve(() => this.release());
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
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

export const lookupLimiter = new Semaphore(MAX_CONCURRENT_LOOKUPS);
export const jobLimiter = new Semaphore(MAX_CONCURRENT_JOBS);

export class BusyError extends Error {
  constructor() {
    super("Server is busy. Try again in a moment.");
    this.name = "BusyError";
  }
}
