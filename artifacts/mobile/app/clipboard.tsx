import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type ClipboardEntry, useClipboard } from "@/context/ClipboardContext";
import { useColors } from "@/hooks/useColors";

export default function ClipboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const clipboard = useClipboard();
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const pinned = clipboard.history.filter((e) => clipboard.pinnedIds.includes(e.id));
  const unpinned = clipboard.history.filter((e) => !clipboard.pinnedIds.includes(e.id));
  const filtered = [...pinned, ...unpinned].filter((e) => {
    const q = search.toLowerCase();
    return !q || e.text.toLowerCase().includes(q) || e.sourceDomain.toLowerCase().includes(q);
  });

  async function handleCopy(entry: ClipboardEntry) {
    await Clipboard.setStringAsync(entry.text);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  }

  function truncate(text: string, max = 120): string {
    return text.length > max ? text.slice(0, max) + "…" : text;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Smart Clipboard</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{clipboard.history.length} items remembered</Text>
        </View>
        {clipboard.history.length > 0 && (
          <Pressable
            hitSlop={8}
            onPress={() => Alert.alert("Clear History", "Delete all clipboard history? Pinned items are kept.", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clipboard.clearHistory },
            ])}
          >
            <Feather name="trash-2" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {clipboard.history.length > 4 && (
        <View style={[styles.searchBar, { backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search copied text..."
            placeholderTextColor={colors.mutedForeground}
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {clipboard.history.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="clipboard" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Clipboard Empty</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Text you copy while browsing will appear here with its source URL
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 8 }} showsVerticalScrollIndicator={false}>
          {filtered.map((entry) => {
            const isPinned = clipboard.pinnedIds.includes(entry.id);
            const isCopied = copiedId === entry.id;
            return (
              <Pressable
                key={entry.id}
                style={[styles.entryCard, {
                  backgroundColor: colors.card,
                  borderColor: isPinned ? colors.primary + "50" : colors.border,
                  borderLeftColor: isPinned ? colors.primary : colors.border,
                }]}
                onPress={() => handleCopy(entry)}
                onLongPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  clipboard.togglePin(entry.id);
                }}
              >
                <View style={styles.entryTop}>
                  <View style={[styles.sourceBadge, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="globe" size={10} color={colors.primary} />
                    <Text style={[styles.sourceDomain, { color: colors.primary }]} numberOfLines={1}>
                      {entry.sourceDomain || "unknown"}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatTime(entry.copiedAt)}</Text>
                  <View style={styles.entryActions}>
                    <Pressable
                      hitSlop={8}
                      onPress={() => clipboard.togglePin(entry.id)}
                    >
                      <Feather name="bookmark" size={13} color={isPinned ? colors.primary : colors.mutedForeground} />
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => clipboard.removeEntry(entry.id)}>
                      <Feather name="x" size={13} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                </View>
                <Text style={[styles.entryText, { color: colors.foreground }]}>{truncate(entry.text)}</Text>
                <View style={styles.entryBottom}>
                  {!!entry.label && (
                    <View style={[styles.labelBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.labelText, { color: colors.mutedForeground }]}>{entry.label}</Text>
                    </View>
                  )}
                  <View style={[styles.copyIndicator, { backgroundColor: isCopied ? colors.clean + "20" : colors.muted }]}>
                    <Feather name={isCopied ? "check" : "copy"} size={11} color={isCopied ? colors.clean : colors.mutedForeground} />
                    <Text style={[styles.copyText, { color: isCopied ? colors.clean : colors.mutedForeground }]}>
                      {isCopied ? "Copied!" : "Tap to copy"}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  headerTitle: { flex: 1, gap: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 28 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  entryCard: {
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 3,
    padding: 13, gap: 6,
  },
  entryTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  sourceBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  sourceDomain: { fontSize: 11, fontFamily: "Inter_600SemiBold", maxWidth: 100 },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  entryActions: { flexDirection: "row", gap: 8 },
  entryText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  entryBottom: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  labelBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  labelText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  copyIndicator: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  copyText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
