import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { normalizeDomain } from "@/lib/normalizeDomain";

export default function ListsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    blockedDomains, trustedDomains,
    addBlockedDomain, removeBlockedDomain,
    addTrustedDomain, removeTrustedDomain,
    exportData, importData,
  } = useApp();

  const [blockInput, setBlockInput] = useState("");
  const [trustInput, setTrustInput] = useState("");
  const [blockError, setBlockError] = useState("");
  const [trustError, setTrustError] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function addBlocked() {
    const d = normalizeDomain(blockInput.trim());
    if (!d) { setBlockError("Invalid domain"); return; }
    addBlockedDomain(d);
    setBlockInput(""); setBlockError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function addTrusted() {
    const d = normalizeDomain(trustInput.trim());
    if (!d) { setTrustError("Invalid domain"); return; }
    addTrustedDomain(d);
    setTrustInput(""); setTrustError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleExport() {
    const data = exportData();
    if (Platform.OS === "web") {
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "hwb-export.json"; a.click();
      URL.revokeObjectURL(url);
    } else {
      Alert.alert("Export", "Export is available in the web version.");
    }
  }

  function handleImport() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file"; input.accept = ".json,application/json";
      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          if (!text) { setImportError("Empty file."); return; }
          const ok = importData(text);
          if (ok) { setImportSuccess(true); setImportError(""); }
          else { setImportError("Invalid format."); }
        };
        reader.readAsText(file);
      };
      input.click();
    } else {
      Alert.alert("Import", "Import is available in the web version.");
    }
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>My Lists</Text>

      {(importSuccess || importError) && (
        <View style={[styles.infoRow, { backgroundColor: importSuccess ? colors.clean + "20" : colors.blockStrict + "20" }]}>
          <Feather name={importSuccess ? "check-circle" : "alert-circle"} size={13} color={importSuccess ? colors.clean : colors.blockStrict} />
          <Text style={[styles.infoText, { color: importSuccess ? colors.clean : colors.blockStrict }]}>
            {importSuccess ? "Data imported." : importError}
          </Text>
        </View>
      )}

      <SectionHeader label="Blocked" count={blockedDomains.length} colors={colors} />
      <AddRow
        value={blockInput}
        placeholder="domain to block"
        error={blockError}
        onChangeText={(t) => { setBlockInput(t); setBlockError(""); }}
        onAdd={addBlocked}
        accentColor={colors.blockStrict}
        colors={colors}
      />
      <DomainList
        domains={blockedDomains}
        accentColor={colors.blockStrict}
        emptyLabel="No blocked domains"
        onRemove={(d) => { removeBlockedDomain(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        colors={colors}
      />

      <SectionHeader label="Trusted" count={trustedDomains.length} colors={colors} />
      <AddRow
        value={trustInput}
        placeholder="domain to trust"
        error={trustError}
        onChangeText={(t) => { setTrustInput(t); setTrustError(""); }}
        onAdd={addTrusted}
        accentColor={colors.clean}
        colors={colors}
      />
      <DomainList
        domains={trustedDomains}
        accentColor={colors.clean}
        emptyLabel="No trusted domains"
        onRemove={(d) => { removeTrustedDomain(d); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        colors={colors}
      />

      <View style={styles.ioRow}>
        <Pressable
          style={({ pressed }) => [styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          onPress={handleExport}
        >
          <Feather name="download" size={14} color={colors.mutedForeground} />
          <Text style={[styles.ioBtnText, { color: colors.mutedForeground }]}>Export JSON</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.ioBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
          onPress={handleImport}
        >
          <Feather name="upload" size={14} color={colors.mutedForeground} />
          <Text style={[styles.ioBtnText, { color: colors.mutedForeground }]}>Import JSON</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type C = ReturnType<typeof import("@/hooks/useColors").useColors>;

function SectionHeader({ label, count, colors }: { label: string; count: number; colors: C }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={[styles.countPill, { backgroundColor: colors.secondary }]}>
        <Text style={[styles.countText, { color: colors.mutedForeground }]}>{count}</Text>
      </View>
    </View>
  );
}

function AddRow({ value, placeholder, error, onChangeText, onAdd, accentColor, colors }: {
  value: string; placeholder: string; error: string; onChangeText: (t: string) => void; onAdd: () => void; accentColor: string; colors: C;
}) {
  return (
    <View style={styles.addContainer}>
      <View style={[styles.addRow, { backgroundColor: colors.card, borderColor: error ? colors.blockStrict : colors.border }]}>
        <TextInput
          style={[styles.addInput, { color: colors.foreground }]}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onAdd}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={200}
        />
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: accentColor, opacity: pressed ? 0.8 : 1 }]}
          onPress={onAdd}
        >
          <Feather name="plus" size={17} color="#fff" />
        </Pressable>
      </View>
      {!!error && <Text style={[styles.addError, { color: colors.blockStrict }]}>{error}</Text>}
    </View>
  );
}

function DomainList({ domains, accentColor, emptyLabel, onRemove, colors }: {
  domains: string[]; accentColor: string; emptyLabel: string; onRemove: (d: string) => void; colors: C;
}) {
  if (domains.length === 0) {
    return (
      <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{emptyLabel}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.domainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {domains.map((d, i) => (
        <React.Fragment key={d}>
          <View style={styles.domainRow}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <Text style={[styles.domainText, { color: colors.foreground }]} numberOfLines={1}>{d}</Text>
            <Pressable onPress={() => onRemove(d)} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {i < domains.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 10 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3, marginBottom: 2 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, padding: 10 },
  infoText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  sectionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  countPill: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 8 },
  countText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addContainer: { gap: 4 },
  addRow: { flexDirection: "row", alignItems: "center", borderRadius: 10, borderWidth: 1, paddingLeft: 12, overflow: "hidden" },
  addInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 44 },
  addBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  addError: { fontSize: 11, fontFamily: "Inter_400Regular", marginLeft: 4 },
  domainCard: { borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  domainRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  domainText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  sep: { height: 1, marginLeft: 29 },
  emptyCard: { borderRadius: 10, borderWidth: 1, padding: 14, alignItems: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  ioRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  ioBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 10, borderWidth: 1, paddingVertical: 11 },
  ioBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
