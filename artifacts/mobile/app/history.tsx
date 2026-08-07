import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type HistoryEntry, useHistory } from "@/context/HistoryContext";
import { useColors } from "@/hooks/useColors";

function groupByDate(entries: HistoryEntry[]): { label: string; entries: HistoryEntry[] }[] {
  const groups: Record<string, HistoryEntry[]> = {};
  const now = new Date();
  const today = now.toDateString();
  const yesterday = new Date(now.getTime() - 86400000).toDateString();

  for (const entry of entries) {
    const d = new Date(entry.visitedAt);
    const ds = d.toDateString();
    let label: string;
    if (ds === today) label = "Today";
    else if (ds === yesterday) label = "Yesterday";
    else label = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(entry);
  }

  return Object.entries(groups).map(([label, entries]) => ({ label, entries }));
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { history, clearHistory, removeHistoryEntry, isPrivateMode, togglePrivateMode, setPendingNavUrl } = useHistory();

  const groups = useMemo(
    () => (isPrivateMode ? [] : groupByDate(history)),
    [history, isPrivateMode]
  );
  const topPad = Platform.OS === "web" ? 0 : insets.top;

  function handleEntryPress(entry: HistoryEntry) {
    setPendingNavUrl(entry.url);
    router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>History</Text>
        <View style={styles.headerActions}>
          {history.length > 0 && !isPrivateMode && (
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={clearHistory}
            >
              <Text style={[styles.headerBtnText, { color: colors.blockStrict }]}>Clear All</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.headerBtnText, { color: colors.primary }]}>Done</Text>
          </Pressable>
        </View>
      </View>

      {/* Private mode toggle */}
      <Pressable
        style={[
          styles.privateBanner,
          {
            backgroundColor: isPrivateMode ? colors.primary + "18" : colors.card,
            borderColor: isPrivateMode ? colors.primary + "40" : colors.border,
          },
        ]}
        onPress={togglePrivateMode}
      >
        <Feather name="eye-off" size={15} color={isPrivateMode ? colors.primary : colors.mutedForeground} />
        <View style={styles.privateBannerText}>
          <Text style={[styles.privateBannerTitle, { color: isPrivateMode ? colors.primary : colors.foreground }]}>
            Private Mode {isPrivateMode ? "ON" : "OFF"}
          </Text>
          <Text style={[styles.privateBannerSub, { color: colors.mutedForeground }]}>
            {isPrivateMode ? "History is not being saved." : "History is being recorded."}
          </Text>
        </View>
        <View style={[styles.toggle, { backgroundColor: isPrivateMode ? colors.primary : colors.border }]}>
          <View style={[styles.toggleKnob, { alignSelf: isPrivateMode ? "flex-end" : "flex-start" }]} />
        </View>
      </Pressable>

      {/* History list */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
          groups.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="clock" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No history</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {isPrivateMode
                ? "Private mode is on — pages are not saved."
                : "Pages you visit will appear here."}
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View key={group.label} style={styles.group}>
              <Text style={[styles.groupLabel, { color: colors.mutedForeground }]}>{group.label}</Text>
              <View style={[styles.groupItems, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {group.entries.map((entry, i) => (
                  <React.Fragment key={entry.id}>
                    <Pressable
                      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
                      onPress={() => handleEntryPress(entry)}
                      android_ripple={{ color: colors.primary + "18" }}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: colors.toolbar }]}>
                        <Feather name="globe" size={13} color={colors.mutedForeground} />
                      </View>
                      <View style={styles.rowText}>
                        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {entry.title || entry.domain}
                        </Text>
                        <Text style={[styles.rowSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {entry.domain} · {formatTime(entry.visitedAt)}
                        </Text>
                      </View>
                      <Pressable
                        onPress={(e) => { e.stopPropagation(); removeHistoryEntry(entry.id); }}
                        hitSlop={8}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 4 })}
                      >
                        <Feather name="x" size={14} color={colors.mutedForeground} />
                      </Pressable>
                    </Pressable>
                    {i < group.entries.length - 1 && (
                      <View style={[styles.sep, { backgroundColor: colors.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row" },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  privateBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  privateBannerText: { flex: 1, gap: 1 },
  privateBannerTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  privateBannerSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  toggle: { width: 34, height: 20, borderRadius: 10, padding: 2, justifyContent: "center" },
  toggleKnob: { width: 16, height: 16, borderRadius: 8, backgroundColor: "#fff" },
  scroll: { paddingHorizontal: 16, paddingTop: 12, gap: 16 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 20 },
  group: { gap: 6 },
  groupLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 2 },
  groupItems: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rowSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 52 },
});
