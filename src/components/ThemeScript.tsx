import { headers } from "next/headers";

// Runs as part of the initial HTML parse (before hydration) to avoid a
// light/dark flash. A tiny inline script like this belongs directly in the
// body, not behind next/script, that API is for loading external resources.
const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default async function ThemeScript() {
  // Set by middleware, and required now that script-src no longer allows
  // every inline script. Without it the browser refuses this one and the page
  // flashes white before the theme applies.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // React deliberately does not send the nonce to the client, so the two
  // renders differ on this attribute. The script has already run during parse
  // by that point; left unsilenced the mismatch makes React discard the tree
  // and rebuild it in the browser.
  return (
    <script
      nonce={nonce}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT }}
    />
  );
}
