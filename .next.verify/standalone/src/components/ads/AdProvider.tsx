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
   * Kept so the download flow can await it. It resolves immediately: nothing
   * is held back from a visitor who has pressed Save. The ads around that
   * moment fill a wait the server was going to make them sit through anyway.
   */
  gate: () => Promise<void>;
  /** Another network's embed per slot, pasted into the admin panel. */
  snippets: Record<string, string>;
  /** Which Adsterra banner sizes have a code, so a slot knows whether to ask for one. */
  adsterraSizes: string[];
  /** Script address of the Adsterra Social Bar, or "" when it is off. */
  socialBar: string;
  /** Script address of the Adsterra Interstitial, or "" when it is off. */
  interstitial: string;
  /** Script address of the Adsterra In-Page Push, or "" when it is off. */
  inPagePush: string;
  /** Script address of the Adsterra Popunder, or "" when it is off. */
  popunder: string;
  /** Whether an Adsterra Native Banner code is saved. */
  native: boolean;
  /**
   * Called once a visitor has a list of formats in front of them. The Popunder
   * answers the next click anywhere on the page, so loading it on arrival
   * would spend it on a click on the paste box, or on a visitor who never
   * downloads anything. Armed here, the click it answers is the one on Save.
   */
  armDownload: () => void;
  /** Whether armDownload has been called in this page's life. */
  downloadArmed: boolean;
};

const AdContext = createContext<AdContextValue>({
  gate: async () => {},
  snippets: {},
  adsterraSizes: [],
  socialBar: "",
  interstitial: "",
  inPagePush: "",
  popunder: "",
  native: false,
  armDownload: () => {},
  downloadArmed: false,
});
export const useAdGate = () => useContext(AdContext);
export const useAdConfig = () => useContext(AdContext);

export function AdProvider({
  children,
  initialSnippets = {},
  initialAdsterraSizes = [],
  initialSocialBar = "",
  initialInterstitial = "",
  initialInPagePush = "",
  initialPopunder = "",
  initialNative = false,
}: {
  children: ReactNode;
  /**
   * Ad configuration read on the server, so the first HTML already reserves a
   * box for every slot that will carry an ad and nothing moves when the ads
   * arrive.
   */
  initialSnippets?: Record<string, string>;
  initialAdsterraSizes?: string[];
  initialSocialBar?: string;
  initialInterstitial?: string;
  initialInPagePush?: string;
  initialPopunder?: string;
  initialNative?: boolean;
}) {
  const [snippets, setSnippets] = useState<Record<string, string>>(initialSnippets);
  const [adsterraSizes, setAdsterraSizes] = useState<string[]>(initialAdsterraSizes);
  const [socialBar, setSocialBar] = useState(initialSocialBar);
  const [interstitial, setInterstitial] = useState(initialInterstitial);
  const [inPagePush, setInPagePush] = useState(initialInPagePush);
  const [popunder, setPopunder] = useState(initialPopunder);
  const [native, setNative] = useState(initialNative);
  const [downloadArmed, setDownloadArmed] = useState(false);

  // The server value above is what the page ships with. This refresh is what
  // lets a change on the server show without waiting for a rebuild, because
  // some pages are prerendered and their HTML is older than the settings.
  useEffect(() => {
    if (!ADS_ENABLED) return;
    let cancelled = false;
    fetch("/api/ads")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (data.snippets) setSnippets(data.snippets);
        if (Array.isArray(data.adsterraSizes)) setAdsterraSizes(data.adsterraSizes);
        if (typeof data.socialBar === "string") setSocialBar(data.socialBar);
        if (typeof data.interstitial === "string") setInterstitial(data.interstitial);
        if (typeof data.inPagePush === "string") setInPagePush(data.inPagePush);
        if (typeof data.popunder === "string") setPopunder(data.popunder);
        if (typeof data.native === "boolean") setNative(data.native);
      })
      .catch(() => {
        // Ads are never worth breaking a page over.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Nothing is held back from a visitor who pressed Save. Kept as a resolved
  // promise so the download flow that awaits it needs no change.
  const gate = useCallback(() => Promise.resolve(), []);
  const armDownload = useCallback(() => setDownloadArmed(true), []);

  return (
    <AdContext.Provider
      value={{
        gate,
        snippets,
        adsterraSizes,
        socialBar,
        interstitial,
        inPagePush,
        popunder,
        native,
        armDownload,
        downloadArmed,
      }}
    >
      {children}
    </AdContext.Provider>
  );
}
