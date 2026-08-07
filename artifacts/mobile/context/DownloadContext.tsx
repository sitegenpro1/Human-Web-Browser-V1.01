import * as Sharing from "expo-sharing";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { generateId } from "@/lib/generateId";
import { safeGet, safeSet } from "@/lib/safeStorage";

export type DownloadStatus = "pending" | "downloading" | "completed" | "failed" | "cancelled";

export type DownloadItem = {
  id: string;
  url: string;
  filename: string;
  status: DownloadStatus;
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  localUri?: string;
  startedAt: string;
  error?: string;
};

type DownloadContextValue = {
  downloads: DownloadItem[];
  startDownload: (url: string, filename?: string) => string;
  cancelDownload: (id: string) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
  openDownload: (item: DownloadItem) => Promise<void>;
  activeCount: number;
};

const DownloadContext = createContext<DownloadContextValue | null>(null);

const DOWNLOADS_KEY = "hwb_downloads_v1";

function getFilenameFromUrl(url: string, suggested?: string): string {
  if (suggested && suggested.trim()) return suggested.trim();
  try {
    const pathname = decodeURIComponent(new URL(url).pathname);
    const parts = pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "download";
    return last.length > 80 ? last.slice(0, 80) : last;
  } catch {
    return "download";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { formatBytes };

export function DownloadProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const downloadRefs = useRef<Record<string, any>>({});

  useEffect(() => {
    safeGet<DownloadItem[]>(DOWNLOADS_KEY, []).then((stored) => {
      if (Array.isArray(stored)) {
        setDownloads(stored.filter((d) => d.status === "completed" || d.status === "failed"));
      }
    });
    if (Platform.OS !== "web") {
      // Lazy import so web bundle never loads expo-file-system
      import("expo-file-system/legacy").then((FileSystem) => {
        const dir = (FileSystem.documentDirectory ?? "") + "Downloads/";
        FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
      }).catch(() => {});
    }
  }, []);

  const updateDownload = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setDownloads((prev) => {
      const next = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
      const toStore = next.filter((d) => d.status === "completed" || d.status === "failed");
      safeSet(DOWNLOADS_KEY, toStore);
      return next;
    });
  }, []);

  const startDownload = useCallback(
    (url: string, suggestedFilename?: string): string => {
      const id = generateId();
      const filename = getFilenameFromUrl(url, suggestedFilename);

      const newItem: DownloadItem = {
        id,
        url,
        filename,
        status: "pending",
        progress: 0,
        bytesDownloaded: 0,
        totalBytes: 0,
        startedAt: new Date().toISOString(),
      };

      setDownloads((prev) => [newItem, ...prev]);

      if (Platform.OS === "web") {
        // On web just open in new tab
        try { window.open(url, "_blank"); } catch {}
        updateDownload(id, { status: "completed", progress: 1 });
        return id;
      }

      // Native: lazy-load expo-file-system to avoid crashing web bundle
      import("expo-file-system/legacy").then((FileSystem) => {
        const localUri = (FileSystem.documentDirectory ?? "") + "Downloads/" + id + "_" + filename;
        updateDownload(id, { localUri });

        const resumable = FileSystem.createDownloadResumable(
          url,
          localUri,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
            },
          },
          (dlProg: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
            const ratio =
              dlProg.totalBytesExpectedToWrite > 0
                ? dlProg.totalBytesWritten / dlProg.totalBytesExpectedToWrite
                : 0;
            updateDownload(id, {
              status: "downloading",
              progress: ratio,
              bytesDownloaded: dlProg.totalBytesWritten,
              totalBytes: dlProg.totalBytesExpectedToWrite,
            });
          }
        );

        downloadRefs.current[id] = resumable;

        resumable
          .downloadAsync()
          .then((result: { uri: string } | undefined) => {
            if (result) {
              updateDownload(id, { status: "completed", progress: 1, localUri: result.uri });
            } else {
              updateDownload(id, { status: "failed", error: "Download returned no result" });
            }
          })
          .catch((err: Error) => {
            const msg = err?.message ?? "Unknown error";
            if (msg.includes("cancel") || msg.includes("Cancel")) {
              updateDownload(id, { status: "cancelled" });
            } else {
              updateDownload(id, { status: "failed", error: msg });
            }
          })
          .finally(() => {
            delete downloadRefs.current[id];
          });
      }).catch((err: Error) => {
        updateDownload(id, { status: "failed", error: err?.message ?? "Module load failed" });
      });

      return id;
    },
    [updateDownload]
  );

  const cancelDownload = useCallback(
    (id: string) => {
      const resumable = downloadRefs.current[id];
      if (resumable) {
        resumable.cancelAsync?.().catch(() => {});
        delete downloadRefs.current[id];
      }
      updateDownload(id, { status: "cancelled" });
    },
    [updateDownload]
  );

  const removeDownload = useCallback((id: string) => {
    setDownloads((prev) => {
      const item = prev.find((d) => d.id === id);
      if (item?.localUri && Platform.OS !== "web") {
        import("expo-file-system/legacy").then((FileSystem) => {
          FileSystem.deleteAsync(item.localUri!, { idempotent: true }).catch(() => {});
        }).catch(() => {});
      }
      const next = prev.filter((d) => d.id !== id);
      const toStore = next.filter((d) => d.status === "completed" || d.status === "failed");
      safeSet(DOWNLOADS_KEY, toStore);
      return next;
    });
  }, []);

  const clearCompleted = useCallback(() => {
    setDownloads((prev) => {
      const toDelete = prev.filter(
        (d) => d.status === "completed" || d.status === "failed" || d.status === "cancelled"
      );
      if (Platform.OS !== "web") {
        import("expo-file-system/legacy").then((FileSystem) => {
          toDelete.forEach((d) => {
            if (d.localUri) FileSystem.deleteAsync(d.localUri, { idempotent: true }).catch(() => {});
          });
        }).catch(() => {});
      }
      const next = prev.filter((d) => d.status === "downloading" || d.status === "pending");
      safeSet(DOWNLOADS_KEY, []);
      return next;
    });
  }, []);

  const openDownload = useCallback(async (item: DownloadItem) => {
    if (!item.localUri) return;
    if (Platform.OS === "web") return;
    try {
      const FileSystem = await import("expo-file-system/legacy");
      const info = await FileSystem.getInfoAsync(item.localUri);
      if (!info.exists) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(item.localUri, { dialogTitle: `Open ${item.filename}` });
      }
    } catch {}
  }, []);

  const activeCount = downloads.filter(
    (d) => d.status === "downloading" || d.status === "pending"
  ).length;

  return (
    <DownloadContext.Provider
      value={{
        downloads,
        startDownload,
        cancelDownload,
        removeDownload,
        clearCompleted,
        openDownload,
        activeCount,
      }}
    >
      {children}
    </DownloadContext.Provider>
  );
}

export function useDownloads() {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error("useDownloads must be used within DownloadProvider");
  return ctx;
}
