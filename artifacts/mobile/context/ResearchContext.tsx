import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { generateId } from "@/lib/generateId";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { safeGet, safeSet } from "@/lib/safeStorage";

export type ResearchTag = "useful" | "suspicious" | "official" | "forum" | "article";

export const RESEARCH_TAG_LABELS: Record<ResearchTag, string> = {
  useful: "Useful",
  suspicious: "Suspicious",
  official: "Official",
  forum: "Forum",
  article: "Article",
};

export const RESEARCH_TAG_COLORS: Record<ResearchTag, string> = {
  useful: "#81c995",
  suspicious: "#f28b82",
  official: "#8ab4f8",
  forum: "#fdd663",
  article: "#c58af9",
};

export type ResearchSource = {
  id: string;
  url: string;
  title: string;
  domain: string;
  note: string;
  tag: ResearchTag;
  createdAt: string;
};

type ResearchContextValue = {
  sources: ResearchSource[];
  addSource: (data: Omit<ResearchSource, "id" | "createdAt">) => void;
  removeSource: (id: string) => void;
  updateSource: (id: string, updates: Partial<ResearchSource>) => void;
  importSources: (data: ResearchSource[]) => void;
};

const ResearchContext = createContext<ResearchContextValue | null>(null);
const KEY = "hwb_research_v1";

export function ResearchProvider({ children }: { children: React.ReactNode }) {
  const [sources, setSources] = useState<ResearchSource[]>([]);

  useEffect(() => {
    safeGet<ResearchSource[]>(KEY, []).then((data) => {
      setSources(Array.isArray(data) ? data : []);
    });
  }, []);

  const addSource = useCallback((data: Omit<ResearchSource, "id" | "createdAt">) => {
    if (!data.url) return;
    const source: ResearchSource = {
      ...data,
      id: generateId(),
      domain: data.domain || (normalizeDomain(data.url) ?? ""),
      createdAt: new Date().toISOString(),
    };
    setSources((prev) => {
      const next = [source, ...prev];
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const removeSource = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id);
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const updateSource = useCallback((id: string, updates: Partial<ResearchSource>) => {
    setSources((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...updates } : s));
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const importSources = useCallback((data: ResearchSource[]) => {
    if (!Array.isArray(data)) return;
    setSources(data);
    safeSet(KEY, data);
  }, []);

  return (
    <ResearchContext.Provider value={{ sources, addSource, removeSource, updateSource, importSources }}>
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch() {
  const ctx = useContext(ResearchContext);
  if (!ctx) throw new Error("useResearch must be used within ResearchProvider");
  return ctx;
}
