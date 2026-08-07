import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SearchEngine, ThemeMode, useApp } from "@/context/AppContext";
import { useHistory } from "@/context/HistoryContext";
import { useColors } from "@/hooks/useColors";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, resetData } = useApp();
  const { clearHistory } = useHistory();
  const [resetting, setResetting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((d) => setCurrentIp(d.ip))
      .catch(() => setCurrentIp("Unavailable"));
  }, []);

  const engines: Array<{ value: SearchEngine; label: string }> = [
    { value: "google_web", label: "Google Web Mode (udm=14)" },
    { value: "duckduckgo", label: "DuckDuckGo" },
    { value: "brave", label: "Brave Search" },
  ];

  const themes: Array<{ value: ThemeMode; label: string }> = [
    { value: "system", label: "System" },
    { value: "dark", label: "Dark" },
    { value: "light", label: "Light" },
  ];

  function confirmReset() {
    Alert.alert("Reset All Data", "Deletes all reports, lists, and settings. Cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset", style: "destructive",
        onPress: async () => {
          setResetting(true);
          await resetData();
          setResetting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  function confirmClearBrowsing() {
    Alert.alert(
      "Clear Browsing Data",
      "This will delete your full browsing history. Bookmarks and saved data will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear History",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            await clearHistory();
            setClearing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Settings", headerBackTitle: "More" }} />
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel label="Default Search Engine" colors={colors} />
        <OptionGroup colors={colors}>
          {engines.map((e, i) => (
            <React.Fragment key={e.value}>
              <Pressable
                style={styles.optionRow}
                onPress={() => { updateSettings({ defaultSearchEngine: e.value }); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{e.label}</Text>
                <Radio selected={settings.defaultSearchEngine === e.value} color={colors.primary} />
              </Pressable>
              {i < engines.length - 1 && <Sep colors={colors} indent={0} />}
            </React.Fragment>
          ))}
        </OptionGroup>

        <SectionLabel label="Behavior" colors={colors} />
        <OptionGroup colors={colors}>
          <ToggleRow
            label="Strict Mode"
            desc="Warn about heavily reported domains"
            value={settings.strictMode}
            onChange={(v) => { updateSettings({ strictMode: v }); Haptics.selectionAsync(); }}
            accentColor={colors.primary}
            colors={colors}
          />
          <Sep colors={colors} indent={16} />
          <ToggleRow
            label="Open in New Tab"
            desc="Opens links in a new browser tab (web)"
            value={settings.openInNewTab}
            onChange={(v) => { updateSettings({ openInNewTab: v }); Haptics.selectionAsync(); }}
            accentColor={colors.primary}
            colors={colors}
          />
          <Sep colors={colors} indent={16} />
          <ToggleRow
            label="Demo Data"
            desc="Include seeded example domain reports"
            value={settings.demoDataEnabled}
            onChange={(v) => { updateSettings({ demoDataEnabled: v }); Haptics.selectionAsync(); }}
            accentColor={colors.primary}
            colors={colors}
          />
        </OptionGroup>

        <SectionLabel label="Theme" colors={colors} />
        <OptionGroup colors={colors}>
          {themes.map((t, i) => (
            <React.Fragment key={t.value}>
              <Pressable
                style={styles.optionRow}
                onPress={() => { updateSettings({ theme: t.value }); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.optionLabel, { color: colors.foreground }]}>{t.label}</Text>
                <Radio selected={settings.theme === t.value} color={colors.primary} />
              </Pressable>
              {i < themes.length - 1 && <Sep colors={colors} indent={0} />}
            </React.Fragment>
          ))}
        </OptionGroup>

        {/* ── Privacy ── */}
        <SectionLabel label="Privacy" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Current IP row */}
          <View style={styles.ipRow}>
            <View style={styles.ipLeft}>
              <Text style={[styles.optionLabel, { color: colors.foreground }]}>Your IP Address</Text>
              <Text style={[styles.ipValue, { color: colors.mutedForeground }]}>
                {currentIp ?? "Fetching…"}
              </Text>
            </View>
            <View style={[styles.ipBadge, { backgroundColor: "#FFB02018", borderColor: "#FFB02040" }]}>
              <Feather name="wifi" size={11} color="#FFB020" />
              <Text style={[styles.ipBadgeText, { color: "#FFB020" }]}>Visible</Text>
            </View>
          </View>

          <Sep colors={colors} indent={0} />

          {/* IP Protection (Premium) */}
          <Pressable style={styles.optionRow} onPress={() => setShowPremiumModal(true)}>
            <View style={styles.premiumLeft}>
              <View style={styles.premiumLabelRow}>
                <Text style={[styles.optionLabel, { color: colors.foreground, flex: 0 }]}>IP Protection</Text>
                <View style={styles.premiumBadge}>
                  <Feather name="star" size={9} color="#FFB020" />
                  <Text style={styles.premiumBadgeText}>PREMIUM</Text>
                </View>
              </View>
              <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                Route traffic through a private relay
              </Text>
            </View>
            <Feather name="lock" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* ── Data ── */}
        <SectionLabel label="Data" colors={colors} />
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || clearing ? 0.7 : 1 },
          ]}
          onPress={confirmClearBrowsing}
          disabled={clearing}
        >
          <Feather name="trash" size={15} color={colors.warn} />
          <Text style={[styles.actionBtnText, { color: colors.warn }]}>
            {clearing ? "Clearing…" : "Clear Browsing History"}
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.dangerBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || resetting ? 0.7 : 1 },
          ]}
          onPress={confirmReset}
          disabled={resetting}
        >
          <Text style={[styles.dangerBtnText, { color: colors.blockStrict }]}>
            {resetting ? "Resetting..." : "Reset All Local Data"}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Premium Modal */}
      <Modal
        visible={showPremiumModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.premModalOverlay}>
          <View style={[styles.premModal, { backgroundColor: colors.toolbar, borderColor: colors.border }]}>
            <View style={[styles.premIconWrap, { backgroundColor: "#FFB02018" }]}>
              <Feather name="shield" size={28} color="#FFB020" />
            </View>
            <Text style={[styles.premTitle, { color: colors.foreground }]}>IP Protection</Text>
            <View style={[styles.premBadgeRow]}>
              <View style={[styles.premBadge2, { backgroundColor: "#FFB02018", borderColor: "#FFB02040" }]}>
                <Feather name="star" size={10} color="#FFB020" />
                <Text style={[styles.premBadge2Text, { color: "#FFB020" }]}>PREMIUM FEATURE</Text>
              </View>
            </View>
            <Text style={[styles.premBody, { color: colors.mutedForeground }]}>
              When activated, all your browsing traffic is routed through a private relay server — websites will see the relay's IP instead of yours.{"\n\n"}
              This feature is available on the premium plan. Early access members get it free for life.
            </Text>
            <Pressable
              style={[styles.premBtn, { backgroundColor: "#FFB020" }]}
              onPress={() => setShowPremiumModal(false)}
            >
              <Text style={styles.premBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

type C = ReturnType<typeof import("@/hooks/useColors").useColors>;

function SectionLabel({ label, colors }: { label: string; colors: C }) {
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>;
}

function OptionGroup({ colors, children }: { colors: C; children: React.ReactNode }) {
  return <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function Radio({ selected, color }: { selected: boolean; color: string }) {
  return (
    <View style={[styles.radio, { borderColor: selected ? color : "#555" }]}>
      {selected && <View style={[styles.radioDot, { backgroundColor: color }]} />}
    </View>
  );
}

function ToggleRow({ label, desc, value, onChange, accentColor, colors }: {
  label: string; desc: string; value: boolean; onChange: (v: boolean) => void; accentColor: string; colors: C;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={[styles.optionLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#555", true: accentColor }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Sep({ colors, indent }: { colors: C; indent: number }) {
  return <View style={[styles.sep, { backgroundColor: colors.border, marginLeft: indent }]} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 6 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.7, marginTop: 14, marginLeft: 4 },
  group: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  optionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  optionLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  optionDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  toggleText: { flex: 1, gap: 2 },
  sep: { height: StyleSheet.hairlineWidth },

  // IP rows
  ipRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  ipLeft: { flex: 1, gap: 2 },
  ipValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  ipBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  ipBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // Premium row
  premiumLeft: { flex: 1, gap: 3 },
  premiumLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  premiumBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#FFB02018", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#FFB020" },

  // Action buttons
  actionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderRadius: 10, borderWidth: 1, paddingVertical: 14,
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dangerBtn: { borderRadius: 10, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  dangerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Premium modal
  premModalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center", justifyContent: "center", padding: 28,
  },
  premModal: {
    width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1,
    padding: 24, alignItems: "center", gap: 12,
  },
  premIconWrap: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  premTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  premBadgeRow: { flexDirection: "row" },
  premBadge2: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1,
  },
  premBadge2Text: { fontSize: 11, fontFamily: "Inter_700Bold" },
  premBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  premBtn: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 40, marginTop: 4 },
  premBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
});
