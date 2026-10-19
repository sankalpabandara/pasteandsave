import type fs from "node:fs";

/**
 * A file as a web stream, with every write and close guarded.
 *
 * Readable.toWeb did this before, and when a visitor cancelled a download part
 * way it went on writing to the stream after the browser had closed it. That
 * throws "Invalid state: Controller is already closed" from inside Node's own
 * adapter, where nothing catches it, and the log carried it as an
 * uncaughtException. Here a closed stream simply stops the file being read.
 *
 * No relative imports, so the tests can load it directly.
 */
export function fileStream(node: fs.ReadStream): ReadableStream<Uint8Array> {
  let done = false;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const end = (fn: () => void) => {
        if (done) return;
        done = true;
        try {
          fn();
        } catch {
          // The reader already went away.
        }
      };
      node.on("data", (chunk) => {
        if (done) return;
        try {
          controller.enqueue(typeof chunk === "string" ? new TextEncoder().encode(chunk) : new Uint8Array(chunk));
          // Hold the file until the visitor's connection asks for more.
          if ((controller.desiredSize ?? 1) <= 0) node.pause();
        } catch {
          done = true;
          node.destroy();
        }
      });
      node.on("end", () => end(() => controller.close()));
      node.on("error", (err) => end(() => controller.error(err)));
    },
    pull() {
      if (!done) node.resume();
    },
    cancel() {
      done = true;
      node.destroy();
    },
  });
}
