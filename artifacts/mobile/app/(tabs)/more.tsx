import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useBookmarks } from "@/context/BookmarksContext";
import { useClipboard } from "@/context/ClipboardContext";
import { useDownloads } from "@/context/DownloadContext";
import { useExtensions } from "@/context/ExtensionsContext";
import { useFirewall } from "@/context/FirewallContext";
import { useHistory } from "@/context/HistoryContext";
import { useProfiles } from "@/context/ProfileContext";
import { useResearch } from "@/context/ResearchContext";
import { useSessions } from "@/context/SessionContext";
import { useColors } from "@/hooks/useColors";

const MENU: Array<{ label: string; desc: string; icon: any; href: string }> = [
  { label: "Safety & Privacy", desc: "App lock, popup blocker, permissions", icon: "shield", href: "/safety" },
  { label: "Settings", desc: "Engine, strict mode, theme", icon: "settings", href: "/settings" },
  { label: "Export / Import Data", desc: "Backup or restore all your data", icon: "download", href: "/data-export" },
  { label: "Demo", desc: "See the full product story", icon: "play-circle", href: "/demo" },
  { label: "Waitlist & Pricing", desc: "Join for early access", icon: "star", href: "/waitlist" },
  { label: "About & Manifesto", desc: "Why the human web matters", icon: "info", href: "/about" },
  { label: "Privacy Policy", desc: "How we handle your data", icon: "shield", href: "/privacy" },
];

const BROWSER_MENU: Array<{ label: string; desc: string; icon: any; href: string; color?: string }> = [
  { label: "History", desc: "Pages you've visited", icon: "clock", href: "/history" },
  { label: "Bookmarks", desc: "Saved pages", icon: "bookmark", href: "/bookmarks" },
  { label: "Research Tray", desc: "Saved sources & notes", icon: "folder", href: "/research" },
  { label: "Downloads", desc: "Files you've downloaded", icon: "download-cloud", href: "/downloads" },
  { label: "Password Vault", desc: "Saved credentials, stored on-device", icon: "key", href: "/vault" },
];

const POWER_MENU: Array<{ label: string; desc: string; icon: any; href: string }> = [
  { label: "NexusShield Firewall", desc: "Block ads, trackers & malicious content", icon: "shield", href: "/firewall" },
  { label: "Link Scanner", desc: "Analyze URLs for threats before visiting", icon: "search", href: "/scanner" },
  { label: "Burner Profiles", desc: "One-click temporary identity sessions", icon: "user-x", href: "/profiles" },
  { label: "Session Capsules", desc: "Save & restore complete browsing sessions", icon: "layers", href: "/sessions" },
  { label: "Extensions", desc: "Custom scripts, cookie erasers & more", icon: "code", href: "/extensions" },
  { label: "Smart Clipboard", desc: "Clipboard history with source tracking", icon: "clipboard", href: "/clipboard" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { totalWarnedDomains, reports, aiHiddenCount } = useApp();
  const { bookmarks } = useBookmarks();
  const { downloads } = useDownloads();
  const { history, isPrivateMode } = useHistory();
  const { sources } = useResearch();
  const firewall = useFirewall();
  const profiles = useProfiles();
  const sessions = useSessions();
  const clipboard = useClipboard();
  const ext = useExtensions();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const counts: Record<string, number> = {
    "/history": history.length,
    "/bookmarks": bookmarks.length,
    "/research": sources.length,
    "/downloads": downloads.length,
  };

  const powerCounts: Record<string, number | string> = {
    "/firewall": firewall.blockedCount,
    "/profiles": profiles.activeProfile ? 1 : 0,
    "/sessions": sessions.capsules.length,
    "/clipboard": clipboard.history.length,
    "/extensions": Object.values(ext.builtIns).filter(Boolean).length + ext.customScripts.filter((s) => s.enabled).length,
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>More</Text>

      {/* Dashboard stats */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statsRow}>
          <StatItem num={aiHiddenCount} label="AI hidden" color={colors.clean} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatItem num={totalWarnedDomains} label="warned sites" color={colors.warn} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <StatItem num={reports.length} label="reports sent" color={colors.primary} />
        </View>
        {isPrivateMode && (
          <View style={[styles.privateNote, { borderTopColor: colors.border }]}>
            <Feather name="eye-off" size={10} color={colors.primary} />
            <Text style={[styles.privateNoteText, { color: colors.primary }]}>Private mode is ON</Text>
          </View>
        )}
      </View>

      {/* Power Tools section */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Power Tools</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {POWER_MENU.map((item, i) => {
            const count = powerCounts[item.href];
            const isFirewall = item.href === "/firewall";
            const isProfile = item.href === "/profiles";
            const badgeColor = isFirewall && firewall.enabled ? colors.clean : colors.primary;
            const badgeText = isFirewall
              ? (firewall.enabled ? "ON" : "OFF")
              : isProfile && profiles.activeProfile
              ? profiles.activeProfile.name
              : typeof count === "number" && count > 0
              ? String(count)
              : null;
            return (
              <React.Fragment key={item.href}>
                <Pressable
                  style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => router.push(item.href as any)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: colors.primary + "1a" }]}>
                    <Feather name={item.icon} size={16} color={colors.primary} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                  </View>
                  {badgeText && (
                    <View style={[styles.countBadge, { backgroundColor: badgeColor + "20" }]}>
                      <Text style={[styles.countBadgeText, { color: badgeColor }]} numberOfLines={1}>
                        {badgeText}
                      </Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                </Pressable>
                {i < POWER_MENU.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      {/* Browser tools section */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Browser</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {BROWSER_MENU.map((item, i) => (
            <React.Fragment key={item.href}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => router.push(item.href as any)}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primary + "1a" }]}>
                  <Feather name={item.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                {counts[item.href] > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.countBadgeText, { color: colors.primary }]}>{counts[item.href]}</Text>
                  </View>
                )}
                <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
              </Pressable>
              {i < BROWSER_MENU.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* App section */}
      <View>
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>App</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {MENU.map((item, i) => (
            <React.Fragment key={item.href}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, { opacity: pressed ? 0.6 : 1 }]}
                onPress={() => router.push(item.href as any)}
              >
                <View style={[styles.menuIcon, { backgroundColor: colors.primary + "1a" }]}>
                  <Feather name={item.icon} size={16} color={colors.primary} />
                </View>
                <View style={styles.menuText}>
                  <Text style={[styles.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
                  <Text style={[styles.menuDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                </View>
                <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
              </Pressable>
              {i < MENU.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={[styles.versionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.versionName, { color: colors.foreground }]}>Human Web Browser</Text>
        <Text style={[styles.versionInfo, { color: colors.mutedForeground }]}>
          MVP v1.0 · Replit Buildathon 2026
        </Text>
        <Text style={[styles.versionTag, { color: colors.mutedForeground }]}>
          Local-first · No AI APIs · No scraping
        </Text>
      </View>
    </ScrollView>
  );
}

function StatItem({ num, label, color }: { num: number; label: string; color: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statNum, { color }]}>{num}</Text>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  statsRow: { flexDirection: "row", paddingVertical: 18 },
  statItem: { flex: 1, alignItems: "center", gap: 3 },
  statNum: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  statDivider: { width: 1, marginVertical: 6 },
  privateNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: 1,
  },
  privateNoteText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginLeft: 4,
    marginBottom: 6,
    marginTop: 2,
  },
  menuGroup: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, gap: 2 },
  menuLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  menuDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  countBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  sep: { height: 1, marginLeft: 68 },
  versionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 4,
    alignItems: "center",
  },
  versionName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  versionInfo: { fontSize: 12, fontFamily: "Inter_400Regular" },
  versionTag: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
