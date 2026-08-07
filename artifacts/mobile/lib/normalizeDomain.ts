export function normalizeDomain(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    let url = trimmed;

    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const parsed = new URL(url);
    let hostname = parsed.hostname.toLowerCase();

    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    if (!hostname || hostname.length < 2) return null;
    if (!hostname.includes(".")) return null;

    return hostname;
  } catch {
    return null;
  }
}

export function isLikelyUrl(input: string): boolean {
  if (!input || typeof input !== "string") return false;
  const trimmed = input.trim();

  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z]{2,})+/i.test(trimmed) && !trimmed.includes(" ")) {
    return true;
  }

  return false;
}
