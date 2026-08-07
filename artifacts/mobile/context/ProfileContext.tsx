import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/safeStorage";
import { generateId } from "@/lib/generateId";

export type BurnerProfile = {
  id: string;
  name: string;
  color: string;
  userAgent: string;
  createdAt: string;
  expiresAt?: string;
  note?: string;
  isBuiltIn?: boolean;
};

type ProfileContextValue = {
  profiles: BurnerProfile[];
  activeProfileId: string | null;
  activeProfile: BurnerProfile | null;
  createProfile: (name: string, userAgent: string, color: string, expiresInMin?: number) => void;
  deleteProfile: (id: string) => void;
  activateProfile: (id: string | null) => void;
  updateProfile: (id: string, changes: Partial<BurnerProfile>) => void;
  getEffectiveUA: () => string;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);
const KEY = "hwb_profiles_v1";
const ACTIVE_KEY = "hwb_active_profile_v1";

export const UA_PRESETS: Array<{ label: string; ua: string; icon: string }> = [
  {
    label: "Mobile Chrome (Android)",
    ua: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    icon: "smartphone",
  },
  {
    label: "Desktop Chrome",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    icon: "monitor",
  },
  {
    label: "Firefox Desktop",
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    icon: "globe",
  },
  {
    label: "Safari iPhone",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    icon: "smartphone",
  },
  {
    label: "Safari iPad",
    ua: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    icon: "tablet",
  },
  {
    label: "Anonymous (Legacy)",
    ua: "Mozilla/5.0 (compatible; Generic/1.0)",
    icon: "user-x",
  },
];

const DEFAULT_UA = UA_PRESETS[0].ua;

const PROFILE_COLORS = ["#7B5CFF", "#FF4545", "#00D4A0", "#FFB020", "#4FC3F7", "#F06292", "#AED581"];

export const BUILT_IN_PROFILES: BurnerProfile[] = [
  {
    id: "builtin-desktop",
    name: "Desktop Mode",
    color: "#4FC3F7",
    userAgent: UA_PRESETS[1].ua,
    createdAt: "builtin",
    isBuiltIn: true,
    note: "Pretend to be a desktop browser",
  },
  {
    id: "builtin-anon",
    name: "Anonymous",
    color: "#5A5A78",
    userAgent: UA_PRESETS[5].ua,
    createdAt: "builtin",
    isBuiltIn: true,
    note: "Minimal browser fingerprint",
  },
];

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<BurnerProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      safeGet<BurnerProfile[]>(KEY, []),
      safeGet<string | null>(ACTIVE_KEY, null),
    ]).then(([stored, active]) => {
      setProfiles(Array.isArray(stored) ? stored : []);
      setActiveProfileId(active);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    safeSet(KEY, profiles);
  }, [profiles, loaded]);

  useEffect(() => {
    if (!loaded) return;
    safeSet(ACTIVE_KEY, activeProfileId);
  }, [activeProfileId, loaded]);

  const createProfile = useCallback((name: string, userAgent: string, color: string, expiresInMin?: number) => {
    const profile: BurnerProfile = {
      id: generateId(),
      name,
      color: color || PROFILE_COLORS[Math.floor(Math.random() * PROFILE_COLORS.length)],
      userAgent: userAgent || DEFAULT_UA,
      createdAt: new Date().toISOString(),
      expiresAt: expiresInMin ? new Date(Date.now() + expiresInMin * 60 * 1000).toISOString() : undefined,
    };
    setProfiles((prev) => [profile, ...prev]);
    setActiveProfileId(profile.id);
  }, []);

  const deleteProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setActiveProfileId((prev) => (prev === id ? null : prev));
  }, []);

  const activateProfile = useCallback((id: string | null) => {
    setActiveProfileId(id);
  }, []);

  const updateProfile = useCallback((id: string, changes: Partial<BurnerProfile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  }, []);

  const allProfiles = useMemo(() => [...BUILT_IN_PROFILES, ...profiles], [profiles]);

  const activeProfile = useMemo(() => {
    if (!activeProfileId) return null;
    return allProfiles.find((p) => p.id === activeProfileId) ?? null;
  }, [activeProfileId, allProfiles]);

  const getEffectiveUA = useCallback(() => {
    return activeProfile?.userAgent ?? DEFAULT_UA;
  }, [activeProfile]);

  const value = useMemo(() => ({
    profiles: allProfiles,
    activeProfileId,
    activeProfile,
    createProfile,
    deleteProfile,
    activateProfile,
    updateProfile,
    getEffectiveUA,
  }), [allProfiles, activeProfileId, activeProfile, createProfile, deleteProfile, activateProfile, updateProfile, getEffectiveUA]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfiles must be used inside ProfileProvider");
  return ctx;
}
