import { Feather } from "@expo/vector-icons";
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

import { BUILT_IN_PROFILES, UA_PRESETS, type BurnerProfile, useProfiles } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

export default function ProfilesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profiles = useProfiles();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [selectedUA, setSelectedUA] = useState(0);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const COLORS = ["#7B5CFF", "#FF4545", "#00D4A0", "#FFB020", "#4FC3F7", "#F06292"];
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  function handleCreate() {
    const n = name.trim() || `Burner ${Date.now().toString(36).slice(-4)}`;
    profiles.createProfile(n, UA_PRESETS[selectedUA].ua, selectedColor, expiresIn ?? undefined);
    setName("");
    setShowCreate(false);
  }

  const allProfiles = profiles.profiles;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Burner Profiles</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>One-click identity sessions</Text>
        </View>
        {!!profiles.activeProfileId && (
          <Pressable
            style={[styles.clearBtn, { backgroundColor: colors.destructive + "20" }]}
            onPress={() => {
              Alert.alert("End Session", "Stop using this profile and return to default?", [
                { text: "Cancel", style: "cancel" },
                { text: "End Session", style: "destructive", onPress: () => profiles.activateProfile(null) },
              ]);
            }}
          >
            <Text style={[styles.clearBtnText, { color: colors.destructive }]}>End Session</Text>
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Active profile banner */}
        {profiles.activeProfile && (
          <View style={[styles.activeBanner, { backgroundColor: profiles.activeProfile.color + "15", borderColor: profiles.activeProfile.color + "40" }]}>
            <View style={[styles.profileDot, { backgroundColor: profiles.activeProfile.color }]} />
            <View style={styles.bannerText}>
              <Text style={[styles.bannerLabel, { color: profiles.activeProfile.color }]}>
                Active: {profiles.activeProfile.name}
              </Text>
              <Text style={[styles.bannerDesc, { color: colors.mutedForeground }]}>
                {UA_PRESETS.find((u) => u.ua === profiles.activeProfile?.userAgent)?.label ?? "Custom UA"}
              </Text>
            </View>
            <Feather name="check-circle" size={18} color={profiles.activeProfile.color} />
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Built-in</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Default profile */}
          <ProfileRow
            profile={{ id: "", name: "Default", color: colors.mutedForeground, userAgent: UA_PRESETS[0].ua, createdAt: "", isBuiltIn: true }}
            isActive={!profiles.activeProfileId}
            colors={colors}
            onActivate={() => profiles.activateProfile(null)}
            onDelete={null}
          />
          <View style={[styles.sep, { backgroundColor: colors.border }]} />
          {BUILT_IN_PROFILES.map((p, i) => (
            <React.Fragment key={p.id}>
              <ProfileRow
                profile={p}
                isActive={profiles.activeProfileId === p.id}
                colors={colors}
                onActivate={() => profiles.activateProfile(p.id)}
                onDelete={null}
              />
              {i < BUILT_IN_PROFILES.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* User profiles */}
        {allProfiles.filter((p) => !p.isBuiltIn).length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>My Profiles</Text>
            <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {allProfiles.filter((p) => !p.isBuiltIn).map((p, i, arr) => (
                <React.Fragment key={p.id}>
                  <ProfileRow
                    profile={p}
                    isActive={profiles.activeProfileId === p.id}
                    colors={colors}
                    onActivate={() => profiles.activateProfile(p.id)}
                    onDelete={() => Alert.alert("Delete Profile", `Delete "${p.name}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => profiles.deleteProfile(p.id) },
                    ])}
                  />
                  {i < arr.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* Create new */}
        <Pressable
          style={[styles.createBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreate((v) => !v)}
        >
          <Feather name={showCreate ? "minus" : "plus"} size={16} color="#fff" />
          <Text style={styles.createBtnText}>{showCreate ? "Cancel" : "Create Burner Profile"}</Text>
        </Pressable>

        {showCreate && (
          <View style={[styles.createForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Profile Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Shopping Mode, Work Research..."
              placeholderTextColor={colors.mutedForeground}
              autoCorrect={false}
            />

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Browser Identity</Text>
            <View style={styles.uaList}>
              {UA_PRESETS.map((ua, i) => (
                <Pressable
                  key={i}
                  style={[styles.uaChip, { backgroundColor: selectedUA === i ? colors.primary : colors.muted, borderColor: selectedUA === i ? colors.primary : colors.border }]}
                  onPress={() => setSelectedUA(i)}
                >
                  <Feather name={ua.icon as any} size={12} color={selectedUA === i ? "#fff" : colors.mutedForeground} />
                  <Text style={[styles.uaChipText, { color: selectedUA === i ? "#fff" : colors.mutedForeground }]}>{ua.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c, borderWidth: selectedColor === c ? 3 : 0, borderColor: "#fff" }]}
                  onPress={() => setSelectedColor(c)}
                />
              ))}
            </View>

            <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Auto-expire</Text>
            <View style={styles.expiryRow}>
              {[null, 30, 60, 120, 480].map((min) => (
                <Pressable
                  key={String(min)}
                  style={[styles.expiryChip, { backgroundColor: expiresIn === min ? colors.primary : colors.muted }]}
                  onPress={() => setExpiresIn(min)}
                >
                  <Text style={[styles.expiryText, { color: expiresIn === min ? "#fff" : colors.mutedForeground }]}>
                    {min === null ? "Never" : min < 60 ? `${min}m` : `${min / 60}h`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleCreate}>
              <Text style={styles.saveBtnText}>Create Profile</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            Profiles change how websites see your browser. They don't isolate cookies or storage — use Private Mode for full session isolation.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileRow({
  profile, isActive, colors, onActivate, onDelete,
}: {
  profile: BurnerProfile;
  isActive: boolean;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onActivate: () => void;
  onDelete: (() => void) | null;
}) {
  const uaLabel = UA_PRESETS.find((u) => u.ua === profile.userAgent)?.label ?? "Custom";
  return (
    <Pressable
      style={({ pressed }) => [styles.profileRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={onActivate}
    >
      <View style={[styles.profileDotLg, { backgroundColor: profile.color }]}>
        {isActive && <Feather name="check" size={12} color="#fff" />}
      </View>
      <View style={styles.profileText}>
        <Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text>
        <Text style={[styles.profileUA, { color: colors.mutedForeground }]}>{uaLabel}</Text>
        {!!profile.note && <Text style={[styles.profileNote, { color: colors.mutedForeground }]}>{profile.note}</Text>}
      </View>
      {isActive && (
        <View style={[styles.activePill, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.activePillText, { color: colors.primary }]}>Active</Text>
        </View>
      )}
      {onDelete && !isActive && (
        <Pressable hitSlop={8} onPress={onDelete}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  headerTitle: { flex: 1, gap: 1 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  clearBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  profileDot: { width: 10, height: 10, borderRadius: 5 },
  profileDotLg: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  bannerText: { flex: 1, gap: 2 },
  bannerLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bannerDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase",
    letterSpacing: 1.2, marginLeft: 20, marginBottom: 6, marginTop: 12,
  },
  group: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 8 },
  profileRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  profileText: { flex: 1, gap: 2 },
  profileName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  profileUA: { fontSize: 12, fontFamily: "Inter_400Regular" },
  profileNote: { fontSize: 11, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  activePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activePillText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginHorizontal: 16, marginTop: 8, marginBottom: 10,
    paddingVertical: 12, borderRadius: 14,
  },
  createBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  createForm: { marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 14, borderWidth: 1, gap: 8 },
  formLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  uaList: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  uaChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  uaChipText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  colorRow: { flexDirection: "row", gap: 10 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  expiryRow: { flexDirection: "row", gap: 8 },
  expiryChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  expiryText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  infoCard: { flexDirection: "row", gap: 10, margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
