// Runs as part of the initial HTML parse (before hydration) to avoid a
// light/dark flash. A tiny inline script like this belongs directly in the
// body, not behind next/script — that API is for loading external resources.
const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    var dark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
