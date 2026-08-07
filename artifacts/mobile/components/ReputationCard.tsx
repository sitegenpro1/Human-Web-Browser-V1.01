import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { RiskBadge } from "@/components/RiskBadge";
import { useColors } from "@/hooks/useColors";
import {
  CATEGORY_LABELS,
  DomainReputation,
  ReportCategory,
  tierCopy,
} from "@/lib/riskScore";

type Props = {
  reputation: DomainReputation;
  isTrusted?: boolean;
  isBlocked?: boolean;
};

export function ReputationCard({ reputation, isTrusted, isBlocked }: Props) {
  const colors = useColors();

  const activeCats = (
    Object.entries(reputation.categoryCounts) as [ReportCategory, number][]
  ).filter(([, count]) => count > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.domain, { color: colors.foreground }]} numberOfLines={1}>
          {reputation.domain}
        </Text>
        <RiskBadge tier={isBlocked ? "block_strict" : reputation.tier} />
      </View>

      {isTrusted && (
        <View style={[styles.trustedBanner, { backgroundColor: colors.clean + "22" }]}>
          <Text style={[styles.trustedText, { color: colors.clean }]}>
            You have marked this domain as trusted.
          </Text>
        </View>
      )}

      {isBlocked && !isTrusted && (
        <View style={[styles.trustedBanner, { backgroundColor: colors.blockStrict + "22" }]}>
          <Text style={[styles.trustedText, { color: colors.blockStrict }]}>
            This domain is on your personal blocklist.
          </Text>
        </View>
      )}

      <Text style={[styles.copy, { color: colors.mutedForeground }]}>
        {tierCopy(reputation.tier)}
      </Text>

      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        Community-reported data. This is not a verified accusation. Treat it as a warning signal.
      </Text>

      <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
        <Stat label="Reports" value={String(reputation.totalReports)} colors={colors} />
        <Stat label="Reporters" value={`~${reputation.uniqueReporterEstimate}`} colors={colors} />
        <Stat label="Risk Score" value={`${Math.round(reputation.riskScore * 100)}%`} colors={colors} />
      </View>

      {activeCats.length > 0 && (
        <View style={styles.categories}>
          <Text style={[styles.catsTitle, { color: colors.mutedForeground }]}>
            Report breakdown
          </Text>
          {activeCats.map(([cat, count]) => (
            <View key={cat} style={styles.catRow}>
              <Text style={[styles.catLabel, { color: colors.foreground }]}>
                {CATEGORY_LABELS[cat]}
              </Text>
              <Text style={[styles.catCount, { color: colors.mutedForeground }]}>
                {count}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  domain: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  copy: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    fontStyle: "italic",
  },
  trustedBanner: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trustedText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 12,
    borderTopWidth: 1,
  },
  stat: {
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  categories: {
    gap: 6,
  },
  catsTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  catCount: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});
