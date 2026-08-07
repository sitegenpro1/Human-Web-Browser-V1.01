export type ReportCategory =
  | "ai_slop"
  | "fake_support"
  | "seo_spam"
  | "misleading_info"
  | "scam_phishing"
  | "low_quality_generated"
  | "other";

export type DomainRiskTier =
  | "clean"
  | "watch"
  | "warn"
  | "hide_strict"
  | "block_strict";

export type DomainReputation = {
  domain: string;
  totalReports: number;
  uniqueReporterEstimate: number;
  riskScore: number;
  tier: DomainRiskTier;
  categoryCounts: Record<ReportCategory, number>;
  lastReportedAt?: string;
};

export const CATEGORY_LABELS: Record<ReportCategory, string> = {
  ai_slop: "AI-slop / AI-like content",
  fake_support: "Fake support number",
  seo_spam: "SEO spam",
  misleading_info: "Misleading medical/finance/legal",
  scam_phishing: "Scam or phishing",
  low_quality_generated: "Low-quality generated page",
  other: "Other",
};

export function computeRiskScore(counts: Record<ReportCategory, number>): number {
  const total =
    counts.ai_slop +
    counts.fake_support +
    counts.seo_spam +
    counts.misleading_info +
    counts.scam_phishing +
    counts.low_quality_generated +
    counts.other;

  const score = Math.min(
    1,
    total * 0.03 +
      counts.ai_slop * 0.02 +
      counts.scam_phishing * 0.06 +
      counts.fake_support * 0.05 +
      counts.misleading_info * 0.04
  );

  return Math.round(score * 100) / 100;
}

export function computeTier(riskScore: number, totalReports: number): DomainRiskTier {
  if (riskScore >= 0.8 || totalReports >= 75) return "block_strict";
  if (riskScore >= 0.6 || totalReports >= 25) return "hide_strict";
  if (riskScore >= 0.35 || totalReports >= 10) return "warn";
  if (totalReports >= 3) return "watch";
  return "clean";
}

export function tierCopy(tier: DomainRiskTier): string {
  switch (tier) {
    case "clean":
      return "No meaningful reports found.";
    case "watch":
      return "A few users have reported this domain. Review carefully.";
    case "warn":
      return "This domain has multiple community reports. Be careful.";
    case "hide_strict":
      return "Strict Mode would hide this domain by default.";
    case "block_strict":
      return "Strict Mode would block this domain unless you choose to open it.";
  }
}

export function tierLabel(tier: DomainRiskTier): string {
  switch (tier) {
    case "clean": return "Clean";
    case "watch": return "Watch";
    case "warn": return "Warn";
    case "hide_strict": return "Hide (Strict)";
    case "block_strict": return "Block (Strict)";
  }
}

export function emptyCategoryCounts(): Record<ReportCategory, number> {
  return {
    ai_slop: 0,
    fake_support: 0,
    seo_spam: 0,
    misleading_info: 0,
    scam_phishing: 0,
    low_quality_generated: 0,
    other: 0,
  };
}
