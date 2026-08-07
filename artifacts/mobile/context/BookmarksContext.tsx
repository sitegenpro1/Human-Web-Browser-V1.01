import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { generateId } from "@/lib/generateId";
import { normalizeDomain } from "@/lib/normalizeDomain";
import { safeGet, safeSet } from "@/lib/safeStorage";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  domain: string;
  createdAt: string;
};

type BookmarksContextValue = {
  bookmarks: Bookmark[];
  addBookmark: (url: string, title: string) => void;
  removeBookmark: (id: string) => void;
  removeBookmarkByUrl: (url: string) => void;
  isBookmarked: (url: string) => boolean;
  getBookmarkByUrl: (url: string) => Bookmark | undefined;
  importBookmarks: (data: Bookmark[]) => void;
};

const BookmarksContext = createContext<BookmarksContextValue | null>(null);
const KEY = "hwb_bookmarks_v1";

export function BookmarksProvider({ children }: { children: React.ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    safeGet<Bookmark[]>(KEY, []).then((data) => {
      setBookmarks(Array.isArray(data) ? data : []);
    });
  }, []);

  const addBookmark = useCallback((url: string, title: string) => {
    if (!url) return;
    const domain = normalizeDomain(url) ?? "";
    const entry: Bookmark = {
      id: generateId(),
      url,
      title: title || domain || url,
      domain,
      createdAt: new Date().toISOString(),
    };
    setBookmarks((prev) => {
      // Don't duplicate
      if (prev.some((b) => b.url === url)) return prev;
      const next = [entry, ...prev];
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.id !== id);
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const removeBookmarkByUrl = useCallback((url: string) => {
    setBookmarks((prev) => {
      const next = prev.filter((b) => b.url !== url);
      safeSet(KEY, next);
      return next;
    });
  }, []);

  const isBookmarked = useCallback(
    (url: string) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );

  const getBookmarkByUrl = useCallback(
    (url: string) => bookmarks.find((b) => b.url === url),
    [bookmarks]
  );

  const importBookmarks = useCallback((data: Bookmark[]) => {
    if (!Array.isArray(data)) return;
    setBookmarks(data);
    safeSet(KEY, data);
  }, []);

  return (
    <BookmarksContext.Provider
      value={{ bookmarks, addBookmark, removeBookmark, removeBookmarkByUrl, isBookmarked, getBookmarkByUrl, importBookmarks }}
    >
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks() {
  const ctx = useContext(BookmarksContext);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}
