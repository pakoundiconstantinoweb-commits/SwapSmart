/** Base path for GitHub Pages (/SwapSmart/) — React Router basename must not end with / */
export function getRouterBasename(): string {
  const raw = import.meta.env.VITE_BASE_PATH || "/";
  if (raw === "/" || raw === "") return "/";
  return raw.replace(/\/$/, "");
}

export function getViteBase(): string {
  const raw = import.meta.env.VITE_BASE_PATH || "/";
  if (raw === "/" || raw === "") return "/";
  return raw.endsWith("/") ? raw : `${raw}/`;
}
