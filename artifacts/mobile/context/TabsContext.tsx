import React, { createContext, useCallback, useContext, useRef, useState } from "react";

import { generateId } from "@/lib/generateId";

export type Tab = {
  id: string;
  url: string;
  title: string;
  isPrivate: boolean;
};

type TabsContextValue = {
  tabs: Tab[];
  activeTabId: string;
  activeTab: Tab;
  createTab: (url?: string, isPrivate?: boolean) => string;
  closeTab: (id: string) => void;
  switchTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<Tab>) => void;
  closeAllTabs: () => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function makeTab(url = "", isPrivate = false): Tab {
  return { id: generateId(), url, title: url ? url : "New Tab", isPrivate };
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
  const initialTab = useRef(makeTab()).current;
  const [tabs, setTabs] = useState<Tab[]>([initialTab]);
  const [activeTabId, setActiveTabId] = useState(initialTab.id);

  const activeTab: Tab =
    tabs.find((t) => t.id === activeTabId) ?? tabs[0] ?? makeTab();

  const createTab = useCallback((url = "", isPrivate = false): string => {
    const tab = makeTab(url, isPrivate);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
    return tab.id;
  }, []);

  const closeTab = useCallback(
    (id: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) {
          // Replace with a blank tab instead of closing the last one
          const blank = makeTab();
          setActiveTabId(blank.id);
          return [blank];
        }
        const idx = prev.findIndex((t) => t.id === id);
        const next = prev.filter((t) => t.id !== id);
        if (id === activeTabId) {
          const newActive = next[Math.max(0, idx - 1)];
          setActiveTabId(newActive.id);
        }
        return next;
      });
    },
    [activeTabId]
  );

  const switchTab = useCallback((id: string) => {
    setActiveTabId(id);
  }, []);

  const updateTab = useCallback((id: string, updates: Partial<Tab>) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const closeAllTabs = useCallback(() => {
    const blank = makeTab();
    setTabs([blank]);
    setActiveTabId(blank.id);
  }, []);

  return (
    <TabsContext.Provider
      value={{ tabs, activeTabId, activeTab, createTab, closeTab, switchTab, updateTab, closeAllTabs }}
    >
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within TabsProvider");
  return ctx;
}
