// Runs once when the Next.js server starts. Kicks off the SEO autopilot:
// recurring audits, change reports and IndexNow submissions, all in the
// background of the long-running server process with no external cron.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutopilot } = await import("./lib/seo-autopilot");
    startAutopilot();
  }
}
