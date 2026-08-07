import { Feather } from "@expo/vector-icons";
import React, { forwardRef, useEffect, useImperativeHandle } from "react";
import { StyleSheet, Text, View } from "react-native";

export type BrowserViewHandle = {
  goBack: () => void;
  goForward: () => void;
  reload: () => void;
  stopLoading: () => void;
  injectScript: (script: string) => void;
};

export type BrowserError = {
  description: string;
  code: number;
  url: string;
};

type Props = {
  url: string;
  forceDarkMode?: boolean;
  onUrlChange?: (url: string) => void;
  onTitleChange?: (title: string) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onLoadProgress?: (progress: number) => void;
  onCanGoBack?: (can: boolean) => void;
  onCanGoForward?: (can: boolean) => void;
  onNavigationRequest?: (url: string) => void;
  onError?: (err: BrowserError) => void;
  onAiHideResult?: (success: boolean) => void;
  onTextSelection?: (text: string) => void;
  onScrollAtTop?: (atTop: boolean) => void;
  onPullGesture?: (type: string, dy: number) => void;
  onPopupBlocked?: () => void;
  onDownloadRequest?: (url: string, filename: string) => void;
  onPermissionRequest?: (req: {
    origin: string;
    resources: string[];
    grant: () => void;
    deny: () => void;
  }) => void;
  popupBlockEnabled?: boolean;
  customUserAgent?: string;
  firewallCheck?: (url: string) => boolean;
  extraInjectedJS?: string;
};

// Web platform stub — real browsing runs on Android via react-native-webview.
// This view shows what would be loaded on the device.
export const BrowserView = forwardRef<BrowserViewHandle, Props>((props, ref) => {
  const { url, forceDarkMode, onLoadStart, onLoadEnd } = props;

  useImperativeHandle(ref, () => ({
    goBack: () => {},
    goForward: () => {},
    reload: () => {},
    stopLoading: () => {},
    injectScript: (_script: string) => {},
  }));

  useEffect(() => {
    onLoadStart?.();
    const t = setTimeout(() => onLoadEnd?.(), 400);
    return () => clearTimeout(t);
  }, [url]);

  const isGoogle = /google\./i.test(url);

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Feather name="smartphone" size={36} color="#8ab4f8" />
      </View>

      <Text style={styles.heading}>Android WebView</Text>

      <Text style={styles.body}>
        Human Web Browser is a native Android app built with React Native + Expo.
        {"\n\n"}
        On Android (Expo Go or APK), this area shows the real website inside a full WebView — no iframe, no restrictions.
      </Text>

      <View style={styles.urlPill}>
        <Feather name="globe" size={11} color="#9aa0a6" />
        <Text style={styles.urlText} numberOfLines={2}>{url}</Text>
      </View>

      {forceDarkMode && (
        <View style={styles.featureBadge}>
          <Feather name="moon" size={11} color="#c58af9" />
          <Text style={[styles.featureBadgeText, { color: "#c58af9" }]}>Force Dark Mode active</Text>
        </View>
      )}

      <View style={styles.featureList}>
        {isGoogle ? (
          <>
            <FeatureRow icon="check-circle" text="Google Web Mode (udm=14) enforced — no AI Overview" color="#00D4A0" />
            <FeatureRow icon="check-circle" text="CSS+JS AI element hiding injected on load" color="#00D4A0" />
          </>
        ) : /duckduckgo\.com/i.test(url) ? (
          <>
            <FeatureRow icon="check-circle" text="noai.duckduckgo.com — official AI-free subdomain" color="#00D4A0" />
            <FeatureRow icon="check-circle" text="kae=-1 parameter disables AI answers" color="#00D4A0" />
          </>
        ) : /search\.brave\.com/i.test(url) ? (
          <>
            <FeatureRow icon="check-circle" text="summary=0 disables Brave AI Summary" color="#00D4A0" />
            <FeatureRow icon="check-circle" text="JS injected to hide AI answer elements" color="#00D4A0" />
          </>
        ) : null}
        <FeatureRow icon="shield" text="Domain reputation checked before load" color="#7B5CFF" />
        <FeatureRow icon="zap" text="Run on Android for the full experience" color="#5A5A78" />
      </View>
    </View>
  );
});

function FeatureRow({ icon, text, color }: { icon: any; text: string; color: string }) {
  return (
    <View style={styles.featureRow}>
      <Feather name={icon} size={13} color={color} />
      <Text style={[styles.featureText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1c",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  icon: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: "#8ab4f8" + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heading: {
    color: "#e8eaed",
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  body: {
    color: "#9aa0a6",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 310,
  },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2c2c2e",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    maxWidth: "100%",
  },
  urlText: {
    color: "#8ab4f8",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  featureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#c58af9" + "18",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  featureBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  featureList: { gap: 8, alignSelf: "stretch", marginTop: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
});
