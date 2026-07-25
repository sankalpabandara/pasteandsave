"use client";

import { useEffect, useState } from "react";
import { AD_SLOTS, type AdSlotKey } from "@/lib/ads";

// Where each slot actually appears, so the numbers can be matched to the page
// without going and looking.
const SLOT_INFO: Record<AdSlotKey, { label: string; where: string }> = {
  homeTop: { label: "Home — above the fold", where: "Homepage, under the paste box" },
  homeMid: { label: "Home — mid page", where: "Homepage, between sections" },
  homeBottom: { label: "Home — footer area", where: "Homepage, above the footer" },
  toolTop: { label: "Tool page — top", where: "All 16 platform pages, under the paste box" },
  toolMid: { label: "Tool page — mid", where: "All 16 platform pages, between sections" },
  toolBottom: { label: "Tool page — bottom", where: "All 16 platform pages, above the footer" },
  sidebar: { label: "Desktop sidebar", where: "Off by default (SIDEBAR_ADS_ENABLED)" },
  interstitial: { label: "Download interstitial", where: "Popup shown when a download starts" },
};

const ORDER: AdSlotKey[] = [
  "homeTop",
  "homeMid",
  "homeBottom",
  "toolTop",
  "toolMid",
  "toolBottom",
  "interstitial",
  "sidebar",
];

export default function AdsEditor() {
  const [units, setUnits] = useState<Record<string, string>>({});
  const [gaId, setGaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ads")
      .then((r) => (r.ok ? r.json() : { units: {} }))
      .then((d) => {
        setUnits(d.units ?? {});
        setGaId(d.gaId ?? "");
      })
      .catch(() => setMessage({ ok: false, text: "Couldn't load the current settings." }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units, gaId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Couldn't save." });
        return;
      }
      setUnits(data.units ?? units);
      setGaId(data.gaId ?? gaId);
      setMessage({
        ok: true,
        text: "Saved. Takes effect on the next page load — no deploy needed.",
      });
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setSaving(false);
    }
  }

  const active = ORDER.filter((k) => (units[k] ?? "").trim()).length;

  return (
    <section className="glass glass-hairline mt-6 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
            Ads &amp; analytics
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {active} of {ORDER.length} ad slots active. Paste the numeric unit id
            from a-ads.com — the digits only, not the whole embed code.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save ads"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-4 py-2.5 text-sm ${
            message.ok
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 rounded-xl border border-black/5 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
        <label
          htmlFor="ga-id"
          className="block text-sm font-medium text-neutral-800 dark:text-neutral-200"
        >
          Google Analytics measurement id
        </label>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          From GA4 → Admin → Data streams → your web stream. Looks like
          <span className="font-mono"> G-ABC1234XYZ</span>. Saving it turns
          tracking on across the site immediately. Leave empty to turn it off.
        </p>
        <input
          id="ga-id"
          value={gaId}
          onChange={(e) => setGaId(e.target.value)}
          placeholder="G-ABC1234XYZ"
          spellCheck={false}
          className="mt-2 w-56 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 font-mono text-sm outline-none focus:border-violet-500 dark:border-white/10 dark:bg-black/30 dark:text-white"
        />
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          This is the tracking id only. The numbers shown in the panel above
          need the separate service-account setup, because reading data back
          out of GA requires a credential that belongs in a file on the server.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
              <th className="pb-2 pr-3 font-medium">Placement</th>
              <th className="pb-2 pr-3 font-medium">Create this size</th>
              <th className="pb-2 font-medium">A-ADS unit id</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {ORDER.map((key) => {
              const cfg = AD_SLOTS[key];
              const info = SLOT_INFO[key];
              return (
                <tr key={key}>
                  <td className="py-3 pr-3 align-top">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                      {info.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{info.where}</p>
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                      {cfg.size}
                    </span>
                  </td>
                  <td className="py-3 align-top">
                    <input
                      value={units[key] ?? ""}
                      onChange={(e) =>
                        setUnits((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      inputMode="numeric"
                      placeholder="e.g. 2394552"
                      aria-label={`A-ADS unit id for ${info.label}`}
                      className="w-40 rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 font-mono text-sm outline-none focus:border-violet-500 dark:border-white/10 dark:bg-black/30 dark:text-white"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
        <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200">
          How to get a unit id
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>Sign in at a-ads.com and open Ad units.</li>
          <li>
            Create a unit for each size in the table above. The size only has to
            be close — the banner scales to the space it is given.
          </li>
          <li>
            Open the unit. Its address ends in a number, for example
            <span className="font-mono"> /2394552</span>. That number is the unit id.
          </li>
          <li>Paste the number here and press Save. No deploy is needed.</li>
        </ol>
        <p className="mt-2">
          Leave a box empty to turn that placement off. Empty slots render nothing
          at all, so the layout stays clean rather than showing a gap.
        </p>
      </details>
    </section>
  );
}
