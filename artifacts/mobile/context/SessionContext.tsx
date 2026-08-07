import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/safeStorage";
import { generateId } from "@/lib/generateId";

export type SessionCapsule = {
  id: string;
  name: string;
  url: string;
  title: string;
  domain: string;
  notes: string;
  tags: string[];
  savedAt: string;
  favicon?: string;
  color?: string;
};

type SessionContextValue = {
  capsules: SessionCapsule[];
  saveCapsule: (url: string, title: string, notes?: string, name?: string) => SessionCapsule;
  deleteCapsule: (id: string) => void;
  updateCapsule: (id: string, changes: Partial<SessionCapsule>) => void;
  clearAll: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);
const KEY = "hwb_sessions_v2";

const CAPSULE_COLORS = ["#7B5CFF", "#FF4545", "#00D4A0", "#FFB020", "#4FC3F7", "#F06292"];

function getDomain(url: string): string {
  try {
    let h = new URL(url).hostname;
    if (h.startsWith("www.")) h = h.slice(4);
    return h;
  } catch { return url; }
}

function pickColor(): string {
  return CAPSULE_COLORS[Math.floor(Math.random() * CAPSULE_COLORS.length)];
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [capsules, setCapsules] = useState<SessionCapsule[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    safeGet<SessionCapsule[]>(KEY, []).then((stored) => {
      setCapsules(Array.isArray(stored) ? stored : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    safeSet(KEY, capsules);
  }, [capsules, loaded]);

  const saveCapsule = useCallback((url: string, title: string, notes = "", name = ""): SessionCapsule => {
    const domain = getDomain(url);
    const capsule: SessionCapsule = {
      id: generateId(),
      name: name || title || domain,
      url,
      title: title || url,
      domain,
      notes,
      tags: [],
      savedAt: new Date().toISOString(),
      color: pickColor(),
    };
    setCapsules((prev) => [capsule, ...prev]);
    return capsule;
  }, []);

  const deleteCapsule = useCallback((id: string) => {
    setCapsules((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCapsule = useCallback((id: string, changes: Partial<SessionCapsule>) => {
    setCapsules((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }, []);

  const clearAll = useCallback(() => setCapsules([]), []);

  const value = useMemo(() => ({
    capsules, saveCapsule, deleteCapsule, updateCapsule, clearAll,
  }), [capsules, saveCapsule, deleteCapsule, updateCapsule, clearAll]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSessions must be used inside SessionProvider");
  return ctx;
}
