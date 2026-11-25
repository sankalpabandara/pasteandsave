"use client";

import { useEffect, useState } from "react";
import { AD_SLOTS, ADSTERRA_SIZES, type AdSlotKey } from "@/lib/ads";

// Where each slot actually appears, so a banner can be matched to the page
// without going and looking.
const SLOT_INFO: Record<AdSlotKey, { label: string; where: string }> = {
  homeTop: { label: "Home: above the fold", where: "Homepage, under the paste box" },
  homeMid: { label: "Home: mid page", where: "Homepage, between sections" },
  homeBottom: { label: "Home: footer area", where: "Homepage, above the footer" },
  toolTop: { label: "Tool page: top", where: "All platform pages, under the paste box" },
  toolMid: { label: "Tool page: mid", where: "All platform pages, between sections" },
  toolBottom: { label: "Tool page: bottom", where: "All platform pages, above the footer" },
  extensionTop: { label: "Extension page: top", where: "The /extension page, under the hero" },
  extensionBottom: { label: "Extension page: bottom", where: "The /extension page, above the footer" },
};

const ORDER = Object.keys(SLOT_INFO) as AdSlotKey[];

type AdsterraView = Partial<Record<string, { key: string; src: string }>>;

export default function AdsEditor() {
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [adsterra, setAdsterra] = useState<AdsterraView>({});
  const [gaId, setGaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/ads")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { snippets?: Record<string, string>; adsterra?: AdsterraView; gaId?: string }) => {
        setSnippets(d.snippets ?? {});
        setAdsterra(d.adsterra ?? {});
        setGaId(d.gaId ?? "");
      })
      .catch(() => setMessage({ ok: false, text: "Couldn't load the current settings." }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      // The Adsterra codes are not sent, so saving here never touches them.
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snippets, gaId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Couldn't save." });
        return;
      }
      setSnippets(data.snippets ?? snippets);
      setAdsterra(data.adsterra ?? adsterra);
      setGaId(data.gaId ?? gaId);
      setMessage({
        ok: true,
        text: "Saved. Takes effect on the next page load, no deploy needed.",
      });
    } catch {
      setMessage({ ok: false, text: "Couldn't reach the server." });
    } finally {
      setSaving(false);
    }
  }

  const live = ADSTERRA_SIZES.filter((s) => adsterra[s]);
  const has = (size?: string) => Boolean(size && adsterra[size]);

  return (
    <section className="glass glass-hairline mt-6 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
            Ads &amp; analytics
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Banners come from Adsterra. {live.length} of {ADSTERRA_SIZES.length} banner
            sizes have a code
            {live.length ? `: ${live.join(", ")}` : ""}. A placement whose size has no
            code shows nothing.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving || loading}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
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
          From GA4, Admin, Data streams, your web stream. Looks like
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
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-white/10">
              <th className="pb-2 pr-3 font-medium">Placement</th>
              <th className="pb-2 pr-3 font-medium">Adsterra banner</th>
              <th className="pb-2 font-medium">Or another network&apos;s code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/10">
            {ORDER.map((key) => {
              const cfg = AD_SLOTS[key] as { banner: string; bannerMobile?: string };
              const info = SLOT_INFO[key];
              const sizes = [
                { size: cfg.banner, where: cfg.bannerMobile ? "computers" : "all screens" },
                ...(cfg.bannerMobile ? [{ size: cfg.bannerMobile, where: "phones" }] : []),
              ];
              return (
                <tr key={key}>
                  <td className="py-3 pr-3 align-top">
                    <p className="font-medium text-neutral-800 dark:text-neutral-200">
                      {info.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{info.where}</p>
                  </td>
                  <td className="py-3 pr-3 align-top">
                    <ul className="space-y-1">
                      {sizes.map(({ size, where }) => (
                        <li key={size} className="text-xs text-neutral-600 dark:text-neutral-300">
                          <span className="font-mono font-semibold">{size}</span> on {where}:{" "}
                          <span
                            className={
                              has(size)
                                ? "font-semibold text-emerald-700 dark:text-emerald-300"
                                : "font-semibold text-red-700 dark:text-red-300"
                            }
                          >
                            {has(size) ? "live" : "no code"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-3 align-top">
                    <textarea
                      value={snippets[key] ?? ""}
                      onChange={(e) =>
                        setSnippets((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      rows={2}
                      spellCheck={false}
                      placeholder="Leave empty to show the Adsterra banner"
                      aria-label={`Other network code for ${info.label}`}
                      className="w-full min-w-[240px] rounded-lg border border-black/10 bg-white/70 px-3 py-1.5 font-mono text-[11px] outline-none focus:border-violet-500 dark:border-white/10 dark:bg-black/30 dark:text-white"
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
          How to change the Adsterra codes
        </summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5">
          <li>
            In Adsterra, open Websites, then the site, and get the code of a Banner
            unit for each size: 728x90, 300x250 and 320x50.
          </li>
          <li>
            In each code, copy the script address that ends in
            <span className="font-mono"> /invoke.js</span>.
          </li>
          <li>
            On the server, in <span className="font-mono">/opt/pasteandsave</span>, run
            <span className="mt-1 block font-mono text-xs">
              node ops/set-adsterra.mjs 728x90=&lt;address&gt; 300x250=&lt;address&gt;
              320x50=&lt;address&gt;
            </span>
            then <span className="font-mono">pm2 restart pasteandsave --update-env</span>.
            The script also lets the banner&apos;s domain through the content policy, so
            the banner is not blocked by the browser.
          </li>
        </ol>
        <p className="mt-3 font-medium text-neutral-800 dark:text-neutral-200">
          Trying a different ad network
        </p>
        <p className="mt-1">
          Paste that network&apos;s embed code into the right hand column. A slot with
          code there shows it instead of its Adsterra banner, without a deploy. The
          network&apos;s domains need adding to{" "}
          <span className="font-mono">AD_NETWORK_DOMAINS</span> in{" "}
          <span className="font-mono">.env.local</span> first, then a restart.
          Without that the ad is blocked and the slot simply looks empty, which is
          hard to tell from a network that is not filling.
        </p>
      </details>
    </section>
  );
}
