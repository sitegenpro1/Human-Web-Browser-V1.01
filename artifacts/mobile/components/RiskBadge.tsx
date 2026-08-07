import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { DomainRiskTier, tierLabel } from "@/lib/riskScore";
import { useColors } from "@/hooks/useColors";

type Props = {
  tier: DomainRiskTier;
  size?: "sm" | "md";
};

export function RiskBadge({ tier, size = "md" }: Props) {
  const colors = useColors();

  const badgeColor = {
    clean: colors.clean,
    watch: colors.watch,
    warn: colors.warn,
    hide_strict: colors.hideStrict,
    block_strict: colors.blockStrict,
  }[tier];

  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: badgeColor + "22", borderColor: badgeColor },
        isSmall && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: badgeColor }]} />
      <Text
        style={[
          styles.label,
          { color: badgeColor },
          isSmall && styles.labelSm,
        ]}
      >
        {tierLabel(tier)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  labelSm: {
    fontSize: 10,
  },
});
