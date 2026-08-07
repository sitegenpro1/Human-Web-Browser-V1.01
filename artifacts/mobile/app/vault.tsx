import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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

import { useVault, type VaultEntry } from "@/context/VaultContext";
import { useColors } from "@/hooks/useColors";

type ColorsType = ReturnType<typeof import("@/hooks/useColors").useColors>;

function normalizeSite(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  try {
    const u = t.startsWith("http") ? new URL(t) : new URL("https://" + t);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return t;
  }
}

export default function VaultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, loading, addEntry, updateEntry, deleteEntry } = useVault();

  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const filtered = query.trim()
    ? entries.filter(
        (e) =>
          e.site.toLowerCase().includes(query.toLowerCase()) ||
          e.username.toLowerCase().includes(query.toLowerCase())
      )
    : entries;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function copy(text: string, label: string) {
    Clipboard.setStringAsync(text).catch(() => {});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast(`${label} copied`);
  }

  function confirmDelete(entry: VaultEntry) {
    Alert.alert("Delete Entry", `Remove saved credentials for ${entry.site}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteEntry(entry.id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <Stack.Screen options={{ title: "Password Vault", headerBackTitle: "More" }} />
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        {/* Header info bar */}
        <View style={[styles.infoBar, { backgroundColor: "#7B5CFF15", borderBottomColor: colors.border }]}>
          <Feather name="lock" size={13} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Stored securely on-device · Never synced or uploaded
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={14} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by site or username…"
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Entry list */}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading vault…</Text>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
                <Feather name="key" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {query ? "No matches" : "Vault is empty"}
              </Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                {query ? "Try a different search" : "Tap + to save your first password"}
              </Text>
            </View>
          ) : (
            <View style={[styles.entryGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {filtered.map((entry, i) => (
                <React.Fragment key={entry.id}>
                  <EntryRow
                    entry={entry}
                    revealed={!!revealed[entry.id]}
                    colors={colors}
                    onReveal={() => setRevealed((r) => ({ ...r, [entry.id]: !r[entry.id] }))}
                    onCopyUser={() => copy(entry.username, "Username")}
                    onCopyPass={() => copy(entry.password, "Password")}
                    onEdit={() => { setEditing(entry); setShowForm(true); }}
                    onDelete={() => confirmDelete(entry)}
                  />
                  {i < filtered.length - 1 && (
                    <View style={[styles.sep, { backgroundColor: colors.border }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
        </ScrollView>

        {/* FAB */}
        <Pressable
          style={[styles.fab, { backgroundColor: colors.primary, bottom: bottomPad + 24 }]}
          onPress={() => { setEditing(null); setShowForm(true); }}
        >
          <Feather name="plus" size={22} color="#fff" />
        </Pressable>

        {/* Toast */}
        {toast && (
          <View style={[styles.toast, { backgroundColor: colors.primary }]}>
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}

        {/* Add/Edit form modal */}
        <EntryFormModal
          visible={showForm}
          entry={editing}
          colors={colors}
          insets={insets}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={async (data) => {
            if (editing) {
              await updateEntry(editing.id, data);
            } else {
              await addEntry(data);
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowForm(false);
            setEditing(null);
          }}
        />
      </View>
    </>
  );
}

function EntryRow({
  entry,
  revealed,
  colors,
  onReveal,
  onCopyUser,
  onCopyPass,
  onEdit,
  onDelete,
}: {
  entry: VaultEntry;
  revealed: boolean;
  colors: ColorsType;
  onReveal: () => void;
  onCopyUser: () => void;
  onCopyPass: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const maskedPass = "•".repeat(Math.min(entry.password.length, 12));

  return (
    <View style={styles.entryRow}>
      <View style={[styles.entryIcon, { backgroundColor: colors.primary + "20" }]}>
        <Text style={[styles.entryIconLetter, { color: colors.primary }]}>
          {entry.site.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.entryInfo}>
        <Text style={[styles.entrySite, { color: colors.foreground }]} numberOfLines={1}>{entry.site}</Text>
        <Text style={[styles.entryUser, { color: colors.mutedForeground }]} numberOfLines={1}>{entry.username}</Text>
        <Text style={[styles.entryPass, { color: colors.mutedForeground }]} numberOfLines={1}>
          {revealed ? entry.password : maskedPass}
        </Text>
      </View>
      <View style={styles.entryActions}>
        <Pressable style={styles.iconBtn} onPress={onReveal} hitSlop={6}>
          <Feather name={revealed ? "eye-off" : "eye"} size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onCopyUser} hitSlop={6}>
          <Feather name="user" size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onCopyPass} hitSlop={6}>
          <Feather name="copy" size={14} color={colors.mutedForeground} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onEdit} hitSlop={6}>
          <Feather name="edit-2" size={14} color={colors.primary} />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onDelete} hitSlop={6}>
          <Feather name="trash-2" size={14} color="#FF4444" />
        </Pressable>
      </View>
    </View>
  );
}

function EntryFormModal({
  visible,
  entry,
  colors,
  insets,
  onClose,
  onSave,
}: {
  visible: boolean;
  entry: VaultEntry | null;
  colors: ColorsType;
  insets: { bottom: number; top: number };
  onClose: () => void;
  onSave: (data: { site: string; username: string; password: string }) => Promise<void>;
}) {
  const [site, setSite] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSite(entry?.site ?? "");
      setUsername(entry?.username ?? "");
      setPassword(entry?.password ?? "");
      setShowPass(false);
    }
  }, [visible, entry]);

  async function handleSave() {
    const s = normalizeSite(site);
    const u = username.trim();
    const p = password;
    if (!s || !u || !p) return;
    setSaving(true);
    await onSave({ site: s, username: u, password: p });
    setSaving(false);
  }

  const canSave = site.trim() && username.trim() && password.length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.formOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.formBackdrop} onPress={onClose} />
        <View style={[styles.formSheet, { backgroundColor: colors.toolbar, borderColor: colors.border, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.formHandle} />
          <Text style={[styles.formTitle, { color: colors.foreground }]}>
            {entry ? "Edit Entry" : "New Password"}
          </Text>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Website</Text>
          <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              placeholder="e.g. github.com"
              placeholderTextColor={colors.mutedForeground}
              value={site}
              onChangeText={setSite}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Username / Email</Text>
          <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              placeholder="your@email.com"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Password</Text>
          <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, flex: 1 }]}
              placeholder="Enter password"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowPass((v) => !v)} hitSlop={8}>
              <Feather name={showPass ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.saveBtn, { backgroundColor: canSave ? colors.primary : colors.border, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save Password"}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  infoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderBottomWidth: 1,
  },
  infoText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 14,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  listContent: { paddingHorizontal: 14, gap: 12 },
  emptyText: { textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" },
  emptyWrap: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  entryGroup: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sep: { height: 1, marginLeft: 68 },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  entryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  entryIconLetter: { fontSize: 18, fontFamily: "Inter_700Bold" },
  entryInfo: { flex: 1, gap: 2 },
  entrySite: { fontSize: 14, fontFamily: "Inter_700Bold" },
  entryUser: { fontSize: 12, fontFamily: "Inter_400Regular" },
  entryPass: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  entryActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 5 },
  fab: {
    position: "absolute",
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  formOverlay: { flex: 1, justifyContent: "flex-end" },
  formBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  formSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
    gap: 8,
  },
  formHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#555",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  formTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  fieldLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1, textTransform: "uppercase", marginTop: 4 },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  fieldInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
});
