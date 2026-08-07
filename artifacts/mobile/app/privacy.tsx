import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Overview",
    body:
      "Human Web Browser is a local-first application. Your browsing data, bookmarks, history, passwords, and research notes are stored exclusively on your device. We do not collect, transmit, or sell any personal information.",
  },
  {
    title: "Data We Do NOT Collect",
    body:
      "• Browsing history or URLs visited\n• Search queries\n• Passwords or credentials stored in the vault\n• Bookmarks or research notes\n• Device identifiers or location\n• Crash reports or analytics",
  },
  {
    title: "What Stays on Your Device",
    body:
      "All app data is stored locally using your device's secure storage (Expo SecureStore for sensitive items, AsyncStorage for general data). Uninstalling the app permanently deletes all stored data.",
  },
  {
    title: "Domain Reputation Scoring",
    body:
      "Domain scores are calculated entirely on-device using built-in heuristics. No URLs are sent to external servers. The app does not use third-party reputation APIs that would expose your browsing habits.",
  },
  {
    title: "Network Requests",
    body:
      "The browser loads web pages you explicitly navigate to, just like any standard browser. These requests are made directly from your device to the destination server — no proxy, no logging, no middleman.",
  },
  {
    title: "Third-Party Services",
    body:
      "This app does not integrate any advertising networks, analytics SDKs, crash reporting tools, or social login providers. There are no third-party trackers embedded in the application.",
  },
  {
    title: "Children's Privacy",
    body:
      "This app is not directed at children under 13. We do not knowingly collect personal information from children.",
  },
  {
    title: "Changes to This Policy",
    body:
      "If the privacy policy changes in a future version, the updated policy will be included in that release. The effective date will be noted below.",
  },
  {
    title: "Contact",
    body:
      "For privacy-related questions or data deletion requests, contact us via the app's About page or through the app store listing.",
  },
];

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            backgroundColor: colors.toolbar,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.5 : 1 }]}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
          <Feather name="shield" size={28} color={colors.primary} />
          <Text style={[styles.heroTitle, { color: colors.primary }]}>Your Privacy First</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            100% local-first · No servers · No tracking
          </Text>
        </View>

        {SECTIONS.map((section) => (
          <View
            key={section.title}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{section.body}</Text>
          </View>
        ))}

        <Text style={[styles.effective, { color: colors.mutedForeground }]}>
          Effective date: May 2026 · Human Web Browser v1.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },
  heroBadge: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  heroSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  sectionBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  effective: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
  },
});
