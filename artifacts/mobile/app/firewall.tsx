import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  FIREWALL_CATEGORY_META,
  type FirewallCategory,
  type FirewallRuleAction,
  useFirewall,
} from "@/context/FirewallContext";
import { useColors } from "@/hooks/useColors";

export default function FirewallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const firewall = useFirewall();
  const [newPattern, setNewPattern] = useState("");
  const [newAction, setNewAction] = useState<FirewallRuleAction>("block");
  const [newNote, setNewNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<"categories" | "rules">("categories");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleAddRule() {
    const p = newPattern.trim();
    if (!p) return;
    firewall.addRule(p, newAction, newNote.trim() || undefined);
    setNewPattern("");
    setNewNote("");
    setShowAdd(false);
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>NexusShield</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Content Firewall</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.countPill, { backgroundColor: firewall.enabled ? colors.primary + "22" : colors.muted }]}>
            <Text style={[styles.countText, { color: firewall.enabled ? colors.primary : colors.mutedForeground }]}>
              {firewall.blockedCount} blocked
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Master toggle */}
        <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: firewall.enabled ? colors.primary : colors.border }]}>
          <View style={styles.toggleLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + "1a" }]}>
              <Feather name="shield" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
                {firewall.enabled ? "NexusShield Active" : "NexusShield Off"}
              </Text>
              <Text style={[styles.toggleDesc, { color: colors.mutedForeground }]}>
                {firewall.enabled ? "Blocking ads, trackers & threats" : "All content is allowed through"}
              </Text>
            </View>
          </View>
          <Switch
            value={firewall.enabled}
            onValueChange={firewall.toggleEnabled}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <StatCell label="Blocked" value={firewall.blockedCount.toString()} color={colors.destructive} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell label="Custom Rules" value={firewall.rules.length.toString()} color={colors.primary} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatCell
            label="Active Filters"
            value={Object.values(firewall.categories).filter(Boolean).length.toString()}
            color={colors.clean}
          />
          <Pressable
            style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => {
              firewall.resetBlockedCount();
            }}
          >
            <Feather name="rotate-ccw" size={12} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
          <Pressable
            style={[styles.tabBtn, tab === "categories" && { backgroundColor: colors.card }]}
            onPress={() => setTab("categories")}
          >
            <Text style={[styles.tabText, { color: tab === "categories" ? colors.foreground : colors.mutedForeground }]}>
              Filters
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === "rules" && { backgroundColor: colors.card }]}
            onPress={() => setTab("rules")}
          >
            <Text style={[styles.tabText, { color: tab === "rules" ? colors.foreground : colors.mutedForeground }]}>
              Custom Rules
            </Text>
          </Pressable>
        </View>

        {tab === "categories" && (
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(Object.keys(FIREWALL_CATEGORY_META) as FirewallCategory[]).map((cat, i, arr) => {
              const meta = FIREWALL_CATEGORY_META[cat];
              return (
                <React.Fragment key={cat}>
                  <View style={styles.catRow}>
                    <View style={[styles.catIcon, { backgroundColor: meta.color + "20" }]}>
                      <Feather name={meta.icon as any} size={16} color={meta.color} />
                    </View>
                    <View style={styles.catText}>
                      <Text style={[styles.catLabel, { color: colors.foreground }]}>{meta.label}</Text>
                      <Text style={[styles.catDesc, { color: colors.mutedForeground }]}>{meta.desc}</Text>
                    </View>
                    <Switch
                      value={firewall.categories[cat]}
                      onValueChange={() => firewall.toggleCategory(cat)}
                      trackColor={{ false: colors.border, true: meta.color }}
                      thumbColor="#fff"
                    />
                  </View>
                  {i < arr.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              );
            })}
          </View>
        )}

        {tab === "rules" && (
          <>
            <Pressable
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAdd((v) => !v)}
            >
              <Feather name={showAdd ? "minus" : "plus"} size={16} color="#fff" />
              <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "Add Rule"}</Text>
            </Pressable>

            {showAdd && (
              <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Domain or pattern</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={newPattern}
                  onChangeText={setNewPattern}
                  placeholder="e.g. ads.example.com"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, color: colors.foreground, borderColor: colors.border }]}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder="Why this rule?"
                  placeholderTextColor={colors.mutedForeground}
                />
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: newAction === "block" ? "#FF4545" : colors.muted }]}
                    onPress={() => setNewAction("block")}
                  >
                    <Feather name="x-circle" size={13} color={newAction === "block" ? "#fff" : colors.mutedForeground} />
                    <Text style={[styles.actionBtnText, { color: newAction === "block" ? "#fff" : colors.mutedForeground }]}>Block</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: newAction === "allow" ? colors.clean : colors.muted }]}
                    onPress={() => setNewAction("allow")}
                  >
                    <Feather name="check-circle" size={13} color={newAction === "allow" ? "#fff" : colors.mutedForeground} />
                    <Text style={[styles.actionBtnText, { color: newAction === "allow" ? "#fff" : colors.mutedForeground }]}>Allow</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                    onPress={handleAddRule}
                  >
                    <Text style={styles.saveBtnText}>Save Rule</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {firewall.rules.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="filter" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No custom rules yet</Text>
                <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                  Add rules to block or allow specific domains
                </Text>
              </View>
            ) : (
              <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {firewall.rules.map((rule, i) => (
                  <React.Fragment key={rule.id}>
                    <View style={styles.ruleRow}>
                      <View style={[styles.ruleBadge, { backgroundColor: rule.action === "block" ? "#FF454520" : colors.clean + "20" }]}>
                        <Text style={[styles.ruleBadgeText, { color: rule.action === "block" ? "#FF4545" : colors.clean }]}>
                          {rule.action.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.ruleText}>
                        <Text style={[styles.rulePattern, { color: colors.foreground }]} numberOfLines={1}>{rule.pattern}</Text>
                        {!!rule.note && <Text style={[styles.ruleNote, { color: colors.mutedForeground }]}>{rule.note}</Text>}
                      </View>
                      <Pressable
                        hitSlop={8}
                        onPress={() => Alert.alert("Delete Rule", `Remove rule for "${rule.pattern}"?`, [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => firewall.removeRule(rule.id) },
                        ])}
                      >
                        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
                      </Pressable>
                    </View>
                    {i < firewall.rules.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            NexusShield works at the network request level inside the browser. Custom allow rules override category filters.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
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
  headerRight: {},
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 12,
  },
  toggleLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toggleLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  toggleDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 14,
  },
  statCell: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.4 },
  statDivider: { width: 1, height: 32 },
  resetBtn: { paddingRight: 14, paddingLeft: 2 },
  tabs: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 3,
  },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  group: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  catRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  catIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  catText: { flex: 1, gap: 2 },
  catLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  catDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addForm: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  formLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  saveBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  ruleRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  ruleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  ruleBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  ruleText: { flex: 1, gap: 2 },
  rulePattern: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  ruleNote: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", padding: 40, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  infoCard: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
