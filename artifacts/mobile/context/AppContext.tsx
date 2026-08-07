import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { generateId } from "@/lib/generateId";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { canReport, recordReport } from "@/lib/reportLimits";
import { SEED_REPUTATIONS } from "@/lib/seedData";
import {
  DomainReputation,
  DomainRiskTier,
  ReportCategory,
  computeRiskScore,
  computeTier,
  emptyCategoryCounts,
} from "@/lib/riskScore";
import { safeGet, safeRemove, safeSet } from "@/lib/safeStorage";

export type { ReportCategory, DomainRiskTier, DomainReputation };
export type SearchEngine = "google_web" | "duckduckgo" | "brave";
export type ThemeMode = "dark" | "light" | "system";

export type Report = {
  id: string;
  domain: string;
  inputUrl: string;
  category: ReportCategory;
  note?: string;
  createdAt: string;
  reporterLocalId: string;
};

export type UserSettings = {
  defaultSearchEngine: SearchEngine;
  strictMode: boolean;
  openInNewTab: boolean;
  demoDataEnabled: boolean;
  theme: ThemeMode;
};

const DEFAULT_SETTINGS: UserSettings = {
  defaultSearchEngine: "google_web",
  strictMode: false,
  openInNewTab: true,
  demoDataEnabled: true,
  theme: "dark",
};

const KEYS = {
  settings: "hwb_settings_v1",
  reports: "hwb_reports_v1",
  blockedDomains: "hwb_blocked_domains_v1",
  trustedDomains: "hwb_trusted_domains_v1",
  waitlist: "hwb_waitlist_v1",
  reporterId: "hwb_reporter_id_v1",
} as const;

type AppContextValue = {
  isLoading: boolean;
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  reports: Report[];
  addReport: (params: {
    inputUrl: string;
    category: ReportCategory;
    note?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  blockedDomains: string[];
  addBlockedDomain: (domain: string) => Promise<void>;
  removeBlockedDomain: (domain: string) => Promise<void>;
  trustedDomains: string[];
  addTrustedDomain: (domain: string) => Promise<void>;
  removeTrustedDomain: (domain: string) => Promise<void>;
  waitlistEmails: string[];
  addWaitlistEmail: (email: string) => Promise<boolean>;
  reporterId: string;
  getDomainReputation: (domain: string) => DomainReputation;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => Promise<void>;
  totalWarnedDomains: number;
  aiHiddenCount: number;
  incrementAiHiddenCount: () => void;
};

export const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [reports, setReports] = useState<Report[]>([]);
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [trustedDomains, setTrustedDomains] = useState<string[]>([]);
  const [waitlistEmails, setWaitlistEmails] = useState<string[]>([]);
  const [reporterId, setReporterId] = useState<string>("");
  const [aiHiddenCount, setAiHiddenCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [s, r, bd, td, wl, rid, aic] = await Promise.all([
          safeGet<UserSettings>(KEYS.settings, DEFAULT_SETTINGS),
          safeGet<Report[]>(KEYS.reports, []),
          safeGet<string[]>(KEYS.blockedDomains, []),
          safeGet<string[]>(KEYS.trustedDomains, []),
          safeGet<string[]>(KEYS.waitlist, []),
          safeGet<string>(KEYS.reporterId, ""),
          safeGet<number>("hwb_ai_hidden_count_v1", 0),
        ]);

        setSettings({ ...DEFAULT_SETTINGS, ...s });
        setReports(Array.isArray(r) ? r : []);
        setBlockedDomains(Array.isArray(bd) ? bd : []);
        setTrustedDomains(Array.isArray(td) ? td : []);
        setWaitlistEmails(Array.isArray(wl) ? wl : []);

        setAiHiddenCount(typeof aic === "number" ? aic : 0);

        if (rid) {
          setReporterId(rid);
        } else {
          const newId = generateId();
          setReporterId(newId);
          await safeSet(KEYS.reporterId, newId);
        }
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const incrementAiHiddenCount = useCallback(() => {
    setAiHiddenCount((prev) => {
      const next = prev + 1;
      safeSet("hwb_ai_hidden_count_v1", next);
      return next;
    });
  }, []);

  const updateSettings = useCallback(async (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      safeSet(KEYS.settings, next);
      return next;
    });
  }, []);

  const addReport = useCallback(
    async (params: { inputUrl: string; category: ReportCategory; note?: string }) => {
      const domain = normalizeDomain(params.inputUrl);
      if (!domain) return { success: false, error: "Invalid domain or URL." };

      const check = await canReport(domain);
      if (!check.allowed) return { success: false, error: check.reason };

      const report: Report = {
        id: generateId(),
        domain,
        inputUrl: params.inputUrl.trim(),
        category: params.category,
        note: params.note?.trim(),
        createdAt: new Date().toISOString(),
        reporterLocalId: reporterId,
      };

      setReports((prev) => {
        const next = [report, ...prev];
        safeSet(KEYS.reports, next);
        return next;
      });

      await recordReport(domain);
      return { success: true };
    },
    [reporterId]
  );

  const addBlockedDomain = useCallback(async (domain: string) => {
    const normalized = normalizeDomain(domain) ?? domain.toLowerCase().trim();
    setBlockedDomains((prev) => {
      if (prev.includes(normalized)) return prev;
      const next = [normalized, ...prev];
      safeSet(KEYS.blockedDomains, next);
      return next;
    });
  }, []);

  const removeBlockedDomain = useCallback(async (domain: string) => {
    setBlockedDomains((prev) => {
      const next = prev.filter((d) => d !== domain);
      safeSet(KEYS.blockedDomains, next);
      return next;
    });
  }, []);

  const addTrustedDomain = useCallback(async (domain: string) => {
    const normalized = normalizeDomain(domain) ?? domain.toLowerCase().trim();
    setTrustedDomains((prev) => {
      if (prev.includes(normalized)) return prev;
      const next = [normalized, ...prev];
      safeSet(KEYS.trustedDomains, next);
      return next;
    });
  }, []);

  const removeTrustedDomain = useCallback(async (domain: string) => {
    setTrustedDomains((prev) => {
      const next = prev.filter((d) => d !== domain);
      safeSet(KEYS.trustedDomains, next);
      return next;
    });
  }, []);

  const addWaitlistEmail = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) return false;
    setWaitlistEmails((prev) => {
      if (prev.includes(trimmed)) return prev;
      const next = [trimmed, ...prev];
      safeSet(KEYS.waitlist, next);
      return next;
    });
    return true;
  }, []);

  const getDomainReputation = useCallback(
    (domain: string): DomainReputation => {
      const localReports = reports.filter((r) => r.domain === domain);
      const seedRep = settings.demoDataEnabled
        ? SEED_REPUTATIONS.find((r) => r.domain === domain)
        : undefined;

      const counts = emptyCategoryCounts();

      if (seedRep) {
        for (const cat of Object.keys(seedRep.categoryCounts) as ReportCategory[]) {
          counts[cat] = seedRep.categoryCounts[cat];
        }
      }

      for (const r of localReports) {
        if (r.category in counts) {
          counts[r.category as ReportCategory] += 1;
        }
      }

      const totalReports =
        Object.values(counts).reduce((a, b) => a + b, 0);
      const riskScore = computeRiskScore(counts);
      const tier = computeTier(riskScore, totalReports);

      const seedUnique = seedRep?.uniqueReporterEstimate ?? 0;
      const localUnique = new Set(localReports.map((r) => r.reporterLocalId)).size;
      const uniqueReporterEstimate = seedUnique + localUnique;

      const allDates = [
        seedRep?.lastReportedAt,
        ...localReports.map((r) => r.createdAt),
      ].filter(Boolean) as string[];
      const lastReportedAt = allDates.length > 0
        ? allDates.sort().reverse()[0]
        : undefined;

      return {
        domain,
        totalReports,
        uniqueReporterEstimate,
        riskScore,
        tier,
        categoryCounts: counts,
        lastReportedAt,
      };
    },
    [reports, settings.demoDataEnabled]
  );

  const exportData = useCallback((): string => {
    return JSON.stringify({
      version: 1,
      settings,
      reports,
      blockedDomains,
      trustedDomains,
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }, [settings, reports, blockedDomains, trustedDomains]);

  const importData = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json);
      if (!data || typeof data !== "object") return false;

      if (data.settings && typeof data.settings === "object") {
        const imported = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(imported);
        safeSet(KEYS.settings, imported);
      }
      if (Array.isArray(data.reports)) {
        setReports(data.reports);
        safeSet(KEYS.reports, data.reports);
      }
      if (Array.isArray(data.blockedDomains)) {
        setBlockedDomains(data.blockedDomains);
        safeSet(KEYS.blockedDomains, data.blockedDomains);
      }
      if (Array.isArray(data.trustedDomains)) {
        setTrustedDomains(data.trustedDomains);
        safeSet(KEYS.trustedDomains, data.trustedDomains);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  const resetData = useCallback(async () => {
    setSettings(DEFAULT_SETTINGS);
    setReports([]);
    setBlockedDomains([]);
    setTrustedDomains([]);
    setWaitlistEmails([]);
    await Promise.all([
      safeSet(KEYS.settings, DEFAULT_SETTINGS),
      safeSet(KEYS.reports, []),
      safeSet(KEYS.blockedDomains, []),
      safeSet(KEYS.trustedDomains, []),
      safeSet(KEYS.waitlist, []),
    ]);
  }, []);

  const totalWarnedDomains = React.useMemo(() => {
    const domains = new Set([
      ...reports.map((r) => r.domain),
      ...(settings.demoDataEnabled ? SEED_REPUTATIONS.map((r) => r.domain) : []),
    ]);
    return domains.size;
  }, [reports, settings.demoDataEnabled]);

  const value: AppContextValue = {
    isLoading,
    settings,
    updateSettings,
    reports,
    addReport,
    blockedDomains,
    addBlockedDomain,
    removeBlockedDomain,
    trustedDomains,
    addTrustedDomain,
    removeTrustedDomain,
    waitlistEmails,
    addWaitlistEmail,
    reporterId,
    getDomainReputation,
    exportData,
    importData,
    resetData,
    totalWarnedDomains,
    aiHiddenCount,
    incrementAiHiddenCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
