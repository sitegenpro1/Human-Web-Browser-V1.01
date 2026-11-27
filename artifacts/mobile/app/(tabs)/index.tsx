import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  BackHandler,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextInputInstance } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrowserView, type BrowserViewHandle } from "@/components/BrowserView";
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
import { useSafety } from "@/context/SafetyContext";
import { useTabs } from "@/context/TabsContext";
import { type SearchEngine, buildSearchUrl } from "@/lib/buildSearchUrl";
import { isLikelyUrl, normalizeDomain } from "@/lib/normalizeDomain";
import { useColors } from "@/hooks/useColors";

// ─── Search engine definitions ───────────────────────────────────────────────

const ENGINES: { value: SearchEngine; label: string }[] = [
  { value: "google_web", label: "Google Web Mode" },
  { value: "duckduckgo", label: "DuckDuckGo No-AI" },
  { value: "brave", label: "Brave Search" },
];

// ─── Search chips ─────────────────────────────────────────────────────────────

const SEARCH_CHIPS = [
  { id: "official", label: "Official", suffix: "site:gov OR site:edu" },
  { id: "forums", label: "Forums", suffix: "site:reddit.com OR \"forum\"" },
  { id: "reddit", label: "Reddit", suffix: "site:reddit.com" },
  { id: "docs", label: "Docs", suffix: "docs OR documentation" },
  { id: "academic", label: "Academic", suffix: "site:arxiv.org OR site:semanticscholar.org" },
  { id: "news", label: "News", suffix: "news" },
  { id: "pre_ai", label: "Pre-AI", suffix: "before:2022" },
];

// ─── Reader mode scripts ──────────────────────────────────────────────────────

const READER_ENTER_SCRIPT = `(function(){try{if(document.getElementById('hwb-reader-style')){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'reader',on:true}));return;}var s=document.createElement('style');s.id='hwb-reader-style';s.textContent='body{max-width:700px!important;margin:0 auto!important;padding:20px 24px!important;font-family:Georgia,serif!important;font-size:18px!important;line-height:1.75!important;background:#1a1a1c!important;color:#e8eaed!important;}h1,h2,h3,h4{font-family:system-ui,-apple-system,sans-serif!important;color:#e8eaed!important;}a{color:#8ab4f8!important;}img{max-width:100%!important;height:auto!important;display:block!important;margin:16px auto!important;}header,footer,nav,aside,[class*=\\'sidebar\\'],[class*=\\'banner\\'],[class*=\\'popup\\'],[id*=\\'popup\\'],[class*=\\'newsletter\\'],[class*=\\'modal\\']{display:none!important;}pre,code{background:#2c2c2e!important;color:#81c995!important;padding:2px 6px!important;border-radius:4px!important;}blockquote{border-left:3px solid #8ab4f8!important;margin-left:0!important;padding-left:16px!important;color:#9aa0a6!important;}';(document.head||document.documentElement).appendChild(s);window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'reader',on:true}));}catch(e){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'reader',on:false}));}})();true;`;

const READER_EXIT_SCRIPT = `(function(){try{var s=document.getElementById('hwb-reader-style');if(s)s.remove();window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'reader',on:false}));}catch(e){}})();true;`;

// ─── Find in page script builder ─────────────────────────────────────────────

function buildFindScript(query: string, forward: boolean): string {
  const q = JSON.stringify(query || "");
  return `(function(){try{if(!${q}){window.getSelection&&window.getSelection().removeAllRanges();window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'find',found:false}));return;}var f=window.find(${q},false,${!forward},true,false,true,false);window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'find',found:f}));}catch(e){window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'find',found:false}));}})();true;`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDisplayUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    let host = u.hostname;
    if (host.startsWith("www.")) host = host.slice(4);
    return host;
  } catch {
    return url;
  }
}

/** Strip strategy/tracking params before showing URL in edit field */
function getCleanEditUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    const HIDDEN_PARAMS = ["udm", "kae", "k1", "kp", "summary", "source", "kae", "_x_tr_sl", "_x_tr_tl"];
    HIDDEN_PARAMS.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

// ── Weather widget ─────────────────────────────────────────────────────────

const WMO_ICON: Record<number, string> = {
  0: "sun", 1: "sun", 2: "cloud", 3: "cloud",
  45: "wind", 48: "wind",
  51: "cloud-drizzle", 53: "cloud-drizzle", 55: "cloud-drizzle",
  61: "cloud-rain", 63: "cloud-rain", 65: "cloud-rain",
  71: "cloud-snow", 73: "cloud-snow", 75: "cloud-snow",
  80: "cloud-rain", 81: "cloud-rain", 82: "cloud-rain",
  95: "zap", 96: "zap", 99: "zap",
};
const WMO_LABEL: Record<number, string> = {
  0: "Clear", 1: "Sunny", 2: "Partly Cloudy", 3: "Overcast",
  45: "Foggy", 48: "Foggy",
  51: "Drizzle", 53: "Drizzle", 55: "Heavy Drizzle",
  61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
  71: "Light Snow", 73: "Snow", 75: "Heavy Snow",
  80: "Showers", 81: "Showers", 82: "Heavy Showers",
  95: "Thunderstorm", 96: "Thunderstorm", 99: "Hail Storm",
};

function WeatherWidget({ colors }: { colors: ColorsType }) {
  const [weather, setWeather] = useState<{ temp: number; code: number; wind: number } | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchWeather() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") { setPermDenied(true); setLoading(false); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const { latitude, longitude } = loc.coords;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current_weather=true`
        );
        const json = await res.json();
        if (!cancelled && json?.current_weather) {
          setWeather({
            temp: Math.round(json.current_weather.temperature),
            code: json.current_weather.weathercode,
            wind: Math.round(json.current_weather.windspeed),
          });
        }
      } catch {}
      if (!cancelled) setLoading(false);
    }
    fetchWeather();
    return () => { cancelled = true; };
  }, []);

  if (permDenied || (!loading && !weather)) return null;

  if (loading) {
    return (
      <View style={[wxStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="cloud" size={16} color={colors.mutedForeground} />
        <Text style={[wxStyles.label, { color: colors.mutedForeground }]}>Getting weather…</Text>
      </View>
    );
  }

  const wmoCode = weather!.code;
  const icon = WMO_ICON[wmoCode] ?? "cloud";
  const label = WMO_LABEL[wmoCode] ?? "Weather";

  return (
    <View style={[wxStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as any} size={20} color={colors.primary} />
      <Text style={[wxStyles.temp, { color: colors.foreground }]}>{weather!.temp}°C</Text>
      <Text style={[wxStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={wxStyles.spacer} />
      <Feather name="wind" size={12} color={colors.mutedForeground} />
      <Text style={[wxStyles.wind, { color: colors.mutedForeground }]}>{weather!.wind} km/h</Text>
    </View>
  );
}

const wxStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  temp: { fontSize: 18, fontFamily: "Inter_700Bold" },
  label: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wind: { fontSize: 11, fontFamily: "Inter_400Regular" },
  spacer: { flex: 1 },
});

type ColorsType = ReturnType<typeof import("@/hooks/useColors").useColors>;

// ─── Find bar ────────────────────────────────────────────────────────────────

function FindBar({
  query,
  found,
  colors,
  onQueryChange,
  onNext,
  onPrev,
  onClose,
}: {
  query: string;
  found: boolean | null;
  colors: ColorsType;
  onQueryChange: (q: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<TextInputInstance>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <View style={[findStyles.bar, { backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
      <Feather name="search" size={13} color={colors.mutedForeground} />
      <TextInput
        ref={inputRef}
        style={[findStyles.input, { color: colors.foreground }]}
        value={query}
        onChangeText={onQueryChange}
        placeholder="Find in page"
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onNext}
      />
      {found !== null && (
        <Text style={[findStyles.status, { color: found ? colors.clean : colors.blockStrict }]}>
          {found ? "✓" : "✗"}
        </Text>
      )}
      <Pressable hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })} onPress={onPrev}>
        <Feather name="chevron-up" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })} onPress={onNext}>
        <Feather name="chevron-down" size={18} color={colors.foreground} />
      </Pressable>
      <Pressable hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })} onPress={onClose}>
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

const findStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", height: 28 },
  status: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 14, textAlign: "center" },
});

// ─── Actions sheet ────────────────────────────────────────────────────────────

type SheetAction = {
  icon: string;
  label: string;
  subtitle?: string;
  color?: string;
  onPress: () => void;
};

function ActionsSheet({
  visible,
  currentUrl,
  currentDomain,
  isBookmarked,
  isReaderMode,
  isDarkMode,
  isTrusted,
  colors,
  insets,
  onClose,
  onBookmark,
  onFind,
  onReaderMode,
  onDarkMode,
  onNewTab,
  onCopyUrl,
  onShare,
  onSaveCapsule,
  onOpenExternal,
  onTrust,
  onBlock,
  onReport,
  onResearch,
}: {
  visible: boolean;
  currentUrl: string;
  currentDomain: string;
  isBookmarked: boolean;
  isReaderMode: boolean;
  isDarkMode: boolean;
  isTrusted: boolean;
  colors: ColorsType;
  insets: { bottom: number };
  onClose: () => void;
  onBookmark: () => void;
  onFind: () => void;
  onReaderMode: () => void;
  onDarkMode: () => void;
  onNewTab: () => void;
  onCopyUrl: () => void;
  onShare: () => void;
  onOpenExternal: () => void;
  onTrust: () => void;
  onBlock: () => void;
  onReport: () => void;
  onResearch: () => void;
  onSaveCapsule?: () => void;
}) {
  const sections: SheetAction[][] = [
    [
      {
        icon: isBookmarked ? "bookmark" : "bookmark",
        label: isBookmarked ? "Remove Bookmark" : "Bookmark Page",
        color: isBookmarked ? colors.primary : colors.foreground,
        onPress: onBookmark,
      },
      { icon: "search", label: "Find in Page", color: colors.foreground, onPress: onFind },
      {
        icon: "book-open",
        label: isReaderMode ? "Exit Reader Mode" : "Reader Mode",
        color: isReaderMode ? colors.primary : colors.foreground,
        onPress: onReaderMode,
      },
      {
        icon: "moon",
        label: isDarkMode ? "Exit Force Dark Mode" : "Force Dark Mode",
        color: isDarkMode ? "#c58af9" : colors.foreground,
        onPress: onDarkMode,
      },
    ],
    [
      { icon: "plus-square", label: "New Tab", color: colors.foreground, onPress: onNewTab },
      { icon: "copy", label: "Copy URL", color: colors.foreground, onPress: onCopyUrl },
      { icon: "share", label: "Share Page", color: colors.foreground, onPress: onShare },
      { icon: "external-link", label: "Open in Browser", color: colors.foreground, onPress: onOpenExternal },
    ],
    [
      { icon: "folder-plus", label: "Add to Research", color: colors.primary, onPress: onResearch },
      ...(onSaveCapsule ? [{ icon: "layers" as const, label: "Save Session Capsule", color: "#7B5CFF", onPress: onSaveCapsule }] : []),
      {
        icon: "check-circle",
        label: isTrusted ? "Trusted Domain" : "Trust This Domain",
        color: isTrusted ? colors.clean : colors.foreground,
        onPress: onTrust,
      },
      { icon: "slash", label: "Block This Domain", color: colors.blockStrict, onPress: onBlock },
      { icon: "flag", label: "Report This Site", color: colors.warn, onPress: onReport },
    ],
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sheetStyles.overlay} onPress={onClose}>
        <Pressable
          style={[sheetStyles.sheet, { backgroundColor: colors.card }]}
          onPress={() => {}}
        >
          <View style={[sheetStyles.handle, { backgroundColor: colors.border }]} />
          {currentUrl ? (
            <View style={[sheetStyles.urlRow, { borderBottomColor: colors.border }]}>
              <Feather name="globe" size={12} color={colors.mutedForeground} />
              <Text style={[sheetStyles.urlText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {currentDomain || currentUrl}
              </Text>
            </View>
          ) : null}
          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 8 }}
          >
            {sections.map((section, si) => (
              <View key={si} style={si > 0 ? [sheetStyles.section, { borderTopColor: colors.border }] : undefined}>
                {section.map((action) => (
                  <Pressable
                    key={action.label}
                    style={({ pressed }) => [sheetStyles.row, { opacity: pressed ? 0.6 : 1 }]}
                    onPress={action.onPress}
                  >
                    <View style={[sheetStyles.rowIcon, { backgroundColor: (action.color ?? colors.foreground) + "15" }]}>
                      <Feather name={action.icon as any} size={16} color={action.color ?? colors.foreground} />
                    </View>
                    <Text style={[sheetStyles.rowLabel, { color: action.color ?? colors.foreground }]}>
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, maxHeight: "76%" },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  urlText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  section: { borderTopWidth: 1, marginTop: 4, paddingTop: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 14, gap: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

// ─── Footer button ────────────────────────────────────────────────────────────

function FooterBtn({
  icon,
  color,
  disabled,
  badge,
  onPress,
}: {
  icon: any;
  color: string;
  disabled?: boolean;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.footerBtn, { opacity: disabled ? 0.25 : pressed ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
    >
      <Feather name={icon} size={18} color={color} />
      {badge != null && badge > 0 && (
        <View style={[styles.footerBadge, { backgroundColor: color }]}>
          <Text style={styles.footerBadgeText}>{badge > 9 ? "9+" : badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Home page ────────────────────────────────────────────────────────────────

const ENGINE_ICONS: Record<SearchEngine, string> = {
  google_web: "G",
  duckduckgo: "D",
  brave: "B",
};

const ENGINE_SHORT: Record<SearchEngine, string> = {
  google_web: "Web Mode",
  duckduckgo: "DDG",
  brave: "Brave",
};

const ENGINE_NO_AI: Record<SearchEngine, boolean> = {
  google_web: true,
  duckduckgo: true,
  brave: true,
};

const QUICK_ACTIONS = [
  { id: "check", icon: "shield", label: "Check", colorKey: "watch" as const },
  { id: "history", icon: "clock", label: "History", colorKey: "mutedForeground" as const },
  { id: "bookmarks", icon: "bookmark", label: "Saved", colorKey: "primary" as const },
  { id: "research", icon: "cpu", label: "Research", colorKey: "clean" as const },
  { id: "report", icon: "flag", label: "Report", colorKey: "warn" as const },
];

function HomeTab({
  colors,
  selectedEngine,
  setSelectedEngine,
  activeChip,
  setActiveChip,
  onNavigate,
  onCheck,
  onReport,
  onHistory,
  onBookmarks,
  onResearch,
  totalWarnedDomains,
  totalReports,
  aiHiddenCount,
}: {
  colors: ColorsType;
  selectedEngine: SearchEngine;
  setSelectedEngine: (e: SearchEngine) => void;
  activeChip: string | null;
  setActiveChip: (c: string | null) => void;
  onNavigate: (q: string) => void;
  onCheck: () => void;
  onReport: () => void;
  onHistory: () => void;
  onBookmarks: () => void;
  onResearch: () => void;
  totalWarnedDomains: number;
  totalReports: number;
  aiHiddenCount: number;
}) {
  const [query, setQuery] = useState("");

  const actionHandlers: Record<string, () => void> = {
    check: onCheck, history: onHistory, bookmarks: onBookmarks, research: onResearch, report: onReport,
  };

  return (
    <ScrollView
      style={[homeStyles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={homeStyles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={homeStyles.hero}>
        <View style={[homeStyles.logoRing, { borderColor: colors.primary + "50", backgroundColor: colors.primary + "18" }]}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={homeStyles.logoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={[homeStyles.heroTitle, { color: colors.foreground }]}>Human Web</Text>
        <Text style={[homeStyles.heroSub, { color: colors.primary }]}>No AI Overviews. Real results.</Text>
      </View>

      {/* ── Search bar ── */}
      <View style={[homeStyles.searchWrap, { backgroundColor: colors.input, borderColor: colors.primary + "50" }]}>
        <View style={[homeStyles.searchIcon, { backgroundColor: colors.primary }]}>
          <Feather name="search" size={15} color="#fff" />
        </View>
        <TextInput
          style={[homeStyles.searchInput, { color: colors.foreground }]}
          placeholder="Search anything or enter URL"
          placeholderTextColor={colors.mutedForeground}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => { onNavigate(query); setQuery(""); }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          maxLength={500}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => { onNavigate(query); setQuery(""); }}
            style={({ pressed }) => [homeStyles.searchGo, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* ── Engine selector ── */}
      <View style={[homeStyles.engineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[homeStyles.engineLabel, { color: colors.mutedForeground }]}>ENGINE</Text>
        <View style={homeStyles.engineRow}>
          {ENGINES.map((e) => {
            const active = selectedEngine === e.value;
            return (
              <Pressable
                key={e.value}
                onPress={() => { setSelectedEngine(e.value); Haptics.selectionAsync(); }}
                style={({ pressed }) => [
                  homeStyles.engineBtn,
                  {
                    backgroundColor: active ? colors.primary : colors.input,
                    borderColor: active ? colors.primary : "transparent",
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[homeStyles.engineBtnLetter, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {ENGINE_ICONS[e.value]}
                </Text>
                <Text style={[homeStyles.engineBtnText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {ENGINE_SHORT[e.value]}
                </Text>
                {ENGINE_NO_AI[e.value] && (
                  <View style={[homeStyles.engineBadge, { backgroundColor: active ? "#00D4A0" : colors.clean + "30" }]}>
                    <Text style={[homeStyles.engineBadgeText, { color: active ? "#000" : colors.clean }]}>AI-FREE</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Modifier chips ── */}
      <View style={homeStyles.modifiersBlock}>
        <View style={homeStyles.modifiersHeader}>
          <Text style={[homeStyles.modifiersTitle, { color: colors.mutedForeground }]}>FILTER</Text>
          {activeChip && (
            <Pressable onPress={() => setActiveChip(null)} hitSlop={8}>
              <Text style={[homeStyles.modifiersClear, { color: colors.primary }]}>Clear</Text>
            </Pressable>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={homeStyles.modifiersScroll}>
          {SEARCH_CHIPS.map((chip) => {
            const active = activeChip === chip.id;
            return (
              <Pressable
                key={chip.id}
                onPress={() => { setActiveChip(active ? null : chip.id); Haptics.selectionAsync(); }}
                style={({ pressed }) => [
                  homeStyles.modChip,
                  {
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[homeStyles.modChipText, { color: active ? "#fff" : colors.mutedForeground }]}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Quick actions 5-grid ── */}
      <View style={homeStyles.actionsGrid}>
        {QUICK_ACTIONS.map((a) => {
          const color = colors[a.colorKey];
          return (
            <Pressable
              key={a.id}
              onPress={actionHandlers[a.id]}
              style={({ pressed }) => [homeStyles.actionCell, { backgroundColor: color + "14", opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={[homeStyles.actionIconRing, { backgroundColor: color + "22" }]}>
                <Feather name={a.icon as any} size={18} color={color} />
              </View>
              <Text style={[homeStyles.actionLabel, { color }]}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── Weather ── */}
      <WeatherWidget colors={colors} />

      {/* ── Stats bar ── */}
      <View style={[homeStyles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={homeStyles.statCell}>
          <Text style={[homeStyles.statVal, { color: colors.clean }]}>{aiHiddenCount}</Text>
          <Text style={[homeStyles.statKey, { color: colors.mutedForeground }]}>AI Blocked</Text>
        </View>
        <View style={[homeStyles.statSep, { backgroundColor: colors.border }]} />
        <View style={homeStyles.statCell}>
          <Text style={[homeStyles.statVal, { color: colors.warn }]}>{totalWarnedDomains}</Text>
          <Text style={[homeStyles.statKey, { color: colors.mutedForeground }]}>Warned Sites</Text>
        </View>
        <View style={[homeStyles.statSep, { backgroundColor: colors.border }]} />
        <View style={homeStyles.statCell}>
          <Text style={[homeStyles.statVal, { color: colors.primary }]}>{totalReports}</Text>
          <Text style={[homeStyles.statKey, { color: colors.mutedForeground }]}>Reports</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const homeStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 28, paddingBottom: 120, gap: 18 },

  hero: { alignItems: "center", paddingTop: 8, paddingBottom: 4, gap: 8 },
  logoRing: {
    width: 80, height: 80, borderRadius: 24, borderWidth: 2,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
    overflow: "hidden",
  },
  logoImage: {
    width: 76, height: 76, borderRadius: 22,
  },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  heroSub: { fontSize: 13, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", borderRadius: 16,
    borderWidth: 1.5, height: 56, paddingRight: 6, paddingLeft: 6, gap: 10,
  },
  searchIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 56 },
  searchGo: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },

  engineCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  engineLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  engineRow: { flexDirection: "row", gap: 8 },
  engineBtn: {
    flex: 1, borderRadius: 12, borderWidth: 1.5,
    paddingVertical: 10, alignItems: "center", gap: 3,
  },
  engineBtnLetter: { fontSize: 16, fontFamily: "Inter_700Bold" },
  engineBtnText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  engineBadge: {
    backgroundColor: "#00D4A0", borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1,
  },
  engineBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#000" },

  modifiersBlock: { gap: 8 },
  modifiersHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modifiersTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  modifiersClear: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  modifiersScroll: { gap: 8, flexDirection: "row" },
  modChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5,
  },
  modChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  actionsGrid: { flexDirection: "row", gap: 8 },
  actionCell: {
    flex: 1, borderRadius: 14, paddingVertical: 14,
    alignItems: "center", gap: 8,
  },
  actionIconRing: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  actionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },

  statsBar: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1,
    paddingVertical: 16, overflow: "hidden",
  },
  statCell: { flex: 1, alignItems: "center", gap: 3 },
  statVal: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statKey: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  statSep: { width: 1, marginVertical: 6 },
});

// ─── Main browser screen ──────────────────────────────────────────────────────

export default function BrowserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ─ contexts ─
  const {
    settings,
    getDomainReputation,
    blockedDomains,
    trustedDomains,
    addTrustedDomain,
    addBlockedDomain,
    reports,
    totalWarnedDomains,
    aiHiddenCount,
    incrementAiHiddenCount,
  } = useApp();
  const { tabs, activeTab, createTab, updateTab } = useTabs();
  // Id of the tab that owns the currently mounted BrowserView. Captured per
  // render so async WebView events can only ever mutate this tab.
  const browserTabId = activeTab.id;
  const { addBookmark, removeBookmarkByUrl, isBookmarked } = useBookmarks();
  const { addHistoryEntry, isPrivateMode, pendingNavUrl, setPendingNavUrl } = useHistory();
  const { addSource } = useResearch();

  // ─ browser state ─
  const [activeUrl, setActiveUrl] = useState(activeTab?.url || "");
  const [addressInput, setAddressInput] = useState("");
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const isEditingAddressRef = useRef(false);
  const setEditingAddress = useCallback((next: boolean) => {
    isEditingAddressRef.current = next;
    setIsEditingAddress(next);
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  // ─ features state ─
  const [selectedEngine, setSelectedEngine] = useState<SearchEngine>(settings.defaultSearchEngine);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [showFindBar, setShowFindBar] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findFound, setFindFound] = useState<boolean | null>(null);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showSheet, setShowSheet] = useState(false);

  // ─ text selection state ─
  const [selectedText, setSelectedText] = useState("");
  const [showSelectionSheet, setShowSelectionSheet] = useState(false);

  // ─ link/image long-press context state ─
  const [contextInfo, setContextInfo] = useState<{ kind: "link" | "image"; url: string } | null>(null);

  // ─ pull to refresh state ─
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullProgress = useRef(new Animated.Value(0)).current;
  const pullHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─ domain safety state ─
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [forceLoad, setForceLoad] = useState(false);
  const [aiToast, setAiToast] = useState<{ success: boolean } | null>(null);
  const [bingWarningUrl, setBingWarningUrl] = useState<string | null>(null);

  // ─ safety & downloads ─
  const { safetySettings, pendingPermission, setPendingPermission, incrementPopupsBlocked } = useSafety();
  const { startDownload, activeCount: downloadActiveCount } = useDownloads();
  const { shouldBlock: firewallShouldBlock, enabled: firewallEnabled } = useFirewall();
  const { getEffectiveUA } = useProfiles();
  const { getInjectedJS } = useExtensions();
  const { saveCapsule } = useSessions();
  const { addEntry: addClipboardEntry } = useClipboard();
  const [popupToast, setPopupToast] = useState(false);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // ─ refs ─
  const browserRef = useRef<BrowserViewHandle>(null);
  const addressRef = useRef<TextInputInstance>(null);
  const prevTabIdRef = useRef(activeTab.id);
  // ─ derived ─
  const isHome = !activeUrl;
  const isPrivateSession = activeTab.isPrivate || isPrivateMode;
  const isHttps = activeUrl.startsWith("https");
  const currentDomain = useMemo(
    () => (activeUrl ? (normalizeDomain(activeUrl) ?? "") : ""),
    [activeUrl]
  );
  const reputation = useMemo(
    () => (currentDomain ? getDomainReputation(currentDomain) : null),
    [currentDomain, getDomainReputation]
  );
  const isTrusted = currentDomain ? trustedDomains.includes(currentDomain) : false;
  const isBlocked = !forceLoad && currentDomain ? blockedDomains.includes(currentDomain) : false;
  const showWarning =
    !warningDismissed &&
    reputation &&
    !isTrusted &&
    ["warn", "hide_strict", "block_strict"].includes(reputation.tier);
  const bookmarkedUrl = activeUrl ? isBookmarked(activeUrl) : false;

  // ─ tab sync effect ─
  useEffect(() => {
    if (prevTabIdRef.current !== activeTab.id) {
      prevTabIdRef.current = activeTab.id;
      const url = activeTab.url || "";
      setActiveUrl(url);
      setAddressInput(url ? getDisplayUrl(url) : "");
      setEditingAddress(false);
      setWarningDismissed(false);
      setForceLoad(false);
      setShowFindBar(false);
      setIsReaderMode(false);
      setIsDarkMode(false);
      setShowSelectionSheet(false);
      setSelectedText("");
      setCanGoBack(false);
      setCanGoForward(false);
      setIsRefreshing(false);
      if (pullHoldTimer.current) { clearTimeout(pullHoldTimer.current); pullHoldTimer.current = null; }
      Animated.spring(pullProgress, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    }
  }, [activeTab.id]);

  // ─ AI toast dismiss ─
  useEffect(() => {
    if (!aiToast) return;
    const t = setTimeout(() => setAiToast(null), 3500);
    return () => clearTimeout(t);
  }, [aiToast]);

  // ─ popup toast dismiss ─
  useEffect(() => {
    if (!popupToast) return;
    const t = setTimeout(() => setPopupToast(false), 2500);
    return () => clearTimeout(t);
  }, [popupToast]);

  // ─ download toast dismiss ─
  useEffect(() => {
    if (!downloadToast) return;
    const t = setTimeout(() => setDownloadToast(null), 3000);
    return () => clearTimeout(t);
  }, [downloadToast]);

  // ─ permission request dialog ─
  useEffect(() => {
    if (!pendingPermission) return;
    const domain = pendingPermission.origin;
    const readable = pendingPermission.resources
      .map((r) =>
        r.includes("AUDIO") ? "Microphone"
        : r.includes("VIDEO") ? "Camera"
        : r.includes("LOCATION") ? "Location"
        : r
      )
      .join(", ");
    Alert.alert(
      "Permission Request",
      `${domain} is requesting: ${readable || "device permissions"}`,
      [
        {
          text: "Deny",
          style: "destructive",
          onPress: () => { pendingPermission.deny(); setPendingPermission(null); },
        },
        {
          text: "Allow",
          onPress: () => { pendingPermission.grant(); setPendingPermission(null); },
        },
      ]
    );
  }, [pendingPermission]);

  // ─ Android hardware back button ─
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (showSheet) { setShowSheet(false); return true; }
      if (showFindBar) { setShowFindBar(false); return true; }
      if (isEditingAddress) { setEditingAddress(false); setAddressInput(activeUrl ? getDisplayUrl(activeUrl) : ""); return true; }
      if (canGoBack) { browserRef.current?.goBack(); return true; }
      if (!isHome) { goHome(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [showSheet, showFindBar, isEditingAddress, canGoBack, isHome, activeUrl]);

  // ─ navigate ─
  const navigate = useCallback(
    (input: string) => {
      const trimmed = input.trim();
      if (!trimmed) return;
      const chipObj = activeChip ? SEARCH_CHIPS.find((c) => c.id === activeChip) : null;
      const queryText = chipObj && !isLikelyUrl(trimmed) ? `${trimmed} ${chipObj.suffix}` : trimmed;
      const url = buildSearchUrl(queryText, selectedEngine);
      if (!url) return;
      if (/^https?:\/\/(?:[\w-]+\.)?bing\.com/i.test(url)) {
        setBingWarningUrl(url);
        return;
      }
      setActiveUrl(url);
      setAddressInput(getDisplayUrl(url));
      setEditingAddress(false);
      setWarningDismissed(false);
      setForceLoad(false);
      setIsReaderMode(false);
      if (url === activeUrl) browserRef.current?.reload();
      updateTab(activeTab.id, { url });
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [activeChip, selectedEngine, activeTab.id, activeUrl, updateTab]
  );

  // ─ navigate from history ─
  useEffect(() => {
    if (pendingNavUrl) {
      setPendingNavUrl(null);
      navigate(pendingNavUrl);
    }
    // navigate and setPendingNavUrl are stable useCallback refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNavUrl]);

  function goHome() {
    setActiveUrl("");
    setAddressInput("");
    setEditingAddress(false);
    setWarningDismissed(false);
    setForceLoad(false);
    setCanGoBack(false);
    setCanGoForward(false);
    setShowFindBar(false);
    setIsReaderMode(false);
    updateTab(activeTab.id, { url: "", title: "New Tab" });
    Keyboard.dismiss();
  }

function handleUrlChange(url: string) {
    if (__DEV__) console.log('[NAV] handleUrlChange:', url);
    setActiveUrl(url);
    if (!isEditingAddressRef.current) setAddressInput(getDisplayUrl(url));
    updateTab(browserTabId, { url });
  }

  function handleTitleChange(title: string) {
    if (title) {
      updateTab(browserTabId, { title });
      if (activeUrl && !isPrivateSession) addHistoryEntry(activeUrl, title);
    }
  }

function handleNavigationRequest(url: string) {
    if (__DEV__) console.log('[NAV] handleNavigationRequest:', url);
    if (/^https?:\/\/(?:[\w-]+\.)?bing\.com/i.test(url)) {
      setBingWarningUrl(url);
      return;
    }
    setActiveUrl(url);
    if (!isEditingAddressRef.current) setAddressInput(getDisplayUrl(url));
    updateTab(browserTabId, { url });
  }

  const PULL_THRESHOLD = 72;
  const PULL_HOLD_MS = 1100;

  function handlePullGesture(type: string, dy: number) {
    if (isRefreshing) return;
    if (type === "pull") {
      const progress = Math.min(dy / PULL_THRESHOLD, 1.4);
      pullProgress.setValue(progress);
      if (dy >= PULL_THRESHOLD) {
        if (!pullHoldTimer.current) {
          pullHoldTimer.current = setTimeout(() => {
            pullHoldTimer.current = null;
            setIsRefreshing(true);
            browserRef.current?.reload();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Animated.spring(pullProgress, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
          }, PULL_HOLD_MS);
        }
      } else {
        if (pullHoldTimer.current) {
          clearTimeout(pullHoldTimer.current);
          pullHoldTimer.current = null;
        }
      }
    } else {
      if (pullHoldTimer.current) {
        clearTimeout(pullHoldTimer.current);
        pullHoldTimer.current = null;
      }
      Animated.spring(pullProgress, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    }
  }

  function handleAiHideResult(success: boolean) {
    setAiToast({ success });
    if (success) incrementAiHiddenCount();
  }

  function handlePopupBlocked() {
    incrementPopupsBlocked();
    setPopupToast(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleDownloadRequest(url: string, filename: string) {
    const name = filename || url.split("/").pop() || "file";
    const displayName = name.length > 40 ? name.slice(0, 40) + "\u2026" : name;
    Alert.alert(
      "Download File",
      `Save "${displayName}" to your device?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Download",
          onPress: async () => {
            if (Platform.OS === "android") {
              try {
                const { PermissionsAndroid } = await import("react-native");
                const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                  { title: "Storage Permission", message: "Human Web Browser needs storage access to save files.", buttonPositive: "Allow" }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED && granted !== "never_ask_again") {
                  Alert.alert("Permission Denied", "Storage permission is required to download files.");
                  return;
                }
              } catch {}
            }
            startDownload(url, filename);
            setDownloadToast(displayName);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  function handlePermissionRequest(req: {
    origin: string;
    resources: string[];
    grant: () => void;
    deny: () => void;
  }) {
    if (!safetySettings.permissionGuardEnabled) {
      req.grant();
      return;
    }
    setPendingPermission(req);
  }

  function handleWebViewMessage(data: any) {
    try {
      const msg = typeof data === "string" ? JSON.parse(data) : data;
      if (msg.type === "find") setFindFound(Boolean(msg.found));
      else if (msg.type === "reader") setIsReaderMode(Boolean(msg.on));
    } catch {}
  }

  function handleTextSelection(text: string) {
    if (text && text.length > 0) {
      setSelectedText(text);
      setShowSelectionSheet(true);
      addClipboardEntry(text, activeUrl);
    } else {
      setShowSelectionSheet(false);
      setSelectedText("");
    }
  }

  // long-press on a link/image opens the context sheet
  function handleContextRequest(info: { kind: "link" | "image"; url: string }) {
    if (!info.url) return;
    setContextInfo({ kind: info.kind, url: info.url });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleContextOpen() {
    if (!contextInfo) return;
    const url = contextInfo.url.trim();
    setContextInfo(null);
    navigate(url);
  }

  function handleContextOpenNewTab() {
    if (!contextInfo) return;
    const url = contextInfo.url.trim();
    setContextInfo(null);
    createTab(url);
  }

  function handleContextCopy() {
    if (!contextInfo) return;
    Clipboard.setStringAsync(contextInfo.url).catch(() => {});
    setContextInfo(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleContextShare() {
    if (!contextInfo) return;
    const url = contextInfo.url;
    setContextInfo(null);
    Share.share({ url, message: url }).catch(() => {});
  }

  function handleContextDownload() {
    if (!contextInfo || contextInfo.kind !== "image") return;
    const url = contextInfo.url;
    const filename = url.split("/").pop()?.split("?")[0] || "image.jpg";
    setContextInfo(null);
    handleDownloadRequest(url, filename);
  }

  function toggleDarkMode() {
    const next = !isDarkMode;
    setIsDarkMode(next);
    setShowSheet(false);
    if (browserRef.current) {
      browserRef.current.injectScript(
        next
          ? `(function(){try{if(document.getElementById('hwb-dark-filter'))return;var s=document.createElement('style');s.id='hwb-dark-filter';s.textContent='html{filter:invert(1) hue-rotate(180deg)!important;background:#000!important;}img,video,canvas,picture,svg,iframe,embed{filter:invert(1) hue-rotate(180deg)!important;}[style*="background-image"]{filter:invert(1) hue-rotate(180deg)!important;}';(document.head||document.documentElement).appendChild(s);}catch(e){}})();true;`
          : `(function(){try{var s=document.getElementById('hwb-dark-filter');if(s)s.remove();}catch(e){}})();true;`
      );
    }
    Haptics.selectionAsync();
  }

  function doFind(query: string, forward: boolean) {
    if (!browserRef.current) return;
    browserRef.current.injectScript(buildFindScript(query, forward));
  }

  function toggleReaderMode() {
    if (!browserRef.current) return;
    browserRef.current.injectScript(isReaderMode ? READER_EXIT_SCRIPT : READER_ENTER_SCRIPT);
  }

  function toggleBookmark() {
    if (!activeUrl) return;
    if (bookmarkedUrl) {
      removeBookmarkByUrl(activeUrl);
    } else {
      addBookmark(activeUrl, activeTab.title || getDisplayUrl(activeUrl));
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleOpenFind() {
    setShowSheet(false);
    setShowFindBar(true);
  }

  function handleCopyUrl() {
    Clipboard.setStringAsync(activeUrl).catch(() => {});
    setShowSheet(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleShareUrl() {
    Share.share({ url: activeUrl, message: activeUrl }).catch(() => {});
    setShowSheet(false);
  }

  function handleOpenExternal() {
    Linking.openURL(activeUrl).catch(() => {});
    setShowSheet(false);
  }

  function handleTrust() {
    addTrustedDomain(currentDomain);
    setShowSheet(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleBlock() {
    addBlockedDomain(currentDomain);
    setShowSheet(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function handleReport() {
    setShowSheet(false);
    router.push({ pathname: "/(tabs)/report", params: { inputUrl: currentDomain } });
  }

  function handleAddToResearch() {
    setShowSheet(false);
    router.push({ pathname: "/research", params: { url: activeUrl, title: activeTab.title || "" } });
  }

  function shieldColor() {
    if (!reputation) return colors.mutedForeground;
    switch (reputation.tier) {
      case "block_strict": return colors.blockStrict;
      case "hide_strict": return colors.hideStrict;
      case "warn": return colors.warn;
      default: return colors.clean;
    }
  }

  const topPad = Platform.OS === "web" ? 0 : insets.top;

  // ─ Blocked domain screen ─
  if (isBlocked && !isHome) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={[styles.toolbar, { backgroundColor: colors.toolbar }]}>
          <Pressable onPress={goHome} style={styles.navBtn} hitSlop={8}>
            <Feather name="arrow-left" size={19} color={colors.foreground} />
          </Pressable>
          <View style={[styles.addressBar, { backgroundColor: colors.addressBar }]}>
            <Feather name="slash" size={11} color={colors.blockStrict} />
            <Text style={[styles.addressDisplay, { color: colors.blockStrict }]} numberOfLines={1}>
              {currentDomain}
            </Text>
          </View>
        </View>
        <View style={[styles.blockedScreen, { backgroundColor: colors.background }]}>
          <View style={[styles.blockedIcon, { backgroundColor: colors.blockStrict + "18" }]}>
            <Feather name="slash" size={36} color={colors.blockStrict} />
          </View>
          <Text style={[styles.blockedTitle, { color: colors.foreground }]}>Blocked domain</Text>
          <Text style={[styles.blockedDomain, { color: colors.blockStrict }]}>{currentDomain}</Text>
          <Text style={[styles.blockedBody, { color: colors.mutedForeground }]}>
            This domain is on your personal blocklist.
            {reputation && reputation.totalReports > 0
              ? `\n${reputation.totalReports} community report${reputation.totalReports !== 1 ? "s" : ""} on record.`
              : ""}
          </Text>
          <View style={styles.blockedActions}>
            <Pressable
              style={({ pressed }) => [styles.blockedBtnPrimary, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              onPress={goHome}
            >
              <Feather name="arrow-left" size={15} color={colors.primaryForeground} />
              <Text style={[styles.blockedBtnPrimaryText, { color: colors.primaryForeground }]}>Go Back</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.blockedBtnSecondary, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => setForceLoad(true)}
            >
              <Text style={[styles.blockedBtnSecondaryText, { color: colors.foreground }]}>Open Anyway</Text>
            </Pressable>
            <Pressable
              onPress={() => { addTrustedDomain(currentDomain); setForceLoad(true); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
              style={({ pressed }) => [styles.blockedBtnText, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.blockedBtnTextLabel, { color: colors.clean }]}>Trust This Domain</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // ─ Main layout ─
  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>

      {/* ── Private mode banner ── */}
      {isPrivateSession && (
        <View style={[styles.privateBanner, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="eye-off" size={11} color={colors.primary} />
          <Text style={[styles.privateBannerText, { color: colors.primary }]}>
            Private browsing — history not saved
          </Text>
        </View>
      )}

      {/* ── Toolbar ── */}
      <View style={[styles.toolbar, { backgroundColor: colors.toolbar }]}>

        {/* Tabs button */}
        <Pressable
          style={({ pressed }) => [styles.tabsBtn, { borderColor: colors.foreground, opacity: pressed ? 0.6 : 1 }]}
          onPress={() => router.push("/tabs-overview")}
          hitSlop={4}
        >
          <Text style={[styles.tabsBtnText, { color: colors.foreground }]}>{tabs.length}</Text>
        </Pressable>

        {/* Back/forward */}
        {!isHome && (
          <View style={styles.navBtns}>
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: canGoBack ? (pressed ? 0.5 : 1) : 0.25 }]}
              onPress={() => { browserRef.current?.goBack(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              disabled={!canGoBack}
              hitSlop={6}
            >
              <Feather name="arrow-left" size={15} color={colors.foreground} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: canGoForward ? (pressed ? 0.5 : 1) : 0.25 }]}
              onPress={() => { browserRef.current?.goForward(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              disabled={!canGoForward}
              hitSlop={6}
            >
              <Feather name="arrow-right" size={15} color={colors.foreground} />
            </Pressable>
          </View>
        )}

        {/* Address bar */}
        <Pressable
          style={[styles.addressBar, { backgroundColor: colors.addressBar }]}
          onPress={() => {
            if (!isEditingAddress) {
              setEditingAddress(true);
              setAddressInput(getCleanEditUrl(activeUrl || ""));
              setTimeout(() => addressRef.current?.focus(), 40);
            }
          }}
        >
          {!isEditingAddress && activeUrl ? (
            <Feather
              name={isHttps ? "lock" : "alert-circle"}
              size={11}
              color={isHttps ? colors.clean : (safetySettings.httpsWarningEnabled ? colors.warn : colors.mutedForeground)}
              style={{ marginRight: 4 }}
            />
          ) : null}
          <TextInput
            ref={addressRef}
            style={[styles.addressInput, { color: colors.foreground }]}
            value={isEditingAddress ? addressInput : activeUrl ? getDisplayUrl(activeUrl) : ""}
            onChangeText={setAddressInput}
            onFocus={() => {
              if (!isEditingAddress) setEditingAddress(true);
            }}
            onBlur={() => { setEditingAddress(false); }}
            onSubmitEditing={() => navigate(addressInput)}
            placeholder="Search or enter address"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            keyboardType="default"
            selectTextOnFocus
          />
          {isEditingAddress && addressInput.length > 0 && (
            <Pressable onPress={() => setAddressInput("")} hitSlop={10}>
              <Feather name="x" size={13} color={colors.mutedForeground} />
            </Pressable>
          )}
        </Pressable>

        {/* Right toolbar buttons */}
        {!isHome && (
          <View style={styles.navBtns}>
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.5 : 1 }]}
              onPress={() => isLoading ? browserRef.current?.stopLoading() : browserRef.current?.reload()}
              hitSlop={6}
            >
              <Feather name={isLoading ? "x" : "refresh-cw"} size={13} color={colors.foreground} />
            </Pressable>
            {/* Reader mode shortcut */}
            <Pressable
              style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.5 : 1 }]}
              onPress={toggleReaderMode}
              hitSlop={6}
            >
              <Feather name="book-open" size={13} color={isReaderMode ? colors.primary : colors.mutedForeground} />
            </Pressable>
            {/* Shield indicator */}
            {!!currentDomain && !!reputation && reputation.tier !== "clean" && (
              <Pressable
                style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.5 : 1 }]}
                onPress={() => router.push({ pathname: "/(tabs)/check", params: { domain: currentDomain } })}
                hitSlop={6}
              >
                <Feather name="shield" size={15} color={shieldColor()} />
              </Pressable>
            )}
          </View>
        )}
      </View>

      {/* ── Progress bar ── */}
      {isLoading && (
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      )}

      {/* ── Community warning banner ── */}
      {showWarning && reputation && (
        <View
          style={[
            styles.warningBanner,
            {
              backgroundColor:
                reputation.tier === "block_strict" ? colors.blockStrict + "20"
                : reputation.tier === "hide_strict" ? colors.hideStrict + "20"
                : colors.warn + "20",
            },
          ]}
        >
          <Feather
            name="alert-triangle"
            size={12}
            color={
              reputation.tier === "block_strict" ? colors.blockStrict
              : reputation.tier === "hide_strict" ? colors.hideStrict
              : colors.warn
            }
          />
          <Text
            style={[
              styles.warningText,
              {
                color:
                  reputation.tier === "block_strict" ? colors.blockStrict
                  : reputation.tier === "hide_strict" ? colors.hideStrict
                  : colors.warn,
                flex: 1,
              },
            ]}
            numberOfLines={1}
          >
            {reputation.totalReports} report{reputation.totalReports !== 1 ? "s" : ""} · {currentDomain}
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: "/(tabs)/check", params: { domain: currentDomain } })}
            style={[styles.warningBtn, { borderColor: colors.warn + "60" }]}
          >
            <Text style={[styles.warningBtnText, { color: colors.warn }]}>Details</Text>
          </Pressable>
          <Pressable onPress={() => setWarningDismissed(true)} hitSlop={8}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* ── AI toast ── */}
      {aiToast && (
        <View style={[styles.aiToast, { backgroundColor: aiToast.success ? colors.clean + "18" : colors.warn + "18" }]}>
          <Feather
            name={aiToast.success ? "check-circle" : "alert-circle"}
            size={11}
            color={aiToast.success ? colors.clean : colors.warn}
          />
          <Text style={[styles.aiToastText, { color: aiToast.success ? colors.clean : colors.warn }]}>
            {aiToast.success ? "Web Mode active · AI Overview hidden" : "Web Mode active · AI hiding failed"}
          </Text>
        </View>
      )}

      {/* ── Popup blocked toast ── */}
      {popupToast && (
        <View style={[styles.aiToast, { backgroundColor: "#7B5CFF18" }]}>
          <Feather name="shield-off" size={11} color="#7B5CFF" />
          <Text style={[styles.aiToastText, { color: "#7B5CFF" }]}>Popup blocked</Text>
        </View>
      )}

      {/* ── Download started toast ── */}
      {!!downloadToast && (
        <Pressable
          style={[styles.aiToast, { backgroundColor: colors.clean + "18" }]}
          onPress={() => router.push("/downloads")}
        >
          <Feather name="download" size={11} color={colors.clean} />
          <Text style={[styles.aiToastText, { color: colors.clean }]} numberOfLines={1}>
            Downloading: {downloadToast}
          </Text>
        </Pressable>
      )}

      {/* ── Find bar ── */}
      {showFindBar && (
        <FindBar
          query={findQuery}
          found={findFound}
          colors={colors}
          onQueryChange={(q) => { setFindQuery(q); doFind(q, true); }}
          onNext={() => doFind(findQuery, true)}
          onPrev={() => doFind(findQuery, false)}
          onClose={() => {
            setShowFindBar(false);
            setFindQuery("");
            setFindFound(null);
            doFind("", true);
          }}
        />
      )}

      {/* ── Content area ── */}
      {isHome ? (
        <HomeTab
          colors={colors}
          selectedEngine={selectedEngine}
          setSelectedEngine={setSelectedEngine}
          activeChip={activeChip}
          setActiveChip={setActiveChip}
          onNavigate={navigate}
          onCheck={() => router.push("/(tabs)/check")}
          onReport={() => router.push("/(tabs)/report")}
          onHistory={() => router.push("/history")}
          onBookmarks={() => router.push("/bookmarks")}
          onResearch={() => router.push("/research")}
          totalWarnedDomains={totalWarnedDomains}
          totalReports={reports.length}
          aiHiddenCount={aiHiddenCount}
        />
      ) : (
        <View style={styles.webviewContainer}>
          {/* Pull-to-refresh indicator — slides down from top on deliberate hold-pull */}
          <Animated.View
            style={[
              styles.pullIndicator,
              {
                pointerEvents: "none",
                transform: [{
                  translateY: pullProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-52, 0],
                    extrapolate: "clamp",
                  }),
                }],
                opacity: pullProgress.interpolate({
                  inputRange: [0, 0.2, 1],
                  outputRange: [0, 0.5, 1],
                  extrapolate: "clamp",
                }),
              },
            ]}
          >
            <View style={[styles.pullPill, { backgroundColor: "#10101E", borderColor: "#2A2A3C" }]}>
              <Feather name="refresh-cw" size={12} color="#7B5CFF" />
              <Text style={styles.pullText}>
                {isRefreshing ? "Refreshing…" : "Hold to refresh"}
              </Text>
            </View>
          </Animated.View>
          <BrowserView
            key={browserTabId}
            ref={browserRef}
            url={activeTab.url || ""}
            forceDarkMode={isDarkMode}
            onUrlChange={handleUrlChange}
            onTitleChange={handleTitleChange}
            onLoadStart={() => { setIsLoading(true); setProgress(0.08); }}
            onLoadEnd={() => { setIsLoading(false); setProgress(1); setIsRefreshing(false); }}
            onLoadProgress={setProgress}
            onCanGoBack={setCanGoBack}
            onCanGoForward={setCanGoForward}
            onNavigationRequest={handleNavigationRequest}
            onAiHideResult={handleAiHideResult}
            onTextSelection={handleTextSelection}
            onPullGesture={handlePullGesture}
            onPopupBlocked={handlePopupBlocked}
            onDownloadRequest={handleDownloadRequest}
            onContextRequest={handleContextRequest}
            onPermissionRequest={handlePermissionRequest}
            popupBlockEnabled={safetySettings.popupBlockEnabled}
            firewallCheck={firewallEnabled ? firewallShouldBlock : undefined}
            customUserAgent={getEffectiveUA()}
            extraInjectedJS={getInjectedJS(activeUrl)}
            isPrivate={isPrivateSession}
          />
        </View>
      )}

      {/* ── Browser footer ── */}
      {!isHome && (
        <View style={[styles.footer, { backgroundColor: colors.toolbar, borderTopColor: colors.border, paddingBottom: Platform.OS === "ios" ? insets.bottom : 0 }]}>
          <FooterBtn
            icon="arrow-left"
            color={canGoBack ? colors.foreground : colors.mutedForeground}
            disabled={!canGoBack}
            onPress={() => { browserRef.current?.goBack(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <FooterBtn
            icon="arrow-right"
            color={canGoForward ? colors.foreground : colors.mutedForeground}
            disabled={!canGoForward}
            onPress={() => { browserRef.current?.goForward(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <FooterBtn
            icon="home"
            color={colors.foreground}
            onPress={() => { goHome(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
          <FooterBtn
            icon="bookmark"
            color={bookmarkedUrl ? colors.primary : colors.foreground}
            onPress={() => { toggleBookmark(); }}
          />
          <FooterBtn
            icon="more-horizontal"
            color={downloadActiveCount > 0 ? colors.primary : colors.foreground}
            badge={downloadActiveCount > 0 ? downloadActiveCount : undefined}
            onPress={() => { setShowSheet(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          />
        </View>
      )}

      {/* ── Actions sheet ── */}
      <ActionsSheet
        visible={showSheet}
        currentUrl={activeUrl}
        currentDomain={currentDomain}
        isBookmarked={bookmarkedUrl}
        isReaderMode={isReaderMode}
        isDarkMode={isDarkMode}
        isTrusted={isTrusted}
        colors={colors}
        insets={insets}
        onClose={() => setShowSheet(false)}
        onBookmark={() => { setShowSheet(false); toggleBookmark(); }}
        onFind={handleOpenFind}
        onReaderMode={() => { setShowSheet(false); toggleReaderMode(); }}
        onDarkMode={toggleDarkMode}
        onNewTab={() => { setShowSheet(false); createTab(); }}
        onCopyUrl={handleCopyUrl}
        onShare={handleShareUrl}
        onOpenExternal={handleOpenExternal}
        onTrust={handleTrust}
        onBlock={handleBlock}
        onReport={handleReport}
        onResearch={handleAddToResearch}
        onSaveCapsule={activeUrl ? () => {
          setShowSheet(false);
          saveCapsule(activeUrl, activeTab.title || getDisplayUrl(activeUrl));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } : undefined}
      />

      {/* ── Text selection sheet ── */}
      {showSelectionSheet && selectedText.length > 0 && (
        <SelectionSheet
          text={selectedText}
          colors={colors}
          insets={insets}
          onClose={() => { setShowSelectionSheet(false); setSelectedText(""); }}
          onSearch={() => {
            setShowSelectionSheet(false);
            navigate(selectedText);
          }}
          onTranslate={() => {
            setShowSelectionSheet(false);
            navigate(`https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(selectedText)}&op=translate`);
          }}
          onAddToResearch={() => {
            setShowSelectionSheet(false);
            addSource({
              url: activeUrl,
              title: activeTab.title || getDisplayUrl(activeUrl),
              domain: currentDomain,
              note: selectedText.slice(0, 500),
              tag: "useful",
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          onCopy={() => {
            Clipboard.setStringAsync(selectedText).catch(() => {});
            setShowSelectionSheet(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
        />
      )}

      {/* ── Link/image long-press context sheet ── */}
      {contextInfo && (
        <ContextSheet
          info={contextInfo}
          colors={colors}
          insets={insets}
          onClose={() => setContextInfo(null)}
          onOpen={handleContextOpen}
          onOpenNewTab={handleContextOpenNewTab}
          onCopy={handleContextCopy}
          onShare={handleContextShare}
          onDownload={contextInfo.kind === "image" ? handleContextDownload : undefined}
        />
      )}

      {/* ── Bing warning modal ── */}
      <Modal
        visible={bingWarningUrl !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setBingWarningUrl(null)}
      >
        <View style={styles.bingOverlay}>
          <View style={[styles.bingModal, { backgroundColor: colors.toolbar, borderColor: colors.border }]}>
            <View style={[styles.bingIconWrap, { backgroundColor: "#FFB02020" }]}>
              <Feather name="alert-triangle" size={26} color="#FFB020" />
            </View>
            <Text style={[styles.bingTitle, { color: colors.foreground }]}>AI Results Warning</Text>
            <Text style={[styles.bingBody, { color: colors.mutedForeground }]}>
              Bing contains AI-generated answers and overviews that this browser cannot fully block.{"\n\n"}
              We recommend using DuckDuckGo, Brave, or Google Web Mode for AI-free results.
            </Text>
            <View style={styles.bingActions}>
              <Pressable
                style={[styles.bingBtnClose, { borderColor: colors.border }]}
                onPress={() => setBingWarningUrl(null)}
              >
                <Text style={[styles.bingBtnCloseText, { color: colors.foreground }]}>Close</Text>
              </Pressable>
              <Pressable
                style={[styles.bingBtnContinue, { backgroundColor: "#FFB020" }]}
                onPress={() => {
                  const url = bingWarningUrl!;
                  setBingWarningUrl(null);
                  setActiveUrl(url);
                  setAddressInput(getDisplayUrl(url));
                  setEditingAddress(false);
                  setWarningDismissed(false);
                  setForceLoad(false);
                  setIsReaderMode(false);
                  if (url === activeUrl) browserRef.current?.reload();
                  updateTab(activeTab.id, { url });
                  Keyboard.dismiss();
                }}
              >
                <Text style={styles.bingBtnContinueText}>Continue Anyway</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Text Selection Sheet ─────────────────────────────────────────────────────

function SelectionSheet({
  text,
  colors,
  insets,
  onClose,
  onSearch,
  onTranslate,
  onAddToResearch,
  onCopy,
}: {
  text: string;
  colors: ColorsType;
  insets: { bottom: number };
  onClose: () => void;
  onSearch: () => void;
  onTranslate: () => void;
  onAddToResearch: () => void;
  onCopy: () => void;
}) {
  const preview = text.length > 80 ? text.slice(0, 80) + "…" : text;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={selStyles.overlay} onPress={onClose}>
        <Pressable
          style={[selStyles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}
          onPress={() => {}}
        >
          <View style={[selStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[selStyles.previewRow, { borderBottomColor: colors.border }]}>
            <Feather name="type" size={12} color={colors.mutedForeground} />
            <Text style={[selStyles.previewText, { color: colors.mutedForeground }]} numberOfLines={2}>
              {preview}
            </Text>
          </View>
          <View style={selStyles.actions}>
            <SelectionAction icon="search" label="Search" color={colors.primary} onPress={onSearch} />
            <SelectionAction icon="globe" label="Translate" color={colors.clean} onPress={onTranslate} />
            <SelectionAction icon="folder-plus" label="Research" color={colors.watch} onPress={onAddToResearch} />
            <SelectionAction icon="copy" label="Copy" color={colors.foreground} onPress={onCopy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SelectionAction({ icon, label, color, onPress }: { icon: any; label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [selStyles.action, { opacity: pressed ? 0.6 : 1 }]}
      onPress={onPress}
    >
      <View style={[selStyles.actionIcon, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={[selStyles.actionLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// ─── Link / Image Long-Press Context Sheet ────────────────────────────────────

function ContextSheet({
  info,
  colors,
  insets,
  onClose,
  onOpen,
  onOpenNewTab,
  onCopy,
  onShare,
  onDownload,
}: {
  info: { kind: "link" | "image"; url: string };
  colors: ColorsType;
  insets: { bottom: number };
  onClose: () => void;
  onOpen: () => void;
  onOpenNewTab: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDownload?: () => void;
}) {
  const preview = info.url.length > 80 ? info.url.slice(0, 80) + "…" : info.url;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={selStyles.overlay} onPress={onClose}>
        <Pressable
          style={[selStyles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 8 }]}
          onPress={() => {}}
        >
          <View style={[selStyles.handle, { backgroundColor: colors.border }]} />
          <View style={[selStyles.previewRow, { borderBottomColor: colors.border }]}>
            <Feather name={info.kind === "image" ? "image" : "link"} size={12} color={colors.mutedForeground} />
            <Text style={[selStyles.previewText, { color: colors.mutedForeground }]} numberOfLines={2}>
              {preview}
            </Text>
          </View>
          <View style={selStyles.actions}>
            <SelectionAction icon="corner-up-right" label="Open" color={colors.primary} onPress={onOpen} />
            <SelectionAction icon="plus-square" label="New Tab" color={colors.clean} onPress={onOpenNewTab} />
            {onDownload ? (
              <SelectionAction icon="download" label="Download" color={colors.watch} onPress={onDownload} />
            ) : null}
            <SelectionAction icon="copy" label="Copy" color={colors.foreground} onPress={onCopy} />
            <SelectionAction icon="share-2" label="Share" color={colors.foreground} onPress={onShare} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const selStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 10 },
  previewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  previewText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18, fontStyle: "italic" },
  actions: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 14, gap: 8 },
  action: { flex: 1, alignItems: "center", gap: 7 },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Private banner
  privateBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  privateBannerText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // Toolbar
  toolbar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    gap: 3,
  },

  // Tabs button
  tabsBtn: {
    width: 28,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 1,
  },
  tabsBtnText: { fontSize: 10, fontFamily: "Inter_700Bold", lineHeight: 12 },

  navBtns: { flexDirection: "row", gap: 1 },
  navBtn: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  addressBar: {
    flex: 1,
    height: 32,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  addressInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    height: 32,
    padding: 0,
  },
  addressDisplay: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },

  // Progress bar
  progressTrack: { height: 3 },
  progressFill: { height: 3 },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  warningText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  warningBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  warningBtnText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // AI toast
  aiToast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  aiToastText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  // WebView container
  webviewContainer: { flex: 1, backgroundColor: "#FFFFFF" },

  // Pull-to-refresh indicator
  pullIndicator: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 100, paddingTop: 10 },
  pullPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, elevation: 6 },
  pullText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#7B5CFF" },

  // Browser footer
  footer: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  footerBadge: {
    position: "absolute",
    top: 5,
    right: 6,
    minWidth: 13,
    height: 13,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  footerBadgeText: { fontSize: 7, fontFamily: "Inter_700Bold", color: "#fff" },

  // Blocked domain
  blockedScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  blockedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  blockedTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  blockedDomain: { fontSize: 14, fontFamily: "Inter_500Medium" },
  blockedBody: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 280 },
  blockedActions: { gap: 10, width: "100%", maxWidth: 280, marginTop: 8 },
  blockedBtnPrimary: {
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  blockedBtnPrimaryText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  blockedBtnSecondary: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  blockedBtnSecondaryText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  blockedBtnText: { paddingVertical: 8, alignItems: "center" },
  blockedBtnTextLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },

  // Bing warning modal
  bingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  bingModal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  bingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bingTitle: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  bingBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  bingActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 6,
  },
  bingBtnClose: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: "center",
  },
  bingBtnCloseText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bingBtnContinue: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  bingBtnContinueText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#000",
  },

});
