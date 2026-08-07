import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { generateId } from "@/lib/generateId";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { safeGet, safeSet } from "@/lib/safeStorage";

export type HistoryEntry = {
  id: string;
  url: string;
  title: string;
  domain: string;
  visitedAt: string;
};

type HistoryContextValue = {
  history: HistoryEntry[];
  addHistoryEntry: (url: string, title: string) => void;
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
  isPrivateMode: boolean;
  togglePrivateMode: () => void;
  importHistory: (data: HistoryEntry[]) => void;
  pendingNavUrl: string | null;
  setPendingNavUrl: (url: string | null) => void;
};

const HistoryContext = createContext<HistoryContextValue | null>(null);
const KEY = "hwb_history_v1";
const PRIVATE_KEY = "hwb_private_mode_v1";
const MAX_ENTRIES = 500;

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      safeGet<HistoryEntry[]>(KEY, []),
      safeGet<boolean>(PRIVATE_KEY, false),
    ]).then(([h, priv]) => {
      setHistory(Array.isArray(h) ? h : []);
      setIsPrivateMode(Boolean(priv));
      setLoaded(true);
    });
  }, []);

  const addHistoryEntry = useCallback(
    (url: string, title: string) => {
      if (!loaded || isPrivateMode || !url) return;
      const domain = normalizeDomain(url) ?? "";
      const entry: HistoryEntry = {
        id: generateId(),
        url,
        title: title || domain || url,
        domain,
        visitedAt: new Date().toISOString(),
      };
      setHistory((prev) => {
        if (prev.length > 0 && prev[0].url === url) return prev;
        const trimmed = prev.slice(0, MAX_ENTRIES - 1);
        const next = [entry, ...trimmed];
        safeSet(KEY, next);
        return next;
      });
    },
    [loaded, isPrivateMode]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    safeSet(KEY, []);
  }, []);

  const removeHistoryEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const next = prev.filter((e) => e.id !== id);
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const togglePrivateMode = useCallback(() => {
    setIsPrivateMode((prev) => {
      const next = !prev;
      safeSet(PRIVATE_KEY, next);
      return next;
    });
  }, []);

  const importHistory = useCallback((data: HistoryEntry[]) => {
    if (!Array.isArray(data)) return;
    setHistory(data);
    safeSet(KEY, data);
  }, []);

  return (
    <HistoryContext.Provider
      value={{
        history,
        addHistoryEntry,
        clearHistory,
        removeHistoryEntry,
        isPrivateMode,
        togglePrivateMode,
        importHistory,
        pendingNavUrl,
        setPendingNavUrl,
      }}
    >
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within HistoryProvider");
  return ctx;
}
