import { Stack } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReputationCard } from "@/components/ReputationCard";
import { RiskBadge } from "@/components/RiskBadge";
import { useColors } from "@/hooks/useColors";
import {
  DomainReputation,
  ReportCategory,
  computeRiskScore,
  computeTier,
  emptyCategoryCounts,
} from "@/lib/riskScore";
import { SEED_REPUTATIONS } from "@/lib/seedData";

const DEMO_DOMAINS = ["ai-content-farm.example", "fake-airline-support.example", "seo-slop-blog.example"];

export default function DemoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const demoReps = SEED_REPUTATIONS.filter((r) => DEMO_DOMAINS.includes(r.domain));

  return (
    <>
      <Stack.Screen options={{ title: "Demo", headerBackTitle: "More" }} />
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <DemoSection
          step="01"
          title="The Problem"
          colors={colors}
        >
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            AI summaries and generated pages are taking over search results. Real sources are pushed down by AI-written content and SEO farms designed to game algorithms.
          </Text>
          <View style={[styles.quoteBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.quoteText, { color: colors.foreground }]}>
              "I just want to read what a human actually wrote."
            </Text>
          </View>
        </DemoSection>

        <DemoSection step="02" title="Human Web Search" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            Instead of building a new search engine, we use Google in Web Mode — which prefers classic results without AI Overviews.
          </Text>
          <View style={[styles.compareBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CompareRow label="Normal Google" url="google.com/search?q=query" bad colors={colors} />
            <View style={[styles.compareDivider, { backgroundColor: colors.border }]} />
            <CompareRow label="Human Web" url="google.com/search?q=query&udm=14" colors={colors} />
          </View>
          <Text style={[styles.caption, { color: colors.mutedForeground }]}>
            The udm=14 parameter enables Web Mode — filtering toward source-first results.
          </Text>
        </DemoSection>

        <DemoSection step="03" title="Community Reports" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            Users can report suspicious domains. Reports are stored locally and combined with community-seeded data to compute a risk score.
          </Text>
          <View style={styles.categories}>
            {["AI-slop / AI-like content", "Fake support number", "SEO spam", "Misleading info", "Scam / phishing"].map((cat) => (
              <View key={cat} style={[styles.catTag, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.catTagText, { color: colors.mutedForeground }]}>{cat}</Text>
              </View>
            ))}
          </View>
        </DemoSection>

        <DemoSection step="04" title="Domain Reputation" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            These are demo domains with seeded community data. Real domains are never accused here.
          </Text>
          {demoReps.map((rep) => (
            <ReputationCard key={rep.domain} reputation={rep} />
          ))}
        </DemoSection>

        <DemoSection step="05" title="Strict Mode" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            With Strict Mode enabled, heavily reported domains receive stronger warnings and can be hidden or blocked from appearing.
          </Text>
          <View style={styles.tierList}>
            <TierRow tier="clean" label="No reports — shown normally." colors={colors} />
            <TierRow tier="watch" label="A few reports — subtle notice." colors={colors} />
            <TierRow tier="warn" label="Multiple reports — visible warning." colors={colors} />
            <TierRow tier="hide_strict" label="Strict: hidden by default." colors={colors} />
            <TierRow tier="block_strict" label="Strict: blocked unless overridden." colors={colors} />
          </View>
        </DemoSection>

        <DemoSection step="06" title="Monetization Preview" colors={colors}>
          <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
            Free plan for everyone. Pro and Family plans for power users.
          </Text>
          <View style={styles.planRow}>
            <PlanCard title="Free" features={["Web Mode search", "Basic reports", "Local blocklist"]} colors={colors} />
            <PlanCard title="Pro" features={["Synced lists", "Research Mode", "Export history"]} colors={colors} accent={colors.primary} />
            <PlanCard title="Family" features={["Elder Safety", "Shared lists", "Family profiles"]} colors={colors} />
          </View>
        </DemoSection>

        <View style={[styles.closingCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.closingText, { color: colors.primary }]}>
            "We are not replacing Google. We are giving users a human-web control layer over search."
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

type ColorsType = ReturnType<typeof import("@/hooks/useColors").useColors>;

function DemoSection({ step, title, colors, children }: { step: string; title: string; colors: ColorsType; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.stepNum, { color: colors.primary }]}>{step}</Text>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function CompareRow({ label, url, bad, colors }: { label: string; url: string; bad?: boolean; colors: ColorsType }) {
  return (
    <View style={styles.compareRow}>
      <Text style={[styles.compareLabel, { color: bad ? colors.blockStrict : colors.clean }]}>{label}</Text>
      <Text style={[styles.compareUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{url}</Text>
    </View>
  );
}

function TierRow({ tier, label, colors }: { tier: any; label: string; colors: ColorsType }) {
  return (
    <View style={styles.tierRow}>
      <RiskBadge tier={tier} size="sm" />
      <Text style={[styles.tierLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function PlanCard({ title, features, colors, accent }: { title: string; features: string[]; colors: ColorsType; accent?: string }) {
  return (
    <View style={[styles.planCard, { backgroundColor: colors.card, borderColor: accent ?? colors.border, borderWidth: accent ? 1.5 : 1 }]}>
      <Text style={[styles.planTitle, { color: accent ?? colors.foreground }]}>{title}</Text>
      {features.map((f) => (
        <Text key={f} style={[styles.planFeature, { color: colors.mutedForeground }]}>• {f}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 28 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  sectionTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  bodyText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  quoteBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  quoteText: { fontSize: 14, fontFamily: "Inter_500Medium", fontStyle: "italic", lineHeight: 22 },
  compareBox: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  compareRow: { paddingHorizontal: 14, paddingVertical: 11, gap: 4 },
  compareLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  compareUrl: { fontSize: 11, fontFamily: "Inter_400Regular" },
  compareDivider: { height: 1 },
  caption: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  catTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  catTagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  tierList: { gap: 8 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tierLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  planRow: { flexDirection: "row", gap: 8 },
  planCard: { flex: 1, borderRadius: 12, padding: 12, gap: 6 },
  planTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 2 },
  planFeature: { fontSize: 11, fontFamily: "Inter_400Regular" },
  closingCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  closingText: { fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 22, fontStyle: "italic" },
});
