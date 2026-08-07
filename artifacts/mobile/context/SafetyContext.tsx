import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, AppStateStatus } from "react-native";

import { safeGet, safeSet } from "@/lib/safeStorage";

export type SafetySettings = {
  popupBlockEnabled: boolean;
  appLockEnabled: boolean;
  httpsWarningEnabled: boolean;
  permissionGuardEnabled: boolean;
};

const DEFAULT_SAFETY: SafetySettings = {
  popupBlockEnabled: true,
  appLockEnabled: false,
  httpsWarningEnabled: true,
  permissionGuardEnabled: true,
};

export type PendingPermission = {
  origin: string;
  resources: string[];
  grant: () => void;
  deny: () => void;
};

type SafetyContextValue = {
  safetySettings: SafetySettings;
  updateSafetySettings: (partial: Partial<SafetySettings>) => void;
  popupsBlocked: number;
  incrementPopupsBlocked: () => void;
  isLocked: boolean;
  unlock: () => void;
  lock: () => void;
  pendingPermission: PendingPermission | null;
  setPendingPermission: (p: PendingPermission | null) => void;
};

const SafetyContext = createContext<SafetyContextValue | null>(null);

const SAFETY_KEY = "hwb_safety_v1";
const POPUPS_KEY = "hwb_popups_blocked_v1";

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(DEFAULT_SAFETY);
  const [popupsBlocked, setPopupsBlocked] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const settingsRef = useRef(safetySettings);
  settingsRef.current = safetySettings;

  useEffect(() => {
    Promise.all([
      safeGet<SafetySettings>(SAFETY_KEY, DEFAULT_SAFETY),
      safeGet<number>(POPUPS_KEY, 0),
    ]).then(([s, p]) => {
      setSafetySettings({ ...DEFAULT_SAFETY, ...s });
      setPopupsBlocked(typeof p === "number" ? p : 0);
    });
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (
        nextState === "active" &&
        appStateRef.current === "background" &&
        settingsRef.current.appLockEnabled
      ) {
        setIsLocked(true);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const updateSafetySettings = useCallback((partial: Partial<SafetySettings>) => {
    setSafetySettings((prev) => {
      const next = { ...prev, ...partial };
      safeSet(SAFETY_KEY, next);
      return next;
    });
  }, []);

  const incrementPopupsBlocked = useCallback(() => {
    setPopupsBlocked((prev) => {
      const next = prev + 1;
      safeSet(POPUPS_KEY, next);
      return next;
    });
  }, []);

  const unlock = useCallback(() => setIsLocked(false), []);
  const lock = useCallback(() => setIsLocked(true), []);

  return (
    <SafetyContext.Provider
      value={{
        safetySettings,
        updateSafetySettings,
        popupsBlocked,
        incrementPopupsBlocked,
        isLocked,
        unlock,
        lock,
        pendingPermission,
        setPendingPermission,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error("useSafety must be used within SafetyProvider");
  return ctx;
}
