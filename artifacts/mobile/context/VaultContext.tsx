import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const VAULT_KEY = "hwb_vault_v1";

export type VaultEntry = {
  id: string;
  site: string;
  username: string;
  password: string;
  createdAt: number;
};

type VaultContextType = {
  entries: VaultEntry[];
  loading: boolean;
  addEntry: (entry: Omit<VaultEntry, "id" | "createdAt">) => Promise<void>;
  updateEntry: (id: string, patch: Partial<Omit<VaultEntry, "id" | "createdAt">>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
};

const VaultContext = createContext<VaultContextType>({
  entries: [],
  loading: true,
  addEntry: async () => {},
  updateEntry: async () => {},
  deleteEntry: async () => {},
});

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function persist(entries: VaultEntry[]) {
  try {
    await SecureStore.setItemAsync(VAULT_KEY, JSON.stringify(entries));
  } catch {}
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(VAULT_KEY);
        if (raw) setEntries(JSON.parse(raw));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const addEntry = useCallback(async (entry: Omit<VaultEntry, "id" | "createdAt">) => {
    const next: VaultEntry = { ...entry, id: genId(), createdAt: Date.now() };
    setEntries((prev) => {
      const updated = [next, ...prev];
      persist(updated);
      return updated;
    });
  }, []);

  const updateEntry = useCallback(async (id: string, patch: Partial<Omit<VaultEntry, "id" | "createdAt">>) => {
    setEntries((prev) => {
      const updated = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
      persist(updated);
      return updated;
    });
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  return (
    <VaultContext.Provider value={{ entries, loading, addEntry, updateEntry, deleteEntry }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  return useContext(VaultContext);
}
