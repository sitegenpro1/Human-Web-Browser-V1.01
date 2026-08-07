import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  RESEARCH_TAG_COLORS,
  RESEARCH_TAG_LABELS,
  type ResearchTag,
  useResearch,
} from "@/context/ResearchContext";
import { useColors } from "@/hooks/useColors";

const TAG_ORDER: ResearchTag[] = ["useful", "official", "article", "forum", "suspicious"];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function ResearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ url?: string; title?: string }>();
  const { sources, addSource, removeSource } = useResearch();

  const [filterTag, setFilterTag] = useState<ResearchTag | null>(null);
  const [showAdd, setShowAdd] = useState(Boolean(params.url));

  // Add form state
  const [addUrl, setAddUrl] = useState(params.url ?? "");
  const [addTitle, setAddTitle] = useState(params.title ?? "");
  const [addNote, setAddNote] = useState("");
  const [addTag, setAddTag] = useState<ResearchTag>("useful");

  const filtered = filterTag ? sources.filter((s) => s.tag === filterTag) : sources;
  const topPad = Platform.OS === "web" ? 0 : insets.top;

  function handleAdd() {
    if (!addUrl.trim()) return;
    addSource({ url: addUrl.trim(), title: addTitle.trim(), domain: "", note: addNote.trim(), tag: addTag });
    setShowAdd(false);
    setAddUrl(""); setAddTitle(""); setAddNote(""); setAddTag("useful");
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Research Tray</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => setShowAdd(true)}
          >
            <Feather name="plus" size={17} color={colors.primary} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
          </Pressable>
        </View>
      </View>

      {/* Tag filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={[styles.filterChip, { backgroundColor: !filterTag ? colors.primary + "20" : colors.card, borderColor: !filterTag ? colors.primary + "60" : colors.border }]}
          onPress={() => setFilterTag(null)}
        >
          <Text style={[styles.filterChipText, { color: !filterTag ? colors.primary : colors.mutedForeground }]}>All</Text>
        </Pressable>
        {TAG_ORDER.map((tag) => (
          <Pressable
            key={tag}
            style={[styles.filterChip, { backgroundColor: filterTag === tag ? RESEARCH_TAG_COLORS[tag] + "20" : colors.card, borderColor: filterTag === tag ? RESEARCH_TAG_COLORS[tag] + "60" : colors.border }]}
            onPress={() => setFilterTag(filterTag === tag ? null : tag)}
          >
            <Text style={[styles.filterChipText, { color: filterTag === tag ? RESEARCH_TAG_COLORS[tag] : colors.mutedForeground }]}>
              {RESEARCH_TAG_LABELS[tag]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sources */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }, filtered.length === 0 && styles.emptyContainer]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="folder" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filterTag ? "No sources with this tag" : "Research tray is empty"}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Save pages as sources while browsing using the ⋮ menu.
            </Text>
            <Pressable
              style={[styles.emptyAddBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
              onPress={() => setShowAdd(true)}
            >
              <Feather name="plus" size={13} color={colors.primary} />
              <Text style={[styles.emptyAddBtnText, { color: colors.primary }]}>Add Source</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filtered.map((source, i) => (
              <React.Fragment key={source.id}>
                <View style={styles.row}>
                  <View style={[styles.tagDot, { backgroundColor: RESEARCH_TAG_COLORS[source.tag] + "30" }]}>
                    <View style={[styles.tagDotInner, { backgroundColor: RESEARCH_TAG_COLORS[source.tag] }]} />
                  </View>
                  <View style={styles.rowBody}>
                    <View style={styles.rowTop}>
                      <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                        {source.title || source.domain}
                      </Text>
                      <View style={[styles.tagBadge, { backgroundColor: RESEARCH_TAG_COLORS[source.tag] + "20" }]}>
                        <Text style={[styles.tagBadgeText, { color: RESEARCH_TAG_COLORS[source.tag] }]}>
                          {RESEARCH_TAG_LABELS[source.tag]}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.rowDomain, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {source.domain} · {formatDate(source.createdAt)}
                    </Text>
                    {source.note ? (
                      <Text style={[styles.rowNote, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {source.note}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => removeSource(source.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="trash-2" size={14} color={colors.blockStrict} />
                  </Pressable>
                </View>
                {i < filtered.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add source modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowAdd(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add to Research</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>URL</Text>
            <TextInput
              style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={addUrl}
              onChangeText={setAddUrl}
              placeholder="https://..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Title (optional)</Text>
            <TextInput
              style={[styles.field, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={addTitle}
              onChangeText={setAddTitle}
              placeholder="Page title"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
            <TextInput
              style={[styles.fieldMulti, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground }]}
              value={addNote}
              onChangeText={setAddNote}
              placeholder="Why is this useful?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={2}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tag</Text>
            <View style={styles.tagRow}>
              {TAG_ORDER.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => setAddTag(tag)}
                  style={[styles.tagBtn, { backgroundColor: addTag === tag ? RESEARCH_TAG_COLORS[tag] + "20" : colors.background, borderColor: addTag === tag ? RESEARCH_TAG_COLORS[tag] : colors.border }]}
                >
                  <Text style={[styles.tagBtnText, { color: addTag === tag ? RESEARCH_TAG_COLORS[tag] : colors.mutedForeground }]}>
                    {RESEARCH_TAG_LABELS[tag]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleAdd}
            >
              <Text style={[styles.addBtnText, { color: colors.primaryForeground }]}>Save Source</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1, fontSize: 17, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  headerBtn: { padding: 6 },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  filterRow: { maxHeight: 46 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 6, flexDirection: "row" },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 0 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 20 },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginTop: 4 },
  emptyAddBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  group: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  tagDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 },
  tagDotInner: { width: 8, height: 8, borderRadius: 4 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  tagBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  rowDomain: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowNote: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 46 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, gap: 8 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  field: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  fieldMulti: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 70, textAlignVertical: "top" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  tagBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  addBtn: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 8 },
  addBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
