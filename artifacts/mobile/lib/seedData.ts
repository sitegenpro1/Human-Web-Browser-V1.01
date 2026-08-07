import {
  DomainReputation,
  ReportCategory,
  computeTier,
  emptyCategoryCounts,
} from "./riskScore";

function makeSeedReputation(
  domain: string,
  counts: Partial<Record<ReportCategory, number>>,
  lastReportedAt: string
): DomainReputation {
  const categoryCounts = { ...emptyCategoryCounts(), ...counts };
  const totalReports = Object.values(categoryCounts).reduce((a, b) => a + b, 0);
  const riskScore = Math.min(
    1,
    totalReports * 0.03 +
      (categoryCounts.ai_slop ?? 0) * 0.02 +
      (categoryCounts.scam_phishing ?? 0) * 0.06 +
      (categoryCounts.fake_support ?? 0) * 0.05 +
      (categoryCounts.misleading_info ?? 0) * 0.04
  );
  const score = Math.round(riskScore * 100) / 100;
  const tier = computeTier(score, totalReports);
  const uniqueReporterEstimate = Math.max(1, Math.floor(totalReports * 0.6));

  return {
    domain,
    totalReports,
    uniqueReporterEstimate,
    riskScore: score,
    tier,
    categoryCounts,
    lastReportedAt,
  };
}

export const SEED_REPUTATIONS: DomainReputation[] = [
  makeSeedReputation(
    "ai-content-farm.example",
    { ai_slop: 42, low_quality_generated: 18, seo_spam: 12 },
    "2026-04-28T10:00:00Z"
  ),
  makeSeedReputation(
    "fake-airline-support.example",
    { fake_support: 31, scam_phishing: 22 },
    "2026-04-29T14:00:00Z"
  ),
  makeSeedReputation(
    "seo-slop-blog.example",
    { seo_spam: 27, ai_slop: 15, low_quality_generated: 10 },
    "2026-04-30T09:00:00Z"
  ),
  makeSeedReputation(
    "auto-health-advice.example",
    { misleading_info: 19, ai_slop: 14, low_quality_generated: 8 },
    "2026-05-01T12:00:00Z"
  ),
  makeSeedReputation(
    "coupon-spam-example.test",
    { seo_spam: 11, other: 6 },
    "2026-05-01T18:00:00Z"
  ),
];
