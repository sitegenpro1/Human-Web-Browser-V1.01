import { isLikelyUrl } from "./normalizeDomain";

export type SearchEngine = "google_web" | "duckduckgo" | "brave";

const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "vbscript:"];

export function buildSearchUrl(input: string, engine: SearchEngine): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  for (const scheme of BLOCKED_SCHEMES) {
    if (lower.startsWith(scheme)) return null;
  }

  if (isLikelyUrl(trimmed)) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return "https://" + trimmed;
  }

  const maxLength = 2000;
  const query = trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
  const encoded = encodeURIComponent(query);

  switch (engine) {
    case "google_web":
      // udm=14 = Web mode (no AI Overview, no featured snippets)
      return `https://www.google.com/search?q=${encoded}&udm=14`;
    case "duckduckgo":
      // noai.duckduckgo.com — official DDG subdomain that disables AI answers
      // kae=-1 disables AI answers as fallback, k1=-1 disables ads, kp=-1 turns off safe search filter
      return `https://noai.duckduckgo.com/?q=${encoded}&kae=-1&k1=-1`;
    case "brave":
      // summary=0 disables Brave AI Summary, source=web forces organic web results
      return `https://search.brave.com/search?q=${encoded}&summary=0&source=web`;
    default:
      return `https://www.google.com/search?q=${encoded}&udm=14`;
  }
}

/**
 * Returns true if this URL is a user-initiated Google search (needs udm=14 enforced).
 * Returns false if it already has a udm param (user is switching tabs like Images/Videos).
 */
export function isGoogleWebModeUrl(url: string): boolean {
  return /^https?:\/\/(?:www\.)?google\.[a-z.]+\/search/i.test(url) && !url.includes("udm=");
}

/**
 * Returns true if this URL is a DuckDuckGo search result page.
 */
export function isDuckDuckGoSearch(url: string): boolean {
  return /^https?:\/\/(?:noai\.|www\.)?duckduckgo\.com\/\?/i.test(url);
}

/**
 * Returns true if this URL is a Brave Search result page.
 */
export function isBraveSearch(url: string): boolean {
  return /^https?:\/\/search\.brave\.com\/search/i.test(url);
}
