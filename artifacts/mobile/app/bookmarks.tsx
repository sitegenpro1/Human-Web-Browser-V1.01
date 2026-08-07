import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

import { useBookmarks } from "@/context/BookmarksContext";
import { useColors } from "@/hooks/useColors";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export default function BookmarksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { bookmarks, removeBookmark } = useBookmarks();

  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.domain.toLowerCase().includes(search.toLowerCase()) ||
          b.url.toLowerCase().includes(search.toLowerCase())
      )
    : bookmarks;

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Bookmarks</Text>
        <Pressable
          style={({ pressed }) => [styles.doneBtn, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.back()}
        >
          <Text style={[styles.doneBtnText, { color: colors.primary }]}>Done</Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={14} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search bookmarks"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 40 },
          filtered.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bookmark" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {search ? "No matches" : "No bookmarks yet"}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              {search
                ? "Try a different search term."
                : "While browsing, tap the bookmark icon in the footer to save a page."}
            </Text>
          </View>
        ) : (
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {filtered.map((bookmark, i) => (
              <React.Fragment key={bookmark.id}>
                <View style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="globe" size={14} color={colors.primary} />
                  </View>
                  <Pressable
                    style={styles.rowText}
                    onPress={() => {
                      router.back();
                      // Pass URL via a global event or just let user navigate from browser
                    }}
                  >
                    <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {bookmark.title}
                    </Text>
                    <Text style={[styles.rowSubtitle, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {bookmark.domain} · {formatDate(bookmark.createdAt)}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => removeBookmark(bookmark.id)}
                    hitSlop={8}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <Feather name="trash-2" size={15} color={colors.blockStrict} />
                  </Pressable>
                </View>
                {i < filtered.length - 1 && (
                  <View style={[styles.sep, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
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
  doneBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  list: { paddingHorizontal: 16, gap: 0 },
  emptyContainer: { flex: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
  group: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  rowSubtitle: { fontSize: 11, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
});
