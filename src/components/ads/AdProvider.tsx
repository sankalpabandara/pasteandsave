"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ADS_ENABLED } from "@/lib/ads";

type AdContextValue = {
  /**
   * Kept so the download flow can await it. It resolves immediately: the
   * interstitial it used to show is gone, because A-ADS does not serve
   * popups and a banner inside one is marked hidden.
   */
  gate: () => Promise<void>;
  /** Unit ids as configured in the admin panel, keyed by slot. */
  units: Record<string, string>;
  /** Raw embed code per slot, for networks other than A-ADS. */
  snippets: Record<string, string>;
};

const AdContext = createContext<AdContextValue>({
  gate: async () => {},
  units: {},
  snippets: {},
});
export const useAdGate = () => useContext(AdContext);
export const useAdConfig = () => useContext(AdContext);

export function AdProvider({
  children,
  initialUnits = {},
  initialSnippets = {},
}: {
  children: ReactNode;
  /**
   * Ad configuration read on the server so the banners are in the HTML of the
   * first response. The network verifies a unit by fetching the page and
   * looking for its data-aa attribute, and it does not run our JavaScript, so
   * a unit that only appears after a client fetch is invisible to it and is
   * reported as "Not found", which means the unit never earns.
   */
  initialUnits?: Record<string, string>;
  initialSnippets?: Record<string, string>;
}) {
  const [units, setUnits] = useState<Record<string, string>>(initialUnits);
  const [snippets, setSnippets] = useState<Record<string, string>>(initialSnippets);
  const unitsRef = useRef<Record<string, string>>(initialUnits);

  // The server value above is what the page ships with. This refresh is what
  // lets the admin panel swap a unit in without waiting for a rebuild, and it
  // is now a top-up rather than the only source.
  useEffect(() => {
    if (!ADS_ENABLED) return;
    let cancelled = false;
    fetch("/api/ads")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.units) {
          unitsRef.current = data.units;
          setUnits(data.units);
        }
        if (data.snippets) setSnippets(data.snippets);
      })
      .catch(() => {
        // Ads are never worth breaking a page over.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The download interstitial is gone: A-ADS does not serve popups, and a
  // banner inside one is reported back as hidden, which stops the unit
  // earning wherever else the same id is used. Kept as a resolved promise so
  // the download flow that awaits it needs no change, and so a network that
  // does allow interstitials can be dropped back in here.
  const gate = useCallback(() => Promise.resolve(), []);

  return (
    <AdContext.Provider value={{ gate, units, snippets }}>
      {children}
    </AdContext.Provider>
  );
}
