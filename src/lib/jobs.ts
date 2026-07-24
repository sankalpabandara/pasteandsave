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
  isBlockedByPlatform,
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
  | { mode: "audio"; url: string; title: string };

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
  const args =
    opts.mode === "audio"
      ? [
          "-x",
          "--audio-format",
          "mp3",
          "--audio-quality",
          "0",
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
    job.status = "error";
    job.error = err.message;
    releaseOnce();
  });

  child.on("close", async (code) => {
    clearTimeout(killTimer);
    releaseOnce();
    if (code !== 0) {
      job.status = "error";
      job.error = isBlockedByPlatform(stderrTail)
        ? "This site is rate-limiting our server right now. Give it a minute and try again."
        : stderrTail.trim().split("\n").pop() || `yt-dlp exited with code ${code}`;
      return;
    }
    try {
      const files = (await fsp.readdir(tmpDir)).filter(
        (f) => !f.endsWith(".part") && !f.endsWith(".ytdl"),
      );
      if (files.length === 0) {
        job.status = "error";
        job.error = "No output file was produced.";
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
