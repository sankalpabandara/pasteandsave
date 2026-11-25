"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ADS_ENABLED } from "@/lib/ads";

type AdContextValue = {
  /**
   * Kept so the download flow can await it. It resolves immediately: there is
   * no interstitial before a download.
   */
  gate: () => Promise<void>;
  /** Another network's embed per slot, pasted into the admin panel. */
  snippets: Record<string, string>;
  /** Which Adsterra banner sizes have a code, so a slot knows whether to ask for one. */
  adsterraSizes: string[];
};

const AdContext = createContext<AdContextValue>({
  gate: async () => {},
  snippets: {},
  adsterraSizes: [],
});
export const useAdGate = () => useContext(AdContext);
export const useAdConfig = () => useContext(AdContext);

export function AdProvider({
  children,
  initialSnippets = {},
  initialAdsterraSizes = [],
}: {
  children: ReactNode;
  /**
   * Ad configuration read on the server, so the first HTML already reserves a
   * box for every slot that will carry a banner and nothing moves when the
   * banners arrive.
   */
  initialSnippets?: Record<string, string>;
  initialAdsterraSizes?: string[];
}) {
  const [snippets, setSnippets] = useState<Record<string, string>>(initialSnippets);
  const [adsterraSizes, setAdsterraSizes] = useState<string[]>(initialAdsterraSizes);

  // The server value above is what the page ships with. This refresh is what
  // lets a change on the server show without waiting for a rebuild, because
  // most pages are prerendered and their HTML is older than the settings.
  useEffect(() => {
    if (!ADS_ENABLED) return;
    let cancelled = false;
    fetch("/api/ads")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.snippets) setSnippets(data.snippets);
        if (Array.isArray(data.adsterraSizes)) setAdsterraSizes(data.adsterraSizes);
      })
      .catch(() => {
        // Ads are never worth breaking a page over.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // No interstitial before a download. Kept as a resolved promise so the
  // download flow that awaits it needs no change.
  const gate = useCallback(() => Promise.resolve(), []);

  return (
    <AdContext.Provider value={{ gate, snippets, adsterraSizes }}>
      {children}
    </AdContext.Provider>
  );
}
