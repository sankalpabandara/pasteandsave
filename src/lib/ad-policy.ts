import fs from "node:fs";
import path from "node:path";
import { policyFromSettings, type AdPolicy } from "./adsterra-code";

// What the content policy needs to know about the ads that are switched on:
// which hosts their scripts come from, and whether the Social Bar is on.
//
// Read by proxy.ts for every page, so it reads the settings file directly and
// keeps the answer for a short while instead of opening the file per request.
// A code saved in the admin panel reaches the policy within that time, with no
// restart. Before this, a new Adsterra domain also had to be added to
// AD_NETWORK_DOMAINS on the server by hand, and forgetting it left the browser
// blocking the ad, which looks exactly like a network that is not filling.

const FILE = path.join(process.cwd(), "data", "site-settings.json");
const TTL_MS = 30_000;

let cached: { at: number; value: AdPolicy } | null = null;

export function adPolicy(now = Date.now()): AdPolicy {
  if (cached && now - cached.at < TTL_MS) return cached.value;
  let value: AdPolicy = { hosts: [], socialBar: false, pageScripts: false };
  try {
    value = policyFromSettings(JSON.parse(fs.readFileSync(FILE, "utf8")));
  } catch {
    // No settings file yet, or one being written: no ads, which is safe.
  }
  cached = { at: now, value };
  return value;
}
