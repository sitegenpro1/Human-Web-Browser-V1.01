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
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type SessionCapsule, useSessions } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

export default function SessionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const sessions = useSessions();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = sessions.capsules.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.domain.includes(q) || c.url.includes(q);
  });

  function formatDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString();
  }

  function handleOpen(capsule: SessionCapsule) {
    router.back();
    router.setParams({ openUrl: capsule.url });
  }

  async function handleShare(capsule: SessionCapsule) {
    const text = `📌 ${capsule.name}\n🔗 ${capsule.url}${capsule.notes ? `\n📝 ${capsule.notes}` : ""}\n\nSaved from Human Web Browser`;
    try {
      await Share.share({ message: text, url: capsule.url });
    } catch {}
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Session Capsules</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{sessions.capsules.length} saved sessions</Text>
        </View>
        {sessions.capsules.length > 0 && (
          <Pressable
            hitSlop={8}
            onPress={() => Alert.alert("Clear All", "Delete all session capsules?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear All", style: "destructive", onPress: sessions.clearAll },
            ])}
          >
            <Feather name="trash-2" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {sessions.capsules.length > 4 && (
        <View style={[styles.searchBar, { backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search capsules..."
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
          />
          {!!search && (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      )}

      {sessions.capsules.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="layers" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Capsules Yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Long-press any page in the browser to save it as a session capsule
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 10 }} showsVerticalScrollIndicator={false}>
          {filtered.map((capsule) => (
            <Pressable
              key={capsule.id}
              style={[styles.capsuleCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: capsule.color ?? colors.primary }]}
              onPress={() => handleOpen(capsule)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setEditingId(editingId === capsule.id ? null : capsule.id);
                setEditNote(capsule.notes ?? "");
              }}
            >
              <View style={styles.capsuleTop}>
                <View style={[styles.domainBadge, { backgroundColor: (capsule.color ?? colors.primary) + "20" }]}>
                  <Text style={[styles.domainText, { color: capsule.color ?? colors.primary }]}>{capsule.domain}</Text>
                </View>
                <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatDate(capsule.savedAt)}</Text>
                <View style={styles.capsuleActions}>
                  <Pressable hitSlop={8} onPress={() => handleShare(capsule)}>
                    <Feather name="share" size={14} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => {
                    Clipboard.setStringAsync(capsule.url);
                  }}>
                    <Feather name="copy" size={14} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable hitSlop={8} onPress={() => Alert.alert("Delete", `Delete "${capsule.name}"?`, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete", style: "destructive", onPress: () => sessions.deleteCapsule(capsule.id) },
                  ])}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
              <Text style={[styles.capsuleName, { color: colors.foreground }]} numberOfLines={1}>{capsule.name}</Text>
              <Text style={[styles.capsuleUrl, { color: colors.mutedForeground }]} numberOfLines={1}>{capsule.url}</Text>
              {!!capsule.notes && (
                <Text style={[styles.capsuleNote, { color: colors.mutedForeground, borderTopColor: colors.border }]}>
                  📝 {capsule.notes}
                </Text>
              )}
              {editingId === capsule.id && (
                <View style={[styles.editBox, { borderTopColor: colors.border }]}>
                  <TextInput
                    style={[styles.editInput, { backgroundColor: colors.input, color: colors.foreground }]}
                    value={editNote}
                    onChangeText={setEditNote}
                    placeholder="Add a note..."
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    autoFocus
                  />
                  <Pressable
                    style={[styles.editSave, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      sessions.updateCapsule(capsule.id, { notes: editNote });
                      setEditingId(null);
                    }}
                  >
                    <Text style={styles.editSaveText}>Save Note</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          ))}
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
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  capsuleCard: {
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 3,
    padding: 14, gap: 5,
  },
  capsuleTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  domainBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  domainText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  timeText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  capsuleActions: { flexDirection: "row", gap: 10 },
  capsuleName: { fontSize: 15, fontFamily: "Inter_700Bold" },
  capsuleUrl: { fontSize: 12, fontFamily: "Inter_400Regular" },
  capsuleNote: { fontSize: 12, fontFamily: "Inter_400Regular", paddingTop: 8, marginTop: 4, borderTopWidth: StyleSheet.hairlineWidth },
  editBox: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, marginTop: 6, gap: 8 },
  editInput: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 60,
  },
  editSave: { paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  editSaveText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
