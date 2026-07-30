import { getJob } from "@/lib/jobs";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;

  const encoder = new TextEncoder();
  let interval: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      // Closing twice throws, and so does writing to a closed stream. Both
      // happen here from inside a timer, where an exception is caught by
      // nothing and takes the process with it, so every exit goes through
      // this one guarded path.
      const stop = () => {
        if (closed) return;
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed by the consumer. Nothing left to do.
        }
      };

      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // The client went away between ticks. Stop rather than retry.
          stop();
        }
      };

      // A connection dropped before the stream started never fires abort,
      // because the event has already been dispatched by the time the
      // listener below is added. Without this the interval runs forever on a
      // request nobody is reading.
      if (request.signal.aborted) {
        stop();
        return;
      }

      interval = setInterval(() => {
        const job = getJob(jobId);
        if (!job) {
          send({ status: "error", error: "Job not found." });
          stop();
          return;
        }

        send({
          status: job.status,
          percent: job.percent,
          error: job.error,
          filename: job.filename,
        });

        if (job.status === "done" || job.status === "error") {
          stop();
        }
      }, 400);

      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
