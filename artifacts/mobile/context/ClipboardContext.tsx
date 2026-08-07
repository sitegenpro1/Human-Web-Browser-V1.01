import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/safeStorage";
import { generateId } from "@/lib/generateId";

export type ClipboardEntry = {
  id: string;
  text: string;
  sourceUrl: string;
  sourceDomain: string;
  copiedAt: string;
  label?: string;
};

type ClipboardContextValue = {
  history: ClipboardEntry[];
  addEntry: (text: string, sourceUrl: string, label?: string) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  pinnedIds: string[];
  togglePin: (id: string) => void;
};

const ClipboardContext = createContext<ClipboardContextValue | null>(null);
const KEY = "hwb_clipboard_v1";
const MAX_ENTRIES = 50;

function getDomain(url: string): string {
  try {
    let h = new URL(url).hostname;
    if (h.startsWith("www.")) h = h.slice(4);
    return h;
  } catch { return url || "unknown"; }
}

export function ClipboardProvider({ children }: { children: React.ReactNode }) {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    safeGet<{ history: ClipboardEntry[]; pinned: string[] } | null>(KEY, null).then((stored) => {
      if (stored) {
        setHistory(Array.isArray(stored.history) ? stored.history : []);
        setPinnedIds(Array.isArray(stored.pinned) ? stored.pinned : []);
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    safeSet(KEY, { history, pinned: pinnedIds });
  }, [history, pinnedIds, loaded]);

  const addEntry = useCallback((text: string, sourceUrl: string, label?: string) => {
    if (!text?.trim()) return;
    const entry: ClipboardEntry = {
      id: generateId(),
      text: text.slice(0, 2000),
      sourceUrl,
      sourceDomain: getDomain(sourceUrl),
      copiedAt: new Date().toISOString(),
      label,
    };
    setHistory((prev) => {
      const filtered = prev.filter((e) => e.text !== text);
      return [entry, ...filtered].slice(0, MAX_ENTRIES);
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
    setPinnedIds((prev) => prev.filter((p) => p !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory((prev) => prev.filter((e) => pinnedIds.includes(e.id)));
  }, [pinnedIds]);

  const togglePin = useCallback((id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }, []);

  const value = useMemo(() => ({
    history, addEntry, removeEntry, clearHistory, pinnedIds, togglePin,
  }), [history, addEntry, removeEntry, clearHistory, pinnedIds, togglePin]);

  return <ClipboardContext.Provider value={value}>{children}</ClipboardContext.Provider>;
}

export function useClipboard() {
  const ctx = useContext(ClipboardContext);
  if (!ctx) throw new Error("useClipboard must be used inside ClipboardProvider");
  return ctx;
}
