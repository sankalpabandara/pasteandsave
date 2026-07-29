"use client";

import { useEffect, useState, type ReactNode } from "react";

// Renders its children only on phone-width screens, by mounting rather than by
// hiding.
//
// The distinction matters for adverts specifically. A `hidden md:block` wrapper
// still puts the iframe in the document on desktop, and an iframe inside a
// display:none parent is still fetched — so the network counts an impression
// for a banner nobody could possibly see, marks the unit as hidden, and stops
// serving into it. Because these phone slots share a unit id with the main
// banners, that would take a working unit down with them.
const PHONE = "(max-width: 767px)";

export default function PhoneOnly({ children }: { children: ReactNode }) {
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const update = () => setIsPhone(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // False on the server and on the first client render, so the two agree and
  // nothing is fetched before the width is known.
  if (!isPhone) return null;
  return <>{children}</>;
}
