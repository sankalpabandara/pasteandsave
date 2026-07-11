// Runs once when the Next.js server starts. Used to kick off the background
// weekly SEO audit scheduler.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSeoScheduler } = await import("./lib/seo-scheduler");
    startSeoScheduler();
  }
}
