import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DownloadItem, formatBytes, useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";

export default function DownloadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { downloads, cancelDownload, removeDownload, clearCompleted, openDownload } = useDownloads();
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const active = downloads.filter((d) => d.status === "downloading" || d.status === "pending");
  const done = downloads.filter(
    (d) => d.status === "completed" || d.status === "failed" || d.status === "cancelled"
  );

  function confirmClearAll() {
    Alert.alert("Clear Download History", "Remove all completed and failed downloads?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: () => {
          clearCompleted();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Downloads",
          headerBackTitle: "More",
          headerRight:
            done.length > 0
              ? () => (
                  <Pressable onPress={confirmClearAll} style={{ paddingRight: 4 }}>
                    <Text style={{ color: "#EF4444", fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                      Clear All
                    </Text>
                  </Pressable>
                )
              : undefined,
        }}
      />

      {downloads.length === 0 && (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="download-cloud" size={36} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No downloads yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Tap a PDF, video, or file link while browsing and it will appear here.
          </Text>
        </View>
      )}

      {active.length > 0 && (
        <View>
          <SectionLabel label="Active" colors={colors} />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {active.map((item, i) => (
              <React.Fragment key={item.id}>
                <ActiveDownloadRow
                  item={item}
                  colors={colors}
                  onCancel={() => cancelDownload(item.id)}
                />
                {i < active.length - 1 && (
                  <View style={[styles.sep, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}

      {done.length > 0 && (
        <View>
          <SectionLabel label="History" colors={colors} />
          <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {done.map((item, i) => (
              <React.Fragment key={item.id}>
                <DoneDownloadRow
                  item={item}
                  colors={colors}
                  onOpen={() => openDownload(item)}
                  onRemove={() => removeDownload(item.id)}
                />
                {i < done.length - 1 && (
                  <View style={[styles.sep, { backgroundColor: colors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>;
}

function ActiveDownloadRow({
  item,
  colors,
  onCancel,
}: {
  item: DownloadItem;
  colors: any;
  onCancel: () => void;
}) {
  const pct = Math.round(item.progress * 100);
  return (
    <View style={styles.dlRow}>
      <View style={[styles.fileIcon, { backgroundColor: "#7B5CFF20" }]}>
        <Feather name="download" size={18} color="#7B5CFF" />
      </View>
      <View style={styles.dlInfo}>
        <Text style={[styles.dlName, { color: colors.foreground }]} numberOfLines={1}>
          {item.filename}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: "#7B5CFF" }]}
          />
        </View>
        <Text style={[styles.dlMeta, { color: colors.mutedForeground }]}>
          {item.status === "pending"
            ? "Starting…"
            : `${pct}%${item.totalBytes > 0 ? ` · ${formatBytes(item.bytesDownloaded)} / ${formatBytes(item.totalBytes)}` : ""}`}
        </Text>
      </View>
      <Pressable
        onPress={onCancel}
        style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
      >
        <Feather name="x" size={16} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

function DoneDownloadRow({
  item,
  colors,
  onOpen,
  onRemove,
}: {
  item: DownloadItem;
  colors: any;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const isCompleted = item.status === "completed";
  const isFailed = item.status === "failed";

  const iconName = isCompleted ? "check-circle" : isFailed ? "alert-circle" : "slash";
  const iconColor = isCompleted ? "#10B981" : isFailed ? "#EF4444" : colors.mutedForeground;

  return (
    <Pressable
      style={({ pressed }) => [styles.dlRow, { opacity: pressed ? 0.7 : 1 }]}
      onPress={isCompleted ? onOpen : undefined}
      onLongPress={onRemove}
    >
      <View style={[styles.fileIcon, { backgroundColor: iconColor + "20" }]}>
        <Feather name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.dlInfo}>
        <Text style={[styles.dlName, { color: colors.foreground }]} numberOfLines={1}>
          {item.filename}
        </Text>
        <Text style={[styles.dlMeta, { color: colors.mutedForeground }]}>
          {isCompleted
            ? item.totalBytes > 0
              ? `${formatBytes(item.totalBytes)} · Tap to open`
              : "Completed · Tap to open"
            : isFailed
              ? `Failed: ${item.error ?? "Unknown error"}`
              : "Cancelled"}
        </Text>
      </View>
      {isCompleted && (
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={8}
        >
          <Feather name="share" size={16} color="#7B5CFF" />
        </Pressable>
      )}
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={8}
      >
        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginLeft: 4,
    marginBottom: 4,
    marginTop: 8,
  },
  group: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  sep: { height: 1, marginLeft: 68 },
  dlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dlInfo: { flex: 1, gap: 5 },
  dlName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dlMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 4, borderRadius: 2 },
  actionBtn: { padding: 4 },
  empty: { flex: 1, alignItems: "center", paddingTop: 80, gap: 14, paddingHorizontal: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  emptyDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
});
