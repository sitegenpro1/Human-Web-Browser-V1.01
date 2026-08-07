import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTabs } from "@/context/TabsContext";
import { useColors } from "@/hooks/useColors";

function getDisplayUrl(url: string): string {
  if (!url) return "New Tab";
  try {
    const u = new URL(url);
    let host = u.hostname;
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return url.slice(0, 40);
  }
}

export default function TabsOverview() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { tabs, activeTabId, createTab, closeTab, switchTab, closeAllTabs } = useTabs();

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  function handleSelect(tabId: string) {
    switchTab(tabId);
    router.back();
  }

  function handleNew() {
    createTab();
    router.back();
  }

  function handleClose(tabId: string) {
    closeTab(tabId);
    if (tabs.length === 1) router.back();
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {tabs.length} {tabs.length === 1 ? "Tab" : "Tabs"}
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={closeAllTabs}
          >
            <Text style={[styles.headerBtnText, { color: colors.warn }]}>Close All</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.headerBtnText, { color: colors.primary }]}>Done</Text>
          </Pressable>
        </View>
      </View>

      {/* Tab grid */}
      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <Pressable
              key={tab.id}
              style={[
                styles.tabCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                },
              ]}
              onPress={() => handleSelect(tab.id)}
            >
              {/* Tab header */}
              <View style={[styles.tabCardHead, { backgroundColor: colors.toolbar }]}>
                <View style={styles.tabCardDots}>
                  <View style={[styles.dot, { backgroundColor: "#f28b82" }]} />
                  <View style={[styles.dot, { backgroundColor: "#fdd663" }]} />
                  <View style={[styles.dot, { backgroundColor: "#81c995" }]} />
                </View>
                <Text
                  style={[styles.tabCardUrl, { color: colors.mutedForeground }]}
                  numberOfLines={1}
                >
                  {getDisplayUrl(tab.url)}
                </Text>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleClose(tab.id);
                  }}
                  hitSlop={8}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <Feather name="x" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>

              {/* Tab body */}
              <View style={styles.tabCardBody}>
                {tab.url ? (
                  <>
                    <View style={[styles.tabFaviconWrap, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name="globe" size={14} color={colors.primary} />
                    </View>
                    <Text
                      style={[styles.tabCardTitle, { color: colors.foreground }]}
                      numberOfLines={2}
                    >
                      {tab.title || getDisplayUrl(tab.url)}
                    </Text>
                  </>
                ) : (
                  <View style={styles.blankTab}>
                    <Feather name="plus" size={24} color={colors.mutedForeground} />
                    <Text style={[styles.blankTabText, { color: colors.mutedForeground }]}>
                      New Tab
                    </Text>
                  </View>
                )}
                {tab.isPrivate && (
                  <View style={[styles.privateChip, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name="eye-off" size={9} color={colors.primary} />
                    <Text style={[styles.privateChipText, { color: colors.primary }]}>Private</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* New tab button */}
      <View style={[styles.footer, { backgroundColor: colors.toolbar, borderTopColor: colors.border, paddingBottom: insets.bottom + 4 }]}>
        <Pressable
          style={({ pressed }) => [styles.newTabBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          onPress={handleNew}
        >
          <Feather name="plus" size={16} color={colors.primaryForeground} />
          <Text style={[styles.newTabBtnText, { color: colors.primaryForeground }]}>New Tab</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.newPrivateBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          onPress={() => { createTab("", true); router.back(); }}
        >
          <Feather name="eye-off" size={14} color={colors.mutedForeground} />
          <Text style={[styles.newPrivateBtnText, { color: colors.mutedForeground }]}>Private</Text>
        </Pressable>
      </View>
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
  headerActions: { flexDirection: "row", gap: 4 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  tabCard: {
    width: "47%",
    borderRadius: 12,
    overflow: "hidden",
  },
  tabCardHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  tabCardDots: { flexDirection: "row", gap: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tabCardUrl: { flex: 1, fontSize: 9, fontFamily: "Inter_400Regular" },
  tabCardBody: {
    padding: 10,
    gap: 6,
    minHeight: 80,
  },
  tabFaviconWrap: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCardTitle: { fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  blankTab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 8 },
  blankTabText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  privateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  privateChipText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  newTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 10,
  },
  newTabBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  newPrivateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
  },
  newPrivateBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
