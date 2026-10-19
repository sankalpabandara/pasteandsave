import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import {
  EXTRACTOR_ARGS,
  FFMPEG_DIR,
  YTDLP_PATH,
  networkArgs,
  siteArgs,
  proxyArgs,
  classifyFailure,
  proxyAvailable,
  forceProxyArgs,
  extractorFingerprint,
  worthProxyRetry,
  plainProxyArgs,
  looksLikeProxyAuthFailure,
  isAddressRefused,
  exitBroke,
  exitUnreachable,
  failureFingerprint,
  isYouTube,
} from "./ytdlp";
import { noteProxyRefused, proxyGeneration, rotateProxyNow } from "./proxy-health";
import { BusyError, VisitorBusyError, jobLimiter, jobsPerVisitor } from "./concurrency";
import { pickProbeUrl, cdnAcceptsDirect } from "./cdn-probe";
import { recordProxyUsage } from "./proxy-budget";
import { infoExit, takeInfo } from "./info-cache";
import { markExitBad, markExitBadFor, pickExit, poolActive } from "./proxy-pool";
import { hostNeedsProxy, shouldTryDirect } from "./proxy-routing";

/**
 * Sites whose downloads replay the lookup's own links instead of reading the
 * page a second time.
 *
 * Facebook gives different answers to different addresses: most reels come
 * back with around 11 formats, but reel 1147657863865665 had no video at all
 * for this server and only 2 formats through WARP. A download that read the page
 * again could get no video where the lookup got one, or a format list without
 * the quality the visitor picked, which is what the logged FORMAT_UNAVAILABLE
 * failures were. Its CDN links are not tied to the address that fetched them
 * (an HD file read through WARP downloaded direct in 3 seconds), so replaying
 * them is safe. Kept to Facebook: other sites, TikTok for one, need what the
 * extraction set up along with the links.
 */
function reusesLookup(rawUrl: string): boolean {
  try {
    return /(?:^|\.)(?:facebook\.com|fb\.watch|fb\.com)$/i.test(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

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
// A ceiling on the metadata read alone. The whole-job timeout is ten minutes,
// which is far too long to sit on a proxy connection that has gone quiet: it
// spends the visitor's patience before falling back to something that works.
const EXTRACT_TIMEOUT_MS = 75 * 1000;

// The extracted metadata. Three places have to know this is not a downloaded
// file: the retry cleanup, the output picker, and the sweep.
const INFO_NAME = "info.json";

// Job folders are named with this prefix so orphans can be recognised later.
const TMP_PREFIX = "pasteandsave-";

// yt-dlp here is a self-unpacking build: the process started is a small
// loader, the real work runs in a child of it, and that runs ffmpeg in turn.
// Killing the loader alone left the rest running with no parent: on
// 15 October a download stopped at its ten-minute deadline was still fetching
// four minutes later. So each yt-dlp starts as the head of its own process
// group, and the whole group is stopped together.
const OWN_GROUP = process.platform !== "win32";

function stopTree(child: ChildProcess | null, signal: NodeJS.Signals = "SIGKILL"): void {
  if (!child || child.exitCode !== null) return;
  try {
    if (OWN_GROUP && child.pid) process.kill(-child.pid, signal);
    else child.kill(signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // already gone
    }
  }
}

// A download through a pool exit that is crawling moves to another exit
// rather than eating the job's deadline. On 15 October one exit passed every
// YouTube test and still delivered 0.1 MB/s, and a 1080p download on it ran
// out of time. After 20 seconds, an expected finish more than six minutes away
// means the exit is the problem.
const SLOW_CHECK_AFTER_MS = 20_000;
const SLOW_ETA_SECONDS = 6 * 60;

// Removes job folders left behind by a previous run of the process.
//
// A finished job deletes its own folder, and a stalled one is swept by TTL,
// but both rely on the job map, which lives in memory. A restart, a crash or a
// deploy loses that map while the folders stay on disk, holding a part-written
// video each. Nothing ever came back for them, so on a server that restarts
// regularly they only accumulate, and at forty-odd megabytes a download that
// fills a disk quietly.
//
// Only folders older than the job TTL are touched. Anything younger could
// belong to a download running right now.
//
// Directories only, and that is not a detail. The deploy script keeps its
// flock at /tmp/pasteandsave-deploy.lock, which shares this prefix and is a
// file. Deleting it would not stop the deploy holding the lock, but the next
// one would create a new file, take the lock on a different inode, and run at
// the same time as the first, which is the exact thing that lock prevents.
// mkdtemp only ever makes directories, so requiring one separates our folders
// from anything else that happens to be named alike.
// yt-dlp's own leftovers are swept too. The Linux build is a self-unpacking
// archive: every run unpacks about 82 MB into /tmp/_MEIxxxxxx and removes it
// on a normal exit, but a process killed outright cannot, and every timeout,
// restart and health check that killed one left its folder behind. By
// 12 October there were 598 of them holding 27 GB. Two hours is far longer
// than any yt-dlp run here lasts, so anything older is abandoned.
const MEI_PREFIX = "_MEI";
const MEI_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export function sweepOrphanedTmpDirs(root = os.tmpdir(), now = Date.now()): number {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return 0;
  }
  let removed = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const ours = entry.name.startsWith(TMP_PREFIX);
    const ytdlp = entry.name.startsWith(MEI_PREFIX);
    if (!ours && !ytdlp) continue;
    const cutoff = now - (ours ? JOB_TTL_MS : MEI_MAX_AGE_MS);
    const dir = path.join(root, entry.name);
    try {
      if (fs.statSync(dir).mtimeMs > cutoff) continue;
      fs.rmSync(dir, { recursive: true, force: true });
      removed++;
    } catch {
      // Someone else's folder, or already gone. Neither is our problem.
    }
  }
  if (removed > 0) {
    console.log(`[jobs] cleared ${removed} abandoned temp folder(s)`);
  }
  return removed;
}

// Once when the server starts, then every hour, because yt-dlp leaves a
// folder behind whenever one is killed, not only across restarts.
sweepOrphanedTmpDirs();
setInterval(() => sweepOrphanedTmpDirs(), 60 * 60 * 1000).unref?.();

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

// owner is who asked, the visitor's address, so one person cannot hold every
// download slot. Optional so callers with no visitor behind them still work.
type StartJobOptions = { owner?: string } & (
  | { mode: "video"; url: string; formatId: string; title: string; hasAudio?: boolean }
  | {
      mode: "audio";
      url: string;
      title: string;
      audioFormat?: "mp3" | "m4a";
      bitrate?: number | null;
    }
);

export function startJob(opts: StartJobOptions): string {
  sweepStaleJobs();

  // This visitor's share first, so someone already at their limit is told
  // that, rather than taking a site-wide slot only to give it back.
  const releaseOwner = opts.owner ? jobsPerVisitor.tryTake(opts.owner) : () => {};
  if (!releaseOwner) {
    throw new VisitorBusyError();
  }
  // A download holds its slot for its whole duration, so reject rather than
  // queue when the server is already at capacity.
  const release = jobLimiter.tryAcquire();
  if (!release) {
    releaseOwner();
    throw new BusyError();
  }
  let released = false;
  const releaseOnce = () => {
    if (released) return;
    released = true;
    release();
    releaseOwner();
  };

  const id = randomUUID();
  // A full disk or a missing tmp folder throws here, after both slots were
  // taken and before anything exists that would give them back. Without this
  // each such failure lost a site-wide download slot until the next restart.
  let tmpDir: string;
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), TMP_PREFIX));
  } catch (err) {
    releaseOnce();
    throw err;
  }
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
  const hardeningWith = (proxyFlags: string[]) => [
    ...EXTRACTOR_ARGS,
    ...networkArgs(),
    ...siteArgs(opts.url),
    ...proxyFlags,
  ];
  // A video-only stream (YouTube serves HD only as separate video + audio)
  // gets the best audio muxed in, so the saved file always has sound. Prefer
  // m4a audio so an MP4 pick stays a clean, widely-playable MP4; fall back to
  // any audio, then to the bare stream if the site has no separate audio.
  // Formats that already carry audio are downloaded as-is (no double track).
  // Facebook can hand a second reading of the page a different format list (see
  // reusesLookup). Should a download ever have to read it again, the best of
  // what is there beats failing over a format id that address was not given.
  const lastResort = reusesLookup(opts.url) ? "/bv*+ba/b" : "";
  const videoFormat =
    opts.mode === "video" && opts.hasAudio === false
      ? `${opts.formatId}+bestaudio[ext=m4a]/${opts.formatId}+bestaudio/${opts.formatId}${lastResort}`
      : opts.mode === "video"
        ? `${opts.formatId}${lastResort}`
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
  // Where yt-dlp is told to get the video from. With a metadata file it reuses
  // the links already extracted instead of asking the site again, which is
  // what lets the media be fetched without the proxy that the extraction
  // needed.
  const sourceArgs = (infoJson: string | null) =>
    infoJson ? ["--load-info-json", infoJson] : ["--", opts.url];

  const buildArgs = (proxyFlags: string[], infoJson: string | null = null) =>
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
          ...hardeningWith(proxyFlags),
          "-o",
          outputTemplate,
          ...sourceArgs(infoJson),
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
          ...hardeningWith(proxyFlags),
          "-o",
          outputTemplate,
          ...sourceArgs(infoJson),
        ];

  let current: ReturnType<typeof spawn> | null = null;
  let stderrTail = "";
  // One sticky proxy session for the whole job. proxyArgs mints a new session
  // on every call, and a link signed for one session's address is refused
  // from another's, so extraction and any proxied fetch must share one.
  //
  // Empty when the lookup established this site answers without a proxy. That
  // matters for more than cost: whichever address fetched the links is the
  // address they are signed for, so extraction and the media fetch have to
  // agree. Extracting directly and then falling back to the proxy for the
  // media would present links from one address while connecting from another.
  // Same fingerprint the lookup used, or this asks a different question and gets
  // a different answer: without it the verdict never matches, every download
  // goes direct, and the links signed for the proxy's address are presented from
  // ours.
  //
  // With the WARP pool, the exit the lookup used, so the download presents
  // links from the address that fetched them; otherwise the next healthy one.
  // Undefined when there is no pool, which means the single configured proxy.
  const direct = shouldTryDirect(safeHost(opts.url), extractorFingerprint());
  const host = safeHost(opts.url);
  let currentExit: string | undefined = direct ? undefined : (infoExit(opts.url) ?? pickExit([], undefined, host));
  const triedExits: string[] = currentExit ? [currentExit] : [];
  // Proxy flags for one exit. A site off the proxy list gets none from
  // proxyArgs, so once it has proved it needs an exit it is given one outright.
  const onList = hostNeedsProxy(opts.url);
  const exitArgs = (exit?: string) => (onList ? proxyArgs(opts.url, exit) : forceProxyArgs(opts.url, exit));
  let jobProxy = direct ? [] : proxyArgs(opts.url, currentExit);
  // A site off the list whose lookup only worked through a pool exit, such as
  // a Facebook reel held back from this address: the download reads from the
  // same exit rather than finding out the hard way.
  const lookupExit = onList ? undefined : infoExit(opts.url);
  if (lookupExit) {
    currentExit = lookupExit;
    triedExits.push(lookupExit);
    jobProxy = exitArgs(lookupExit);
  }
  let triedProxyFallback = false;
  let triedPlainProxy = false;
  // Fresh starts through the proxy, below. Two at most, so a download that
  // keeps failing still ends inside its deadline, and the proxy's address is
  // swapped at most once per download.
  let freshStarts = 0;
  let swappedForJob = false;
  // YouTube can refuse an address for video files while still answering its
  // lookups: on 15 October every download got HTTP 403 while the quality
  // lists kept coming back. A first 403 is usually stale links, which a fresh
  // start fixes. One that survives a fresh start with new links is the
  // address, and only a new one helps.
  //
  // YouTube downloads now always fetch fresh links in the same run (see the
  // start of the job below), so for YouTube there is no stale-link case left:
  // a 403 on the file is the address, the first time.
  const mediaRefused = (stderr: string) => isYouTube(opts.url) && /HTTP Error 403/i.test(stderr);
  // Which proxy address this download began on. If it changes underneath, the
  // links it holds were signed for an address that is gone.
  const startGeneration = proxyGeneration();

  // One deadline for the whole job, retry included, so a download can never
  // hold its slot indefinitely.
  const killTimer = setTimeout(() => {
    job.status = "error";
    job.error = "That took too long and was stopped. Please try again.";
    stopTree(current);
  }, JOB_TIMEOUT_MS);

  // When the current run's file transfer began, and whether it was stopped
  // for crawling. Reset at the start of every run.
  let downloadStartedAt = 0;
  let slowExit = false;

  const finish = () => {
    clearTimeout(killTimer);
    releaseOnce();
  };

  // Drop whatever the failed attempt wrote so the retry starts clean and
  // cannot pick up a half-written file as its result.
  const clearTmp = async () => {
    try {
      for (const f of await fsp.readdir(tmpDir)) {
        // The metadata is what a retry reads its links from, and it cost
        // proxy data to fetch. Clearing it would both break the retry and
        // pay for it twice.
        if (f === INFO_NAME) continue;
        await fsp.rm(path.join(tmpDir, f), { force: true, recursive: true });
      }
    } catch {
      // nothing written yet
    }
  };

  const handleLine = (line: string) => {
    const dl = line.match(/\[download\]\s+([\d.]+)%/);
    if (dl) {
      job.status = "downloading";
      job.percent = Math.min(99, parseFloat(dl[1]));
      if (currentExit && !slowExit) {
        if (!downloadStartedAt) downloadStartedAt = Date.now();
        // "ETA 49:59" or "ETA 1:02:03"
        const eta = /ETA\s+(?:(\d+):)?(\d+):(\d+)/.exec(line);
        if (eta && Date.now() - downloadStartedAt > SLOW_CHECK_AFTER_MS) {
          const seconds = Number(eta[1] ?? 0) * 3600 + Number(eta[2]) * 60 + Number(eta[3]);
          if (seconds > SLOW_ETA_SECONDS) {
            slowExit = true;
            console.warn(`[job ${id}] pool exit is crawling (ETA ${seconds}s), moving to another`);
            stopTree(current);
          }
        }
      }
      return;
    }
    if (line.includes("[ExtractAudio]") || line.includes("[Merger]") || line.includes("[VideoConvertor]")) {
      job.status = "converting";
      job.percent = 99;
    }
  };

  const run = (proxyFlags: string[], infoJson: string | null = null) => {
    downloadStartedAt = 0;
    slowExit = false;
    const child = spawn(YTDLP_PATH, buildArgs(proxyFlags, infoJson), {
      windowsHide: true,
      detached: OWN_GROUP,
    });
    current = child;

    child.stdout.on("data", (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (line) handleLine(line);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-2000);
    });

    child.on("error", (err) => {
      // err.message carries the binary path, so it is logged, not shown.
      console.error(`[job ${id}] spawn failed: ${err.message}`);
      job.status = "error";
      job.error = "Something went wrong on our side. Please try again.";
      fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      finish();
    });

    child.on("close", async (code) => {
      // Read now: the next run resets it.
      const wasSlow = slowExit;
      if (code !== 0) {
        // A rejected proxy login means the sticky session suffix was not
        // understood by the provider, not that the site refused us.
        if (
          !triedPlainProxy &&
          proxyFlags.length > 0 &&
          looksLikeProxyAuthFailure(stderrTail) &&
          job.status !== "error"
        ) {
          triedPlainProxy = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(`[job ${id}] proxy rejected the sticky session, retrying plain`);
          await clearTmp();
          run(plainProxyArgs(), infoJson);
          return;
        }

        // The lookup retries a blocked site through the residential proxy, so
        // the download has to do the same or it fails right after the formats
        // appeared. Partial files from the blocked attempt are cleared first.
        if (
          !triedProxyFallback &&
          proxyFlags.length === 0 &&
          proxyAvailable() &&
          worthProxyRetry(stderrTail) &&
          job.status !== "error"
        ) {
          triedProxyFallback = true;
          stderrTail = "";
          job.percent = 0;
          console.warn(`[job ${id}] blocked direct, retrying via proxy host=${safeHost(opts.url)}`);
          await clearTmp();
          // The same session that extracted, when there is one.
          //
          // forceProxyArgs mints a fresh sticky session, which means a
          // different exit address. The links in the metadata were signed
          // against the address that fetched them, so retrying from a new one
          // is refused every time: the retry that exists to rescue a blocked
          // download was guaranteed to fail whenever it was needed most.
          //
          // With the WARP pool, an exit from it rather than the host's own,
          // which is the one the pool manager takes away to replace whenever
          // YouTube flags it. The exit is recorded so a failure on it can move
          // on to the next one below.
          const fallbackExit =
            jobProxy.length === 0 && poolActive() ? pickExit(triedExits, undefined, host) : undefined;
          if (fallbackExit) {
            currentExit = fallbackExit;
            triedExits.push(fallbackExit);
          }
          const retryProxy =
            infoJson && jobProxy.length > 0 ? jobProxy : forceProxyArgs(opts.url, fallbackExit);
          jobProxy = retryProxy;
          if (infoJson) void recordProxyUsage(opts.mode);
          run(retryProxy, infoJson);
          return;
        }

        // A fresh start through the proxy, once. Three ways a proxied download
        // ends up here: the proxy's address was refused, the address was
        // swapped while this was running, or the CDN turned down links that
        // had gone stale. The first needs a new address, all three need new
        // links, and none of them is the visitor's problem to retry.
        //
        // It starts again through the same proxy this attempt used. That is
        // usually jobProxy, but a site off the proxy list gets here through
        // the fallback above, where jobProxy is empty; restarting on jobProxy
        // sent an X download that had just been refused direct straight back
        // to being refused direct.
        //
        // A fresh start that is itself refused can still get a new address.
        // A YouTube download whose stale links were renewed and then met the
        // bot wall used to stop there, because one fresh start was all it had.
        // With the WARP pool, a refused exit is simply left for another healthy
        // one, up to three in all, with no swap to wait for: the manager
        // replaces the bad one in the background.
        // Four with the larger pool; the job's own deadline still bounds them.
        const maxFreshStarts = currentExit ? 4 : 2;
        if (freshStarts < maxFreshStarts && proxyFlags.length > 0 && job.status !== "error") {
          // A crawling exit is treated like a refused one: leave it for another.
          const addressRefused = isAddressRefused(stderrTail) || mediaRefused(stderrTail) || wasSlow;
          // So is an exit that could not be reached or went quiet: the next
          // exit is as good, and the visitor should not be the one to retry.
          // Unlike a refusal, this never swaps the host's own address below,
          // which YouTube is using too. The same goes for a page that came
          // back without the video: some sites answer that per address and per
          // request (Pornhub did, measured 2026-10-19), and the next exit may
          // be given it.
          const answeredNo =
            currentExit !== undefined &&
            /no video formats|cannot parse data|unable to extract|redirection detected/i.test(stderrTail);
          const refused = addressRefused || (currentExit !== undefined && exitBroke(stderrTail)) || answeredNo;
          const stale =
            proxyGeneration() !== startGeneration || /HTTP Error 403/i.test(stderrTail);
          if (refused || stale) {
            freshStarts++;
            let ready = true;
            let nextFlags = proxyFlags;
            const nextExit = refused && currentExit ? pickExit(triedExits, undefined, host) : undefined;
            // Out for everyone when the exit itself failed or crawled, or
            // YouTube (what the manager tests with) refused it; otherwise out
            // only for this site, and still there for the rest.
            if (refused && currentExit) {
              if (wasSlow || exitUnreachable(stderrTail) || isYouTube(opts.url)) markExitBad(currentExit);
              else markExitBadFor(host, currentExit);
            }
            if (nextExit) {
              console.warn(`[job ${id}] pool exit refused, moving to another`);
              currentExit = nextExit;
              triedExits.push(nextExit);
              jobProxy = exitArgs(nextExit);
              nextFlags = jobProxy;
            } else if (addressRefused) {
              // No other healthy exit, or no pool at all: swap the single
              // proxy's address. Once per download. If the address it is given
              // is refused too, the swap's own retries are already spent, and
              // another would only keep the visitor waiting.
              if (swappedForJob) {
                ready = false;
              } else {
                swappedForJob = true;
                console.warn(`[job ${id}] proxy address refused, getting a new one`);
                ready = await rotateProxyNow();
              }
            }
            // A swap can take a while, long enough for the job's own deadline
            // to have stopped it in the meantime.
            const stoppedMeanwhile = (job.status as JobStatus) === "error";
            if (ready && !stoppedMeanwhile) {
              console.warn(`[job ${id}] starting again with fresh links host=${safeHost(opts.url)}`);
              stderrTail = "";
              job.percent = 0;
              await clearTmp();
              // The saved metadata holds the old links, so it goes too, and
              // this run reads the page again before downloading.
              await fsp.rm(path.join(tmpDir, INFO_NAME), { force: true });
              void recordProxyUsage(opts.mode);
              run(nextFlags);
              return;
            }
          }
        }

        // Never forward stderr: yt-dlp puts the full proxy URL (credentials
        // and all) in connection errors and temp paths in write errors, and
        // this string is sent straight to the browser over SSE.
        const { category, message } = classifyFailure(stderrTail);
        // The marks are the same safe fingerprint lookups log: which error
        // shapes appeared, never the text. Without them five YouTube failures
        // in two days read only "INTERNAL_ERROR", with nothing to go on.
        console.error(
          `[job ${id}] failed category=${category} exit=${code} url_host=${safeHost(opts.url)} proxied=${proxyFlags.length > 0} marks=${failureFingerprint(stderrTail)}`,
        );
        // A download that has to extract again meets the same bot wall a
        // lookup does, so it reports a refused proxy address the same way.
        if (proxyFlags.length > 0 && (isAddressRefused(stderrTail) || mediaRefused(stderrTail))) {
          noteProxyRefused(safeHost(opts.url));
        }
        if (job.status !== "error") {
          job.status = "error";
          job.error = message;
        }
        fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        finish();
        return;
      }

      try {
        // The metadata sits in this folder too and is not a download. Left
        // in, it is a candidate result, and the only thing keeping it from
        // being handed to a visitor is that "file.mp4" sorts before it.
        const files = (await fsp.readdir(tmpDir)).filter(
          (f) => !f.endsWith(".part") && !f.endsWith(".ytdl") && f !== INFO_NAME,
        );
        if (files.length === 0) {
          console.error(`[job ${id}] no output file url_host=${safeHost(opts.url)}`);
          job.status = "error";
          job.error = "The file couldn't be prepared. Please try another quality.";
          fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
          finish();
          return;
        }
        const filePath = path.join(tmpDir, files[0]);
        const ext = path.extname(files[0]);
        job.filePath = filePath;
        job.filename = `${sanitizeFilename(opts.title)}${ext}`;
        job.percent = 100;
        job.status = "done";
      } catch {
        job.status = "error";
        job.error = "The file couldn't be prepared. Please try another quality.";
      }
      finish();
    });
  };

  // Reads the page through the proxy and keeps the result.
  //
  // This is the only part of a download the proxy is actually needed for: the
  // platform's bot check looks at the page request, not at the CDN the media
  // comes from. It is about a megabyte against forty for the video.
  //
  // The timeout is the point. An earlier version of this spawned with no
  // deadline of its own, so a proxy connection that opened and then went
  // quiet held the job until the ten minute ceiling and the visitor was told
  // their download took too long. Every spawn here gets its own limit.
  const extractInfo = (): Promise<string | null> =>
    new Promise((resolve) => {
      const target = path.join(tmpDir, INFO_NAME);
      // Collected in memory and written once. Piping to a file and stat-ing it
      // on close is a race: end() returns before the data is flushed, the size
      // reads back as zero, and a perfectly good extraction looks like a
      // failure.
      const chunks: Buffer[] = [];
      let settled = false;
      const done = (value: string | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };

      const child = spawn(
        YTDLP_PATH,
        [
          "--dump-single-json",
          "--no-playlist",
          "--no-warnings",
          ...EXTRACTOR_ARGS,
          ...networkArgs(),
          ...siteArgs(opts.url),
          ...jobProxy,
          "--",
          opts.url,
        ],
        { windowsHide: true, detached: OWN_GROUP },
      );
      current = child;

      const timer = setTimeout(() => {
        stopTree(child);
        console.warn(`[job ${id}] metadata read timed out, falling back`);
        done(null);
      }, EXTRACT_TIMEOUT_MS);

      child.stdout.on("data", (c: Buffer) => chunks.push(c));
      child.stderr.on("data", (c: Buffer) => {
        stderrTail = (stderrTail + c.toString()).slice(-2000);
      });
      child.on("error", () => done(null));
      child.on("close", (code) => {
        if (code !== 0) return done(null);
        const body = Buffer.concat(chunks);
        if (body.length === 0) return done(null);
        try {
          fs.writeFileSync(target, body);
        } catch {
          return done(null);
        }
        // This is the part the proxy actually carried, when there was one.
        if (jobProxy.length > 0) void recordProxyUsage("metadata");
        done(target);
      });
    });

  if (jobProxy.length === 0 && !reusesLookup(opts.url)) {
    // Nothing here goes through the proxy, so there is nothing to save.
    run([]);
    return id;
  }

  // YouTube fetches fresh links and the file in one run through its exit.
  // The two-step path below exists to save metered proxy traffic by fetching
  // media directly when the CDN allows it, which never happens for YouTube
  // and costs nothing through WARP. And the links the lookup saved were being
  // refused on first use: on 15 October every YouTube download failed once
  // with a 403 and only worked after starting again, adding seconds to each.
  if (isYouTube(opts.url)) {
    void recordProxyUsage(opts.mode);
    console.log(`[job ${id}] host=${safeHost(opts.url)} media=proxied fresh`);
    run(jobProxy);
    return id;
  }

  void (async () => {
    // The lookup that produced the quality list already extracted all of this,
    // seconds ago, through the same proxy. Re-asking would double the metered
    // cost of every download to answer a question already answered.
    let infoJson: string | null = null;
    const cached = takeInfo(opts.url);
    if (cached) {
      const target = path.join(tmpDir, INFO_NAME);
      try {
        fs.writeFileSync(target, cached);
        infoJson = target;
        console.log(`[job ${id}] reused the lookup's metadata, no second extraction`);
      } catch {
        // Could not stage it; fall through and extract as normal.
      }
    }
    if (!infoJson) infoJson = await extractInfo();
    if (job.status === "error") return finish();

    // Could not read the page. Fall back to the single-stage run, which is
    // what this did before any of this existed and is known to work.
    if (!infoJson) {
      stderrTail = "";
      // Everything goes over the proxy on this path, page and media both.
      if (jobProxy.length > 0) void recordProxyUsage(opts.mode);
      return run(jobProxy);
    }

    // Ask the CDN whether it will serve this server directly. YouTube signs
    // its links against the address that requested them, so a link fetched
    // through the proxy is not always valid from here, and that varies by
    // player client. One byte settles it.
    let direct = false;
    try {
      const info = JSON.parse(fs.readFileSync(infoJson, "utf8"));
      const probe = pickProbeUrl(info, opts.mode === "video" ? opts.formatId : null);
      if (probe) direct = await cdnAcceptsDirect(probe);
    } catch {
      // Unreadable metadata means the safe answer, which is the proxy.
    }

    // A Facebook download whose lookup went direct has no proxy to fall back
    // to here, and goes direct whatever the probe said.
    const viaProxy = !direct && jobProxy.length > 0;
    if (viaProxy) void recordProxyUsage(opts.mode);
    console.log(
      `[job ${id}] host=${safeHost(opts.url)} media=${viaProxy ? "proxied" : "direct"}${cached ? " reused" : ""}`,
    );
    run(viaProxy ? jobProxy : [], infoJson);
  })();

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
