import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/safeStorage";
import { useEffect } from "react";

export type FirewallCategory = "ads" | "trackers" | "social" | "malware" | "adult";
export type FirewallRuleAction = "block" | "allow";

export type FirewallRule = {
  id: string;
  pattern: string;
  action: FirewallRuleAction;
  note?: string;
  createdAt: string;
};

type FirewallContextValue = {
  enabled: boolean;
  categories: Record<FirewallCategory, boolean>;
  rules: FirewallRule[];
  blockedCount: number;
  toggleEnabled: () => void;
  toggleCategory: (cat: FirewallCategory) => void;
  addRule: (pattern: string, action: FirewallRuleAction, note?: string) => void;
  removeRule: (id: string) => void;
  shouldBlock: (url: string) => boolean;
  resetBlockedCount: () => void;
};

const FirewallContext = createContext<FirewallContextValue | null>(null);
const KEY = "hwb_firewall_v1";
const COUNT_KEY = "hwb_firewall_count_v1";

const AD_PATTERNS = [
  "doubleclick.net", "googlesyndication.com", "googleadservices.com",
  "pagead2.googlesyndication.com", "amazon-adsystem.com",
  "ads.yahoo.com", "media.net", "outbrain.com", "taboola.com",
  "revcontent.com", "criteo.com", "criteo.net", "adnxs.com",
  "rubiconproject.com", "pubmatic.com", "openx.net", "adroll.com",
  "mgid.com", "sharethrough.com", "triplelift.com", "spotxchange.com",
];

const TRACKER_PATTERNS = [
  "google-analytics.com", "analytics.google.com",
  "googletagmanager.com", "googletagservices.com",
  "connect.facebook.net", "hotjar.com", "segment.io", "segment.com",
  "mixpanel.com", "amplitude.com", "heap.io", "heapanalytics.com",
  "fullstory.com", "logrocket.com", "mouseflow.com", "luckyorange.com",
  "clarity.ms", "chartbeat.com", "parsely.com",
  "scorecardresearch.com", "quantserve.com", "mc.yandex.ru",
];

const SOCIAL_PATTERNS = [
  "platform.twitter.com", "platform.linkedin.com",
  "connect.facebook.com", "staticxx.facebook.com",
  "instagram.com/widget", "pinterest.com/pinit",
  "disqus.com", "disquscdn.com",
];

const MALWARE_PATTERNS = [
  "malware.wicar.org", "eicar.org",
  "clickjacking.net", "phishing-test.com",
];

const ADULT_PATTERNS: string[] = [];

const CATEGORY_PATTERNS: Record<FirewallCategory, string[]> = {
  ads: AD_PATTERNS,
  trackers: TRACKER_PATTERNS,
  social: SOCIAL_PATTERNS,
  malware: MALWARE_PATTERNS,
  adult: ADULT_PATTERNS,
};

function matchesPattern(url: string, pattern: string): boolean {
  try {
    const lower = url.toLowerCase();
    const pat = pattern.toLowerCase().trim();
    if (!pat) return false;
    if (pat.startsWith("/") && pat.endsWith("/")) {
      try { return new RegExp(pat.slice(1, -1)).test(lower); } catch { return false; }
    }
    return lower.includes(pat);
  } catch { return false; }
}

type StoredState = {
  enabled: boolean;
  categories: Record<FirewallCategory, boolean>;
  rules: FirewallRule[];
};

export function FirewallProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [categories, setCategories] = useState<Record<FirewallCategory, boolean>>({
    ads: true, trackers: true, social: false, malware: true, adult: false,
  });
  const [rules, setRules] = useState<FirewallRule[]>([]);
  const [blockedCount, setBlockedCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      safeGet<StoredState | null>(KEY, null),
      safeGet<number>(COUNT_KEY, 0),
    ]).then(([stored, count]) => {
      if (stored) {
        setEnabled(stored.enabled ?? false);
        setCategories((prev) => ({ ...prev, ...(stored.categories ?? {}) }));
        setRules(Array.isArray(stored.rules) ? stored.rules : []);
      }
      setBlockedCount(typeof count === "number" ? count : 0);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    safeSet(KEY, { enabled, categories, rules });
  }, [enabled, categories, rules, loaded]);

  const toggleEnabled = useCallback(() => setEnabled((v) => !v), []);

  const toggleCategory = useCallback((cat: FirewallCategory) => {
    setCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const addRule = useCallback((pattern: string, action: FirewallRuleAction, note?: string) => {
    const rule: FirewallRule = {
      id: Date.now().toString(36),
      pattern: pattern.trim(),
      action,
      note,
      createdAt: new Date().toISOString(),
    };
    setRules((prev) => [rule, ...prev]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const resetBlockedCount = useCallback(() => {
    setBlockedCount(0);
    safeSet(COUNT_KEY, 0);
  }, []);

  const shouldBlock = useCallback((url: string): boolean => {
    if (!enabled) return false;
    const lower = url.toLowerCase();

    // Custom allow rules override everything
    for (const rule of rules) {
      if (rule.action === "allow" && matchesPattern(lower, rule.pattern)) return false;
    }

    // Custom block rules
    for (const rule of rules) {
      if (rule.action === "block" && matchesPattern(lower, rule.pattern)) {
        setBlockedCount((c) => {
          const newCount = c + 1;
          safeSet(COUNT_KEY, newCount);
          return newCount;
        });
        return true;
      }
    }

    // Category-based blocking
    for (const [cat, patterns] of Object.entries(CATEGORY_PATTERNS) as [FirewallCategory, string[]][]) {
      if (!categories[cat]) continue;
      for (const pattern of patterns) {
        if (matchesPattern(lower, pattern)) {
          setBlockedCount((c) => {
            const newCount = c + 1;
            safeSet(COUNT_KEY, newCount);
            return newCount;
          });
          return true;
        }
      }
    }

    return false;
  }, [enabled, categories, rules]);

  const value = useMemo(() => ({
    enabled, categories, rules, blockedCount,
    toggleEnabled, toggleCategory, addRule, removeRule, shouldBlock, resetBlockedCount,
  }), [enabled, categories, rules, blockedCount, toggleEnabled, toggleCategory, addRule, removeRule, shouldBlock, resetBlockedCount]);

  return <FirewallContext.Provider value={value}>{children}</FirewallContext.Provider>;
}

export function useFirewall() {
  const ctx = useContext(FirewallContext);
  if (!ctx) throw new Error("useFirewall must be used inside FirewallProvider");
  return ctx;
}

export const FIREWALL_CATEGORY_META: Record<FirewallCategory, { label: string; desc: string; icon: string; color: string }> = {
  ads: { label: "Advertisements", desc: "Banner ads, sponsored content, ad networks", icon: "slash", color: "#FF4545" },
  trackers: { label: "Trackers & Analytics", desc: "User tracking, heatmaps, session recording", icon: "activity", color: "#FF9500" },
  social: { label: "Social Widgets", desc: "Like buttons, share widgets, comment systems", icon: "share-2", color: "#7B5CFF" },
  malware: { label: "Malware & Phishing", desc: "Known malicious and phishing domains", icon: "alert-triangle", color: "#FF4545" },
  adult: { label: "Adult Content", desc: "Block adult content domains", icon: "eye-off", color: "#5A5A78" },
};
