import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type ScanResult = {
  url: string;
  domain: string;
  protocol: string;
  isHTTPS: boolean;
  tld: string;
  domainAge: string;
  flags: ScanFlag[];
  score: number;
  verdict: "safe" | "caution" | "suspicious" | "dangerous";
};

type ScanFlag = {
  label: string;
  desc: string;
  level: "ok" | "warn" | "danger" | "info";
  icon: string;
};

const KNOWN_SUSPICIOUS_TLDS = [".tk", ".ml", ".ga", ".cf", ".gq", ".xyz", ".click", ".download", ".stream"];
const KNOWN_SAFE_TLDS = [".gov", ".edu", ".org"];
const SUSPICIOUS_KEYWORDS = ["login-", "secure-", "verify-", "account-", "update-", "banking-", "paypal-", "amazon-", "apple-", "microsoft-"];
const SHORTENER_DOMAINS = ["bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "short.io", "rb.gy", "is.gd"];
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

function analyzeDomain(url: string): ScanResult | null {
  let parsed: URL;
  let rawUrl = url.trim();
  if (!rawUrl.startsWith("http://") && !rawUrl.startsWith("https://")) {
    rawUrl = "https://" + rawUrl;
  }
  try { parsed = new URL(rawUrl); } catch { return null; }

  const domain = parsed.hostname.replace(/^www\./, "");
  const tld = "." + domain.split(".").slice(-1)[0];
  const isHTTPS = parsed.protocol === "https:";
  const protocol = parsed.protocol;
  const flags: ScanFlag[] = [];
  let score = 100;

  // HTTPS check
  if (!isHTTPS) {
    flags.push({ label: "No HTTPS", desc: "Connection is not encrypted", level: "warn", icon: "unlock" });
    score -= 20;
  } else {
    flags.push({ label: "HTTPS Secure", desc: "Connection is encrypted", level: "ok", icon: "lock" });
  }

  // IP address hostname
  if (IP_REGEX.test(domain)) {
    flags.push({ label: "IP Address URL", desc: "Using raw IP instead of domain name — common in phishing", level: "danger", icon: "alert-triangle" });
    score -= 35;
  }

  // Suspicious TLD
  if (KNOWN_SUSPICIOUS_TLDS.some((t) => domain.endsWith(t))) {
    flags.push({ label: "High-Risk TLD", desc: `The "${tld}" domain extension is frequently used in spam and scams`, level: "warn", icon: "flag" });
    score -= 20;
  }

  // Safe TLD
  if (KNOWN_SAFE_TLDS.some((t) => domain.endsWith(t))) {
    flags.push({ label: "Trusted TLD", desc: "Government or educational domain", level: "ok", icon: "check-circle" });
    score += 5;
  }

  // URL shortener
  if (SHORTENER_DOMAINS.some((d) => domain === d || domain.endsWith("." + d))) {
    flags.push({ label: "URL Shortener", desc: "Destination is hidden — could lead anywhere", level: "warn", icon: "link" });
    score -= 10;
  }

  // Suspicious keywords in domain
  const suspiciousMatch = SUSPICIOUS_KEYWORDS.find((k) => domain.toLowerCase().includes(k));
  if (suspiciousMatch) {
    flags.push({ label: "Suspicious Keywords", desc: `Domain contains "${suspiciousMatch}" — common phishing pattern`, level: "danger", icon: "alert-octagon" });
    score -= 30;
  }

  // Long domain (possible confusion attack)
  if (domain.length > 40) {
    flags.push({ label: "Unusually Long Domain", desc: "Long domains are sometimes used to confuse users", level: "warn", icon: "eye" });
    score -= 10;
  }

  // Subdomain depth
  const subdomains = domain.split(".").length - 2;
  if (subdomains > 3) {
    flags.push({ label: "Deep Subdomain", desc: `${subdomains} subdomain levels — can be used to fake trusted brands`, level: "warn", icon: "layers" });
    score -= 15;
  }

  // Multiple hyphens
  const hyphens = (domain.match(/-/g) ?? []).length;
  if (hyphens >= 3) {
    flags.push({ label: "Multiple Hyphens", desc: "Heavily hyphenated domains are common in phishing", level: "warn", icon: "minus" });
    score -= 10;
  }

  // Path length (long paths often mean tracking params)
  if (parsed.search.length > 200) {
    flags.push({ label: "Long Query String", desc: "Contains many tracking or fingerprinting parameters", level: "info", icon: "tag" });
  }

  // Redirect params
  const searchLower = parsed.search.toLowerCase();
  if (searchLower.includes("redirect=") || searchLower.includes("url=") || searchLower.includes("goto=")) {
    flags.push({ label: "Redirect Parameter", desc: "URL contains a redirect — may chain to a different destination", level: "warn", icon: "corner-up-right" });
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  const verdict: ScanResult["verdict"] =
    score >= 80 ? "safe" : score >= 60 ? "caution" : score >= 40 ? "suspicious" : "dangerous";

  return {
    url: rawUrl,
    domain,
    protocol,
    isHTTPS,
    tld,
    domainAge: "Unknown (no API)",
    flags,
    score,
    verdict,
  };
}

const VERDICT_META = {
  safe: { label: "Safe", color: "#00D4A0", icon: "shield" },
  caution: { label: "Caution", color: "#FFB020", icon: "alert-circle" },
  suspicious: { label: "Suspicious", color: "#FF9500", icon: "alert-triangle" },
  dangerous: { label: "Dangerous", color: "#FF4545", icon: "alert-octagon" },
};

const FLAG_COLORS = {
  ok: "#00D4A0",
  warn: "#FFB020",
  danger: "#FF4545",
  info: "#7B5CFF",
};

export default function ScannerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  function handleScan() {
    const v = input.trim();
    if (!v) return;
    setError("");
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      const r = analyzeDomain(v);
      if (!r) {
        setError("Invalid URL — please enter a valid web address");
      } else {
        setResult(r);
      }
      setScanning(false);
    }, 600);
  }

  async function handlePaste() {
    const text = await Clipboard.getStringAsync();
    if (text) setInput(text.trim());
  }

  const verdictMeta = result ? VERDICT_META[result.verdict] : null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, backgroundColor: colors.toolbar, borderBottomColor: colors.border }]}>
        <Pressable hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={[styles.title, { color: colors.foreground }]}>Link Scanner</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Analyze URLs for threats</Text>
        </View>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={{ padding: 16, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Input */}
        <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>URL to scan</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, color: colors.foreground }]}
              value={input}
              onChangeText={setInput}
              placeholder="https://example.com or paste any link"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleScan}
            />
            <Pressable style={[styles.pasteBtn, { backgroundColor: colors.muted }]} onPress={handlePaste}>
              <Feather name="clipboard" size={15} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}
          <Pressable
            style={[styles.scanBtn, { backgroundColor: colors.primary, opacity: !input.trim() ? 0.5 : 1 }]}
            onPress={handleScan}
            disabled={!input.trim()}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="search" size={16} color="#fff" />
                <Text style={styles.scanBtnText}>Analyze Link</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Result */}
        {result && verdictMeta && (
          <>
            {/* Score card */}
            <View style={[styles.scoreCard, { backgroundColor: verdictMeta.color + "15", borderColor: verdictMeta.color + "40" }]}>
              <View style={styles.scoreLeft}>
                <Feather name={verdictMeta.icon as any} size={36} color={verdictMeta.color} />
                <View style={styles.scoreInfo}>
                  <Text style={[styles.verdictLabel, { color: verdictMeta.color }]}>{verdictMeta.label}</Text>
                  <Text style={[styles.domainText, { color: colors.foreground }]}>{result.domain}</Text>
                  <Text style={[styles.protocolText, { color: colors.mutedForeground }]}>{result.protocol.replace(":", "").toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.scoreCircle}>
                <Text style={[styles.scoreNum, { color: verdictMeta.color }]}>{result.score}</Text>
                <Text style={[styles.scoreMax, { color: colors.mutedForeground }]}>/100</Text>
              </View>
            </View>

            {/* URL full display */}
            <Pressable
              style={[styles.urlCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Clipboard.setStringAsync(result.url)}
            >
              <Text style={[styles.urlLabel, { color: colors.mutedForeground }]}>Full URL (tap to copy)</Text>
              <Text style={[styles.urlText, { color: colors.foreground }]} selectable>{result.url}</Text>
            </Pressable>

            {/* Flags */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Analysis Results</Text>
            <View style={[styles.flagsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {result.flags.map((flag, i) => (
                <React.Fragment key={i}>
                  <View style={styles.flagRow}>
                    <View style={[styles.flagIcon, { backgroundColor: FLAG_COLORS[flag.level] + "20" }]}>
                      <Feather name={flag.icon as any} size={14} color={FLAG_COLORS[flag.level]} />
                    </View>
                    <View style={styles.flagText}>
                      <Text style={[styles.flagLabel, { color: colors.foreground }]}>{flag.label}</Text>
                      <Text style={[styles.flagDesc, { color: colors.mutedForeground }]}>{flag.desc}</Text>
                    </View>
                    <View style={[styles.flagLevel, { backgroundColor: FLAG_COLORS[flag.level] + "20" }]}>
                      <Text style={[styles.flagLevelText, { color: FLAG_COLORS[flag.level] }]}>
                        {flag.level.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  {i < result.flags.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
                </React.Fragment>
              ))}
            </View>

            {/* Open in browser */}
            <Pressable
              style={[styles.openBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Linking.openURL(result.url).catch(() => {})}
            >
              <Feather name="external-link" size={15} color={colors.primary} />
              <Text style={[styles.openBtnText, { color: colors.primary }]}>Open Link in Browser</Text>
            </Pressable>

            <View style={[styles.disclaimer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                Analysis is based on URL structure and heuristics only. No external lookups are performed. Always use judgment before opening unknown links.
              </Text>
            </View>
          </>
        )}

        {/* Tips when empty */}
        {!result && !scanning && (
          <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.tipsTitle, { color: colors.foreground }]}>What we check</Text>
            {[
              { icon: "lock", text: "HTTPS encryption status" },
              { icon: "flag", text: "High-risk domain extensions (TLDs)" },
              { icon: "alert-triangle", text: "Known phishing keyword patterns" },
              { icon: "link", text: "URL shorteners that hide destinations" },
              { icon: "layers", text: "Suspicious subdomain structures" },
              { icon: "corner-up-right", text: "Hidden redirect parameters" },
            ].map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Feather name={tip.icon as any} size={14} color={colors.primary} />
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
  inputCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10, marginBottom: 14 },
  inputLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow: { flexDirection: "row", gap: 8 },
  textInput: {
    flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
  },
  pasteBtn: { paddingHorizontal: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  scanBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 13, borderRadius: 13,
  },
  scanBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  scoreCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 16, borderWidth: 1.5, padding: 16,
    marginBottom: 12, justifyContent: "space-between",
  },
  scoreLeft: { flexDirection: "row", alignItems: "center", gap: 14 },
  scoreInfo: { gap: 3 },
  verdictLabel: { fontSize: 18, fontFamily: "Inter_700Bold" },
  domainText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  protocolText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  scoreCircle: { alignItems: "center" },
  scoreNum: { fontSize: 36, fontFamily: "Inter_700Bold", lineHeight: 40 },
  scoreMax: { fontSize: 11, fontFamily: "Inter_500Medium" },
  urlCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14, gap: 4 },
  urlLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  sectionLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase",
    letterSpacing: 1.2, marginBottom: 6, marginLeft: 2,
  },
  flagsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden", marginBottom: 12 },
  flagRow: { flexDirection: "row", alignItems: "flex-start", padding: 13, gap: 10 },
  flagIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  flagText: { flex: 1, gap: 2 },
  flagLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  flagDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  flagLevel: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  flagLevelText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 55 },
  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12,
  },
  openBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  disclaimer: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  disclaimerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 17 },
  tipsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  tipsTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
