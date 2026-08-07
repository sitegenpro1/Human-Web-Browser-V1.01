import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useApp } from "@/context/AppContext";
import { useBookmarks, type Bookmark } from "@/context/BookmarksContext";
import { useHistory, type HistoryEntry } from "@/context/HistoryContext";
import { useResearch, type ResearchSource } from "@/context/ResearchContext";
import { useColors } from "@/hooks/useColors";

type ExportData = {
  version: number;
  exportedAt: string;
  settings: object;
  reports: object[];
  blockedDomains: string[];
  trustedDomains: string[];
  bookmarks: Bookmark[];
  history: HistoryEntry[];
  sources: ResearchSource[];
};

export default function DataExportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, reports, blockedDomains, trustedDomains, importData } = useApp();
  const { bookmarks, importBookmarks } = useBookmarks();
  const { history, importHistory } = useHistory();
  const { sources, importSources } = useResearch();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  function buildExport(): string {
    const data: ExportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      settings,
      reports,
      blockedDomains,
      trustedDomains,
      bookmarks,
      history,
      sources,
    };
    return JSON.stringify(data, null, 2);
  }

  async function handleExportShare() {
    try {
      const json = buildExport();
      await Share.share({
        message: json,
        title: "HWB Data Export",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }

  async function handleExportCopy() {
    try {
      const json = buildExport();
      await Clipboard.setStringAsync(json);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied", "Export JSON copied to clipboard.");
    } catch {}
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await Clipboard.getStringAsync();
      setImportText(text);
      setImportError("");
    } catch {
      setImportError("Could not read clipboard.");
    }
  }

  function handleImport() {
    setImportError("");
    setImportSuccess(false);
    if (!importText.trim()) {
      setImportError("Paste your export JSON first.");
      return;
    }
    try {
      const data = JSON.parse(importText.trim());
      if (!data || typeof data !== "object") {
        setImportError("Invalid JSON format.");
        return;
      }

      let imported = 0;

      const appOk = importData(importText.trim());
      if (appOk) imported++;

      if (Array.isArray(data.bookmarks)) {
        importBookmarks(data.bookmarks);
        imported++;
      }
      if (Array.isArray(data.history)) {
        importHistory(data.history);
        imported++;
      }
      if (Array.isArray(data.sources)) {
        importSources(data.sources);
        imported++;
      }

      if (imported === 0) {
        setImportError("No recognizable data found in the JSON.");
        return;
      }

      setImportSuccess(true);
      setImportText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setImportError("Failed to parse JSON. Make sure you pasted a valid export file.");
    }
  }

  const stats = [
    { label: "Bookmarks", count: bookmarks.length, icon: "bookmark", color: colors.primary },
    { label: "History", count: history.length, icon: "clock", color: colors.mutedForeground },
    { label: "Research", count: sources.length, icon: "folder", color: colors.clean },
    { label: "Reports", count: reports.length, icon: "flag", color: colors.warn },
    { label: "Blocked", count: blockedDomains.length, icon: "slash", color: colors.blockStrict },
    { label: "Trusted", count: trustedDomains.length, icon: "check-circle", color: colors.clean },
  ];

  return (
    <>
      <Stack.Screen options={{ title: "Export / Import Data", headerBackTitle: "More" }} />
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="database" size={18} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>Your Local Data</Text>
          <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>
            All data is stored only on your device. Export it as JSON to back it up or move to another device.
          </Text>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {stats.map((s, i) => (
            <View
              key={s.label}
              style={[
                styles.statCell,
                i % 3 !== 2 && { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.border },
                i < 3 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <Feather name={s.icon as any} size={14} color={s.color} />
              <Text style={[styles.statCount, { color: colors.foreground }]}>{s.count}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        <SectionLabel label="Export" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActionRow
            icon="share"
            label="Share as JSON"
            desc="Send via Messages, Email, Files, etc."
            color={colors.primary}
            colors={colors}
            onPress={handleExportShare}
          />
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          <ActionRow
            icon="copy"
            label="Copy to Clipboard"
            desc="Paste into a text file or note"
            color={colors.primary}
            colors={colors}
            onPress={handleExportCopy}
          />
        </View>

        <SectionLabel label="Import" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActionRow
            icon="upload"
            label="Import from JSON"
            desc="Paste previously exported data"
            color={colors.clean}
            colors={colors}
            onPress={() => {
              setImportText("");
              setImportError("");
              setImportSuccess(false);
              setShowImportModal(true);
            }}
          />
        </View>

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Importing replaces existing data in each category. Settings, reports, lists, bookmarks, history, and research sources are all included.
        </Text>
      </ScrollView>

      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 16 }]}>
            <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />
            <Text style={[modalStyles.title, { color: colors.foreground }]}>Import Data</Text>
            <Text style={[modalStyles.subtitle, { color: colors.mutedForeground }]}>
              Paste your previously exported JSON below. This will replace the matching data on this device.
            </Text>

            <Pressable
              style={({ pressed }) => [
                modalStyles.pasteBtn,
                { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40", opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={handlePasteFromClipboard}
            >
              <Feather name="clipboard" size={14} color={colors.primary} />
              <Text style={[modalStyles.pasteBtnText, { color: colors.primary }]}>Paste from Clipboard</Text>
            </Pressable>

            <TextInput
              style={[modalStyles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={importText}
              onChangeText={(t) => { setImportText(t); setImportError(""); setImportSuccess(false); }}
              placeholder='{"version":2,"bookmarks":[...],...}'
              placeholderTextColor={colors.mutedForeground}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
            />

            {importError ? (
              <View style={[modalStyles.errorRow, { backgroundColor: colors.blockStrict + "18" }]}>
                <Feather name="alert-circle" size={13} color={colors.blockStrict} />
                <Text style={[modalStyles.errorText, { color: colors.blockStrict }]}>{importError}</Text>
              </View>
            ) : null}

            {importSuccess ? (
              <View style={[modalStyles.successRow, { backgroundColor: colors.clean + "18" }]}>
                <Feather name="check-circle" size={13} color={colors.clean} />
                <Text style={[modalStyles.successText, { color: colors.clean }]}>Data imported successfully!</Text>
              </View>
            ) : null}

            <View style={modalStyles.btnRow}>
              <Pressable
                style={({ pressed }) => [
                  modalStyles.cancelBtn,
                  { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={[modalStyles.cancelBtnText, { color: colors.foreground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  modalStyles.importBtn,
                  { backgroundColor: colors.clean, opacity: pressed || !importText.trim() ? 0.6 : 1 },
                ]}
                onPress={handleImport}
                disabled={!importText.trim()}
              >
                <Feather name="upload" size={14} color="#000" />
                <Text style={modalStyles.importBtnText}>Import</Text>
              </Pressable>
            </View>
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

function ActionRow({
  icon, label, desc, color, colors, onPress,
}: { icon: any; label: string; desc: string; color: string; colors: C; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionRow, { opacity: pressed ? 0.6 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={17} color={color} />
      </View>
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    alignItems: "center",
  },
  infoTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  infoBody: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, maxWidth: 280 },
  statsGrid: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    overflow: "hidden",
  },
  statCell: {
    width: "33.33%",
    alignItems: "center",
    paddingVertical: 14,
    gap: 3,
  },
  statCount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.7,
    marginTop: 8,
    marginLeft: 4,
  },
  group: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { flex: 1, gap: 2 },
  actionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  footnote: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 4, marginHorizontal: 4 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  pasteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  pasteBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    height: 140,
    lineHeight: 18,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  successText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  importBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  importBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#000" },
});
