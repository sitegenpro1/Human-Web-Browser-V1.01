import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReputationCard } from "@/components/ReputationCard";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { DomainReputation } from "@/lib/riskScore";

export default function CheckScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ domain?: string }>();
  const {
    getDomainReputation,
    blockedDomains,
    trustedDomains,
    addBlockedDomain,
    addTrustedDomain,
    removeBlockedDomain,
    removeTrustedDomain,
  } = useApp();

  const [input, setInput] = useState(params.domain ?? "");
  const [reputation, setReputation] = useState<DomainReputation | null>(null);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    if (params.domain) {
      setInput(params.domain);
      runCheck(params.domain);
    }
  }, [params.domain]);

  function runCheck(val?: string) {
    const target = (val ?? input).trim();
    if (!target) { setError("Enter a domain or URL."); return; }
    const d = normalizeDomain(target);
    if (!d) { setError("Could not recognize a valid domain."); return; }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReputation(getDomainReputation(d));
    setChecked(true);
  }

  const domain = reputation?.domain ?? "";
  const isBlocked = blockedDomains.includes(domain);
  const isTrusted = trustedDomains.includes(domain);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Domain Reputation</Text>

        <View style={[styles.searchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="example.com or https://..."
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={(t) => { setInput(t); setError(""); setChecked(false); setReputation(null); }}
            onSubmitEditing={() => runCheck()}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            maxLength={300}
          />
          <Pressable
            onPress={() => runCheck()}
            style={({ pressed }) => [styles.searchGo, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="arrow-right" size={15} color={colors.primaryForeground} />
          </Pressable>
        </View>

        {!!error && (
          <View style={[styles.errorRow, { backgroundColor: colors.blockStrict + "18" }]}>
            <Feather name="alert-circle" size={13} color={colors.blockStrict} />
            <Text style={[styles.errorText, { color: colors.blockStrict }]}>{error}</Text>
          </View>
        )}

        {reputation && checked && (
          <>
            <ReputationCard reputation={reputation} isTrusted={isTrusted} isBlocked={isBlocked && !isTrusted} />

            <View style={styles.actionGroup}>
              <ActionRow
                label="Report this domain"
                icon="flag"
                iconColor={colors.warn}
                colors={colors}
                onPress={() => router.push({ pathname: "/(tabs)/report", params: { inputUrl: domain } })}
              />
              <Separator colors={colors} />
              {isBlocked ? (
                <ActionRow
                  label="Remove from blocklist"
                  icon="slash"
                  iconColor={colors.blockStrict}
                  colors={colors}
                  onPress={() => { removeBlockedDomain(domain); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                />
              ) : (
                <ActionRow
                  label="Add to blocklist"
                  icon="slash"
                  iconColor={colors.blockStrict}
                  colors={colors}
                  onPress={() => { addBlockedDomain(domain); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                />
              )}
              <Separator colors={colors} />
              {isTrusted ? (
                <ActionRow
                  label="Remove from trustlist"
                  icon="check-circle"
                  iconColor={colors.clean}
                  colors={colors}
                  onPress={() => { removeTrustedDomain(domain); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                />
              ) : (
                <ActionRow
                  label="Add to trustlist"
                  icon="check-circle"
                  iconColor={colors.clean}
                  colors={colors}
                  onPress={() => { addTrustedDomain(domain); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type C = ReturnType<typeof import("@/hooks/useColors").useColors>;

function ActionRow({ label, icon, iconColor, colors, onPress }: { label: string; icon: any; iconColor: string; colors: C; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 }]}
      onPress={onPress}
    >
      <Feather name={icon} size={16} color={iconColor} />
      <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

function Separator({ colors }: { colors: C }) {
  return <View style={[styles.sep, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 14 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    gap: 8,
    height: 52,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    height: 52,
  },
  searchGo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  actionGroup: { borderRadius: 16, overflow: "hidden" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  actionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sep: { height: 1, marginLeft: 46 },
});
