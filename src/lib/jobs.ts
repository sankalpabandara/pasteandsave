import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  EXTRACTOR_ARGS,
  FFMPEG_DIR,
  YTDLP_PATH,
  networkArgs,
  siteArgs,
  proxyArgs,
  classifyFailure,
} from "./ytdlp";
import { BusyError, jobLimiter } from "./concurrency";

export type JobStatus =
  | "starting"
  | "downloading"
  | "converting"
  | "done"
  | "error";

export type Job = {
  id: string;
  status: JobStatus;
  percent: number;
  error?: string;
  tmpDir: string;
  filePath?: string;
  filename?: string;
  createdAt: number;
};

const jobs = new Map<string, Job>();

const JOB_TTL_MS = 15 * 60 * 1000;
const JOB_TIMEOUT_MS = 10 * 60 * 1000;

function sweepStaleJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      cleanupJob(id);
    }
  }
}

function cleanupJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;
  jobs.delete(id);
  fsp.rm(job.tmpDir, { recursive: true, force: true }).catch(() => {});
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function claimJobFile(id: string): Job | undefined {
  const job = jobs.get(id);
  if (!job || job.status !== "done") return undefined;
  return job;
}

export function finalizeJob(id: string) {
  cleanupJob(id);
}

type StartJobOptions =
  | { mode: "video"; url: string; formatId: string; title: string; hasAudio?: boolean }
  | {
      mode: "audio";
      url: string;
      title: string;
      audioFormat?: "mp3" | "m4a";
      bitrate?: number | null;
    };

export function startJob(opts: StartJobOptions): string {
  sweepStaleJobs();

  // A download holds its slot for its whole duration, so reject rather than
  // queue when the server is already at capacity.
  const release = jobLimiter.tryAcquire();
  if (!release) {
    throw new BusyError();
  }
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    release();
  };

  const id = randomUUID();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pasteandsave-"));
  const job: Job = {
    id,
    status: "starting",
    percent: 0,
    tmpDir,
    createdAt: Date.now(),
  };
  jobs.set(id, job);

  const outputTemplate = path.join(tmpDir, "file.%(ext)s");
  // The same YouTube hardening the lookup uses: without matching player
  // clients and proxy/retry flags, a download can fail even after the info
  // lookup succeeded.
  const hardening = [
    ...EXTRACTOR_ARGS,
    ...networkArgs(),
    ...siteArgs(opts.url),
    ...proxyArgs(opts.url),
  ];
  // A video-only stream (YouTube serves HD only as separate video + audio)
  // gets the best audio muxed in, so the saved file always has sound. Prefer
  // m4a audio so an MP4 pick stays a clean, widely-playable MP4; fall back to
  // any audio, then to the bare stream if the site has no separate audio.
  // Formats that already carry audio are downloaded as-is (no double track).
  const videoFormat =
    opts.mode === "video" && opts.hasAudio === false
      ? `${opts.formatId}+bestaudio[ext=m4a]/${opts.formatId}+bestaudio/${opts.formatId}`
      : opts.mode === "video"
        ? opts.formatId
        : "";
  const mergeArgs =
    opts.mode === "video" && opts.hasAudio === false
      ? ["--merge-output-format", "mp4"]
      : [];
  // M4A is taken as-is where possible (no re-encode, so no quality lost);
  // MP3 is encoded at the rate the visitor picked, defaulting to best.
  const audioFormat = opts.mode === "audio" ? (opts.audioFormat ?? "mp3") : "mp3";
  const audioQuality =
    opts.mode === "audio" && opts.bitrate ? `${opts.bitrate}K` : "0";
  const args =
    opts.mode === "audio"
      ? [
          "-x",
          "--audio-format",
          audioFormat,
          "--audio-quality",
          audioQuality,
          "--newline",
          "--no-playlist",
          "--no-warnings",
          "--ffmpeg-location",
          FFMPEG_DIR,
          ...hardening,
          "-o",
          outputTemplate,
          "--",
          opts.url,
        ]
      : [
          "-f",
          videoFormat,
          ...mergeArgs,
          "--newline",
          "--no-playlist",
          "--no-warnings",
          "--ffmpeg-location",
          FFMPEG_DIR,
          ...hardening,
          "-o",
          outputTemplate,
          "--",
          opts.url,
        ];

  const child = spawn(YTDLP_PATH, args, { windowsHide: true });

  // Kill a download that runs too long so it can't hold its slot forever.
  const killTimer = setTimeout(() => {
    job.status = "error";
    job.error = "Download timed out.";
    child.kill();
  }, JOB_TIMEOUT_MS);

  let stderrTail = "";
  const handleLine = (line: string) => {
    const dl = line.match(/\[download\]\s+([\d.]+)%/);
    if (dl) {
      job.status = "downloading";
      job.percent = Math.min(99, parseFloat(dl[1]));
      return;
    }
    if (line.includes("[ExtractAudio]") || line.includes("[Merger]") || line.includes("[VideoConvertor]")) {
      job.status = "converting";
      job.percent = 99;
    }
  };

  child.stdout.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line) handleLine(line);
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-2000);
  });

  child.on("error", (err) => {
    clearTimeout(killTimer);
    // err.message carries the binary path, so it is logged, not shown.
    console.error(`[job ${id}] spawn failed: ${err.message}`);
    job.status = "error";
    job.error = "Something went wrong on our side. Please try again.";
    fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    releaseOnce();
  });

  child.on("close", async (code) => {
    clearTimeout(killTimer);
    releaseOnce();
    if (code !== 0) {
      // Never forward stderr: yt-dlp puts the full proxy URL (credentials and
      // all) in connection errors and temp paths in write errors, and this
      // string is sent straight to the browser over SSE.
      const { category, message } = classifyFailure(stderrTail);
      console.error(
        `[job ${id}] failed category=${category} exit=${code} url_host=${safeHost(opts.url)}`,
      );
      job.status = "error";
      job.error = message;
      // A failed job keeps nothing worth downloading, so release its scratch
      // directory now rather than waiting for a later sweep that may never run.
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      return;
    }
    try {
      const files = (await fsp.readdir(tmpDir)).filter(
        (f) => !f.endsWith(".part") && !f.endsWith(".ytdl"),
      );
      if (files.length === 0) {
        console.error(`[job ${id}] no output file url_host=${safeHost(opts.url)}`);
        job.status = "error";
        job.error = "The file couldn't be prepared. Please try another quality.";
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        return;
      }
      const filePath = path.join(tmpDir, files[0]);
      const ext = path.extname(files[0]);
      job.filePath = filePath;
      job.filename = `${sanitizeFilename(opts.title)}${ext}`;
      job.percent = 100;
      job.status = "done";
    } catch (err) {
      job.status = "error";
      job.error = err instanceof Error ? err.message : "Unknown error";
    }
  });

  return id;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120) || "download";
}

// Logs identify a job by the site it targeted, never the full URL, which can
// carry tokens or identifiers in its query string.
function safeHost(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return "unknown";
  }
}
