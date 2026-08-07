import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSafety } from "@/context/SafetyContext";
import { useHistory } from "@/context/HistoryContext";
import { useDownloads } from "@/context/DownloadContext";
import { useColors } from "@/hooks/useColors";

export default function SafetyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { safetySettings, updateSafetySettings, popupsBlocked } = useSafety();
  const { clearHistory } = useHistory();
  const { clearCompleted, downloads } = useDownloads();
  const [biometricType, setBiometricType] = useState<string>("Biometrics");
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") {
      LocalAuthentication.supportedAuthenticationTypesAsync().then((types) => {
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType("Face ID / Face Unlock");
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType("Fingerprint");
        } else {
          setBiometricType("Device PIN");
        }
      });
    }
  }, []);

  async function toggleAppLock(value: boolean) {
    if (value && Platform.OS !== "web") {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert(
          "No Biometrics Enrolled",
          "Please set up fingerprint or face unlock in your device settings first.",
          [{ text: "OK" }]
        );
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm to enable App Lock",
        fallbackLabel: "Use PIN",
      });
      if (!result.success) return;
    }
    updateSafetySettings({ appLockEnabled: value });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function confirmClearHistory() {
    Alert.alert(
      "Clear Browsing Data",
      "This will delete your full browsing history. Bookmarks and saved data will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear History",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            await clearHistory();
            setClearing(false);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  function confirmClearDownloads() {
    Alert.alert(
      "Clear Download History",
      "Completed and failed downloads will be removed. Active downloads will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Downloads",
          style: "destructive",
          onPress: () => {
            clearCompleted();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Safety & Privacy", headerBackTitle: "More" }} />

      {/* Protection */}
      <SectionLabel label="Protection" colors={colors} />
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="shield-off"
          iconColor="#7B5CFF"
          label="Block Popups"
          desc={
            popupsBlocked > 0
              ? `${popupsBlocked} popup${popupsBlocked !== 1 ? "s" : ""} blocked so far`
              : "Blocks window.open() popup ads"
          }
          colors={colors}
        >
          <Switch
            value={safetySettings.popupBlockEnabled}
            onValueChange={(v) => {
              updateSafetySettings({ popupBlockEnabled: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: colors.border, true: "#7B5CFF" }}
            thumbColor="#fff"
          />
        </SettingRow>
        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="alert-circle"
          iconColor="#F59E0B"
          label="Permission Guard"
          desc="Show warning when a site requests camera, mic, or location"
          colors={colors}
        >
          <Switch
            value={safetySettings.permissionGuardEnabled}
            onValueChange={(v) => {
              updateSafetySettings({ permissionGuardEnabled: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: colors.border, true: "#7B5CFF" }}
            thumbColor="#fff"
          />
        </SettingRow>
        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <SettingRow
          icon="lock"
          iconColor="#10B981"
          label="HTTPS Warning"
          desc="Show indicator on insecure HTTP sites"
          colors={colors}
        >
          <Switch
            value={safetySettings.httpsWarningEnabled}
            onValueChange={(v) => {
              updateSafetySettings({ httpsWarningEnabled: v });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            trackColor={{ false: colors.border, true: "#7B5CFF" }}
            thumbColor="#fff"
          />
        </SettingRow>
      </View>

      {/* Privacy */}
      <SectionLabel label="Privacy" colors={colors} />
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SettingRow
          icon="smartphone"
          iconColor="#EC4899"
          label="App Lock"
          desc={
            safetySettings.appLockEnabled
              ? `Locked with ${biometricType}`
              : `Require ${biometricType} to open app`
          }
          colors={colors}
        >
          <Switch
            value={safetySettings.appLockEnabled}
            onValueChange={toggleAppLock}
            trackColor={{ false: colors.border, true: "#7B5CFF" }}
            thumbColor="#fff"
          />
        </SettingRow>
      </View>

      {/* Data */}
      <SectionLabel label="Data" colors={colors} />
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActionRow
          icon="clock"
          label={clearing ? "Clearing…" : "Clear Browsing History"}
          desc="Deletes all visited page history"
          color="#EF4444"
          colors={colors}
          onPress={confirmClearHistory}
          disabled={clearing}
        />
        <View style={[styles.sep, { backgroundColor: colors.border }]} />
        <ActionRow
          icon="download"
          label="Clear Download History"
          desc={`${downloads.filter((d) => d.status === "completed" || d.status === "failed").length} completed downloads`}
          color="#EF4444"
          colors={colors}
          onPress={confirmClearDownloads}
        />
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="info" size={14} color={colors.mutedForeground} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          All safety features run entirely on-device. No data is sent to external servers.
        </Text>
      </View>
    </ScrollView>
  );
}

function SectionLabel({ label, colors }: { label: string; colors: any }) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{label}</Text>
  );
}

function SettingRow({
  icon,
  iconColor,
  label,
  desc,
  colors,
  children,
}: {
  icon: any;
  iconColor: string;
  label: string;
  desc: string;
  colors: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + "20" }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      {children}
    </View>
  );
}

function ActionRow({
  icon,
  label,
  desc,
  color,
  colors,
  onPress,
  disabled,
}: {
  icon: any;
  label: string;
  desc: string;
  color: string;
  colors: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { opacity: pressed || disabled ? 0.5 : 1 }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.iconBox, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
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
  group: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sep: { height: 1, marginLeft: 66 },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginTop: 8,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
