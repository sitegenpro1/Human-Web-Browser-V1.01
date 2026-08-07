import { Stack } from "expo-router";
import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Principle = { title: string; body: string };

const PRINCIPLES: Principle[] = [
  {
    title: "We are not anti-technology.",
    body: "We embrace the web. We believe technology should serve people, not the other way around. Our goal is not to reject AI — it is to give users control over their search experience.",
  },
  {
    title: "Users deserve a choice.",
    body: "Web Mode is a real Google feature. We make it the default. We let you pick your search engine. We let you block or trust domains yourself. No algorithm makes those choices for you.",
  },
  {
    title: "We do not claim perfect AI detection.",
    body: "We use the term 'AI-like' and 'community-reported' — not 'confirmed AI.' We cannot detect AI with certainty, and we are honest about that. Our signals are community-driven, not algorithmic verdicts.",
  },
  {
    title: "We do not scrape.",
    body: "We do not intercept Google results. We do not inject scripts into other sites. We are a search launcher and domain reputation prototype — not a browser extension or proxy.",
  },
  {
    title: "Local-first and privacy-conscious.",
    body: "All reports, blocklists, and settings are stored on your device in this MVP. Nothing is sent to a server. You can export and delete your data at any time. We earn trust before asking for it.",
  },
  {
    title: "Community over authority.",
    body: "No company decides which sites are trustworthy. The community reports patterns, and you decide what to do with those signals. We are a layer of awareness, not a gatekeeper.",
  },
];

export default function AboutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ title: "About & Manifesto", headerBackTitle: "More" }} />
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>The Human Web Manifesto</Text>
          <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>
            Search used to feel like discovery. Page by page. Link by link. Human voice after human voice.{"\n\n"}
            Something changed. The web filled with generated text — answers that sound right but lead nowhere. We built this because we want the human web back.
          </Text>
        </View>

        {PRINCIPLES.map((p) => (
          <View key={p.title} style={[styles.principleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
            <View style={styles.principleContent}>
              <Text style={[styles.principleTitle, { color: colors.foreground }]}>{p.title}</Text>
              <Text style={[styles.principleBody, { color: colors.mutedForeground }]}>{p.body}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.roadmapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.roadmapTitle, { color: colors.foreground }]}>Future Roadmap</Text>
          {[
            "Android WebView app",
            "Browser extension",
            "Cloudflare Worker + D1 backend",
            "Synced community blocklists",
            "Family profiles & Elder Safety Mode",
            "Research Mode for journalists",
            "Public reputation API",
          ].map((item) => (
            <View key={item} style={styles.roadmapRow}>
              <View style={[styles.roadmapDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.roadmapItem, { color: colors.mutedForeground }]}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.closingCard, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.closingText, { color: colors.mutedForeground }]}>
            Built during the Replit 24-hour Buildathon, 2026.{"\n"}
            Local-first. No paid APIs. No scraping. No backend.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  principleCard: { borderRadius: 14, borderWidth: 1, padding: 16, flexDirection: "row", gap: 14 },
  indicator: { width: 3, borderRadius: 2, alignSelf: "stretch", flexShrink: 0 },
  principleContent: { flex: 1, gap: 6 },
  principleTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  principleBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  roadmapCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  roadmapTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  roadmapRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roadmapDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  roadmapItem: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  closingCard: { borderRadius: 14, padding: 16 },
  closingText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center" },
});
