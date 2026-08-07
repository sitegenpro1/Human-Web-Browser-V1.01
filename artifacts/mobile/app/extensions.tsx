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
  BUILT_IN_META,
  type BuiltInExtId,
  type CustomScript,
  useExtensions,
} from "@/context/ExtensionsContext";
import { useColors } from "@/hooks/useColors";

export default function ExtensionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const ext = useExtensions();
  const [tab, setTab] = useState<"extensions" | "scripts">("extensions");
  const [showAdd, setShowAdd] = useState(false);
  const [scriptName, setScriptName] = useState("");
  const [scriptDomain, setScriptDomain] = useState("*");
  const [scriptCSS, setScriptCSS] = useState("");
  const [scriptJS, setScriptJS] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleAddScript() {
    if (!scriptName.trim()) return;
    ext.addScript(scriptName.trim(), scriptDomain.trim() || "*", scriptCSS, scriptJS);
    setScriptName("");
    setScriptDomain("*");
    setScriptCSS("");
    setScriptJS("");
    setShowAdd(false);
  }

  const enabledCount = Object.values(ext.builtIns).filter(Boolean).length +
    ext.customScripts.filter((s) => s.enabled).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Extensions</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{enabledCount} active</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsBar, { backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tabBtn, tab === "extensions" && [styles.tabBtnActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setTab("extensions")}
        >
          <Text style={[styles.tabText, { color: tab === "extensions" ? colors.primary : colors.mutedForeground }]}>
            Built-in
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, tab === "scripts" && [styles.tabBtnActive, { borderBottomColor: colors.primary }]]}
          onPress={() => setTab("scripts")}
        >
          <Text style={[styles.tabText, { color: tab === "scripts" ? colors.primary : colors.mutedForeground }]}>
            Custom Scripts
          </Text>
        </Pressable>
      </View>

      {tab === "extensions" && (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 10 }} showsVerticalScrollIndicator={false}>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            These run on every page you visit. Changes take effect on the next page load.
          </Text>
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(Object.keys(BUILT_IN_META) as BuiltInExtId[]).map((id, i, arr) => {
              const meta = BUILT_IN_META[id];
              return (
                <React.Fragment key={id}>
                  <View style={styles.extRow}>
                    <View style={[styles.extIcon, { backgroundColor: meta.color + "20" }]}>
                      <Feather name={meta.icon as any} size={17} color={meta.color} />
                    </View>
                    <View style={styles.extText}>
                      <Text style={[styles.extName, { color: colors.foreground }]}>{meta.name}</Text>
                      <Text style={[styles.extDesc, { color: colors.mutedForeground }]}>{meta.desc}</Text>
                    </View>
                    <Switch
                      value={ext.builtIns[id]}
                      onValueChange={() => ext.toggleBuiltIn(id)}
                      trackColor={{ false: colors.border, true: meta.color }}
                      thumbColor="#fff"
                    />
                  </View>
                  {i < arr.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>
      )}

      {tab === "scripts" && (
        <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 80, gap: 10 }} showsVerticalScrollIndicator={false}>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAdd((v) => !v)}
          >
            <Feather name={showAdd ? "minus" : "plus"} size={16} color="#fff" />
            <Text style={styles.addBtnText}>{showAdd ? "Cancel" : "New Script"}</Text>
          </Pressable>

          {showAdd && (
            <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Script Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
                value={scriptName}
                onChangeText={setScriptName}
                placeholder="My Custom Script"
                placeholderTextColor={colors.mutedForeground}
              />
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Domain (or * for all)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, color: colors.foreground }]}
                value={scriptDomain}
                onChangeText={setScriptDomain}
                placeholder="example.com or *"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>CSS (optional)</Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.input, color: colors.foreground }]}
                value={scriptCSS}
                onChangeText={setScriptCSS}
                placeholder={"/* e.g.\n.ads { display: none; }\n*/"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>JavaScript (optional)</Text>
              <TextInput
                style={[styles.codeInput, { backgroundColor: colors.input, color: colors.foreground }]}
                value={scriptJS}
                onChangeText={setScriptJS}
                placeholder={"// e.g.\nconsole.log('Hello from HWB!');"}
                placeholderTextColor={colors.mutedForeground}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: !scriptName.trim() ? colors.muted : colors.primary }]}
                onPress={handleAddScript}
                disabled={!scriptName.trim()}
              >
                <Text style={[styles.saveBtnText, { color: !scriptName.trim() ? colors.mutedForeground : "#fff" }]}>
                  Save Script
                </Text>
              </Pressable>
            </View>
          )}

          {ext.customScripts.length === 0 ? (
            <View style={styles.empty}>
              <Feather name="code" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No Custom Scripts</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Write CSS or JavaScript that runs on specific domains or all pages
              </Text>
            </View>
          ) : (
            <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {ext.customScripts.map((script, i) => (
                <React.Fragment key={script.id}>
                  <ScriptRow
                    script={script}
                    colors={colors}
                    expanded={expandedId === script.id}
                    onToggle={() => ext.updateScript(script.id, { enabled: !script.enabled })}
                    onExpand={() => setExpandedId(expandedId === script.id ? null : script.id)}
                    onDelete={() => Alert.alert("Delete Script", `Delete "${script.name}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => ext.deleteScript(script.id) },
                    ])}
                  />
                  {i < ext.customScripts.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </View>
          )}

          <View style={[styles.codeHint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="code" size={14} color={colors.primary} />
            <Text style={[styles.codeHintText, { color: colors.mutedForeground }]}>
              Scripts run after page load. CSS is injected via a{" "}<Text style={{ color: colors.primary }}>&lt;style&gt;</Text> tag. JS runs in a try/catch for safety.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ScriptRow({
  script, colors, expanded, onToggle, onExpand, onDelete,
}: {
  script: CustomScript;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onDelete: () => void;
}) {
  return (
    <View>
      <Pressable style={styles.scriptRow} onPress={onExpand}>
        <View style={styles.scriptLeft}>
          <Feather name="code" size={14} color={script.enabled ? colors.primary : colors.mutedForeground} />
          <View style={styles.scriptText}>
            <Text style={[styles.scriptName, { color: colors.foreground }]}>{script.name}</Text>
            <Text style={[styles.scriptDomain, { color: colors.mutedForeground }]}>
              {script.domain === "*" ? "All sites" : script.domain}
              {!!script.css && " · CSS"}
              {!!script.js && " · JS"}
            </Text>
          </View>
        </View>
        <View style={styles.scriptRight}>
          <Pressable hitSlop={8} onPress={onDelete}>
            <Feather name="trash-2" size={13} color={colors.mutedForeground} />
          </Pressable>
          <Switch
            value={script.enabled}
            onValueChange={onToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Pressable>
      {expanded && (
        <View style={[styles.scriptExpanded, { backgroundColor: colors.input, borderTopColor: colors.border }]}>
          {!!script.css && (
            <Text style={[styles.previewText, { color: colors.primary }]}>
              CSS: {script.css.slice(0, 200)}{script.css.length > 200 ? "…" : ""}
            </Text>
          )}
          {!!script.js && (
            <Text style={[styles.previewText, { color: colors.clean }]}>
              JS: {script.js.slice(0, 200)}{script.js.length > 200 ? "…" : ""}
            </Text>
          )}
        </View>
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
  tabsBar: {
    flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: {},
  tabText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 4 },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  extRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  extIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  extText: { flex: 1, gap: 2 },
  extName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  extDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 66 },
  addBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 14,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addForm: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  formLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  codeInput: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, fontFamily: "Inter_400Regular", minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: { paddingVertical: 12, borderRadius: 12, alignItems: "center", marginTop: 4 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  empty: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  scriptRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 10 },
  scriptLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  scriptText: { flex: 1, gap: 2 },
  scriptName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scriptDomain: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scriptRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  scriptExpanded: { padding: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 4 },
  previewText: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  codeHint: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  codeHintText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
