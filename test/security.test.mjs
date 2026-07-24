// SSRF and input-validation checks against a running server.
//
// These drive the real API route rather than a copy of the validation logic,
// so what passes here is what actually ships. Every payload below is rejected
// before any outbound request is made, so the suite needs no network access to
// social-media sites and is safe to run in CI.
//
//   node test/security.test.mjs
//   BASE_URL=https://pasteandsave.com node test/security.test.mjs

const BASE = (process.env.BASE_URL || "http://localhost:3010").replace(/\/$/, "");

let passed = 0;
let failed = 0;

function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log("  ok  " + name);
  } else {
    failed++;
    console.log("FAIL  " + name + (detail ? "  -> " + detail : ""));
  }
}

async function postInfo(url) {
  const res = await fetch(`${BASE}/api/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    // non-JSON response; body stays empty
  }
  return { status: res.status, body };
}

async function postJob(payload) {
  const res = await fetch(`${BASE}/api/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body = {};
  try {
    body = await res.json();
  } catch {
    // ignore
  }
  return { status: res.status, body };
}

// Addresses that must never be fetched on a visitor's behalf.
const SSRF_PAYLOADS = [
  ["loopback literal", "http://127.0.0.1:3000/"],
  ["loopback name", "http://localhost/admin"],
  ["cloud metadata", "http://169.254.169.254/latest/meta-data/"],
  ["IPv6 loopback", "http://[::1]/"],
  ["IPv6 unique-local", "http://[fd00::1]/"],
  ["private 10/8", "http://10.0.0.1/"],
  ["private 172.16/12", "http://172.16.0.1/"],
  ["private 192.168/16", "http://192.168.1.1/"],
  ["link-local", "http://169.254.1.1/"],
  ["carrier-grade NAT", "http://100.64.0.1/"],
  ["integer-encoded IP", "http://2130706433/"],
  ["hex-encoded IP", "http://0x7f.0x0.0x0.0x1/"],
  ["file protocol", "file:///etc/passwd"],
  ["ftp protocol", "ftp://example.com/x"],
  ["gopher protocol", "gopher://127.0.0.1:70/"],
  ["embedded credentials", "https://user:pass@www.youtube.com/watch?v=jNQXAC9IVRw"],
];

// The lookup endpoint is itself rate limited, so the strict "exactly 400"
// assertions run first, while the budget is untouched. The bulk SSRF sweep
// afterwards asserts the property that actually matters for security: the
// server must never answer 2xx, whether it refused on validation (400) or on
// throttling (429). Both mean nothing was fetched.
console.log(`scenario: malformed input is handled, not crashed on (${BASE})`);
const MALFORMED = [
  ["empty string", ""],
  ["whitespace", "   "],
  ["bare word", "notaurl"],
  ["scheme only", "https://"],
  ["spaces in host", "https://exa mple.com/x"],
];
for (const [name, url] of MALFORMED) {
  const { status } = await postInfo(url);
  check(`handled: ${name}`, status === 400, `got ${status}`);
}

console.log("\nscenario: unsupported but well-formed host is refused cleanly");
{
  const { status, body } = await postInfo("https://example.com/nothing.html");
  check("unsupported host refused", status === 400, `got ${status}`);
  check(
    "unsupported host message is human",
    typeof body.error === "string" && body.error.length > 0 && !/yt-dlp/i.test(body.error),
    JSON.stringify(body),
  );
}

console.log("\nscenario: SSRF payloads are never fetched");
let sawValidationRefusal = false;
let sawThrottle = false;
for (const [name, url] of SSRF_PAYLOADS) {
  const { status, body } = await postInfo(url);
  if (status === 400) sawValidationRefusal = true;
  if (status === 429) sawThrottle = true;
  check(
    `not fetched: ${name}`,
    status === 400 || status === 429,
    `got ${status} ${JSON.stringify(body).slice(0, 80)}`,
  );

  const text = JSON.stringify(body);
  const leaks =
    /(?:https?|socks5?):\/\/[^"\s]*:[^"@\s]*@/i.test(text) || // credentials
    /\/home\/|\/tmp\/|C:\\\\|\.next|node_modules/i.test(text) || // paths
    /yt-dlp|ffmpeg|spawn|Traceback|at Object\./i.test(text); // tooling
  check(`no internals leaked: ${name}`, !leaks, text.slice(0, 100));
}
check("validation refused at least one payload outright", sawValidationRefusal);
if (sawThrottle) {
  console.log("  note: rate limiter engaged during the sweep, which is expected");
}

console.log("\nscenario: job endpoint validates its arguments");
{
  // formatId is passed to yt-dlp's -f flag, so it must be strictly checked.
  const injections = [
    "18; rm -rf /",
    "18 --exec touch /tmp/pwned",
    "$(whoami)",
    "`id`",
    "18|cat /etc/passwd",
    "../../etc/passwd",
    "18\n--paths /tmp",
  ];
  for (const formatId of injections) {
    const { status } = await postJob({
      url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
      mode: "video",
      formatId,
      title: "t",
    });
    check(`format id refused: ${JSON.stringify(formatId).slice(0, 28)}`, status === 400, `got ${status}`);
  }

  const { status: badMode } = await postJob({
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
    mode: "sudo",
    title: "t",
  });
  check("unknown mode refused", badMode === 400, `got ${badMode}`);

  const { status: ssrfJob } = await postJob({
    url: "http://169.254.169.254/",
    mode: "audio",
    title: "t",
  });
  check("job endpoint applies the same URL rules", ssrfJob === 400, `got ${ssrfJob}`);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
