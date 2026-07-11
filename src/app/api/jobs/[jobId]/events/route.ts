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
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      interval = setInterval(() => {
        const job = getJob(jobId);
        if (!job) {
          send({ status: "error", error: "Job not found." });
          clearInterval(interval);
          controller.close();
          return;
        }

        send({
          status: job.status,
          percent: job.percent,
          error: job.error,
          filename: job.filename,
        });

        if (job.status === "done" || job.status === "error") {
          clearInterval(interval);
          controller.close();
        }
      }, 400);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
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
