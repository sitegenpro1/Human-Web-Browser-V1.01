import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Plan = {
  name: string;
  price: string;
  features: string[];
  accent?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "$0",
    features: [
      "Google Web Mode search",
      "Basic community reports",
      "Local blocklist & trustlist",
      "Domain reputation checker",
    ],
  },
  {
    name: "Pro",
    price: "$4/mo",
    accent: true,
    features: [
      "Everything in Free",
      "Synced blocklists",
      "Advanced filters",
      "Research Mode",
      "Export history",
    ],
  },
  {
    name: "Family",
    price: "$8/mo",
    features: [
      "Everything in Pro",
      "Elder Safety Mode",
      "Family profiles",
      "Stronger scam warnings",
      "Shared blocklists",
    ],
  },
];

export default function WaitlistScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addWaitlistEmail, waitlistEmails } = useApp();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleJoin() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Please enter your email."); return; }
    if (!trimmed.includes("@") || !trimmed.includes(".")) { setError("Please enter a valid email."); return; }
    setError("");

    const ok = await addWaitlistEmail(trimmed);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(true);
      setEmail("");
    } else {
      setError("Already on the waitlist.");
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Waitlist & Pricing", headerBackTitle: "More" }} />
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Join the Human Web</Text>
          <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
            Be first to access synced blocklists, Research Mode, and Family Safety features when they launch.
          </Text>
          <Text style={[styles.heroCount, { color: colors.primary }]}>
            {waitlistEmails.length > 0 ? `${waitlistEmails.length} local sign-up${waitlistEmails.length !== 1 ? "s" : ""} stored` : "No sign-ups yet"}
          </Text>
        </View>

        {success && (
          <View style={[styles.successBanner, { backgroundColor: colors.clean + "22", borderColor: colors.clean + "44" }]}>
            <Text style={[styles.successText, { color: colors.clean }]}>
              You're on the list. We'll be in touch when features launch.
            </Text>
          </View>
        )}

        <View style={styles.emailSection}>
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: error ? colors.blockStrict : colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={email}
              onChangeText={(t) => { setEmail(t); setError(""); setSuccess(false); }}
              onSubmitEditing={handleJoin}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={200}
            />
          </View>
          {!!error && <Text style={[styles.errorText, { color: colors.blockStrict }]}>{error}</Text>}
          <Pressable
            style={({ pressed }) => [styles.joinBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={handleJoin}
          >
            <Text style={[styles.joinBtnText, { color: colors.primaryForeground }]}>Join Waitlist</Text>
          </Pressable>
          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Emails stored locally for MVP demo. No server, no spam.
          </Text>
        </View>

        <Text style={[styles.plansTitle, { color: colors.foreground }]}>Plans</Text>
        <View style={styles.plans}>
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} colors={colors} />
          ))}
        </View>
      </ScrollView>
    </>
  );
}

type ColorsType = ReturnType<typeof import("@/hooks/useColors").useColors>;

function PlanCard({ plan, colors }: { plan: Plan; colors: ColorsType }) {
  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: colors.card,
          borderColor: plan.accent ? colors.primary : colors.border,
          borderWidth: plan.accent ? 1.5 : 1,
        },
      ]}
    >
      {plan.accent && (
        <View style={[styles.popularBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.popularText, { color: colors.primaryForeground }]}>Popular</Text>
        </View>
      )}
      <Text style={[styles.planName, { color: plan.accent ? colors.primary : colors.foreground }]}>
        {plan.name}
      </Text>
      <Text style={[styles.planPrice, { color: colors.foreground }]}>{plan.price}</Text>
      <View style={styles.features}>
        {plan.features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <View style={[styles.featureDot, { backgroundColor: plan.accent ? colors.primary : colors.clean }]} />
            <Text style={[styles.featureText, { color: colors.mutedForeground }]}>{f}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, gap: 16 },
  heroCard: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 8 },
  heroTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  heroCount: { fontSize: 12, fontFamily: "Inter_500Medium" },
  successBanner: { borderRadius: 12, borderWidth: 1, padding: 12 },
  successText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  emailSection: { gap: 10 },
  inputWrap: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 2 },
  input: { fontSize: 15, fontFamily: "Inter_400Regular", height: 50 },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  joinBtn: { borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  joinBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  note: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  plansTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginTop: 8 },
  plans: { gap: 12 },
  planCard: { borderRadius: 16, padding: 16, gap: 8 },
  popularBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginBottom: 4 },
  popularText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  planName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  features: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  featureDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  featureText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
});
