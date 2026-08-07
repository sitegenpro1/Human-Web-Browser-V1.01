import { Feather } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSafety } from "@/context/SafetyContext";

export function AppLockOverlay() {
  const { isLocked, unlock } = useSafety();
  const insets = useSafeAreaInsets();
  const [authError, setAuthError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isLocked) {
      attemptAuth();
    }
  }, [isLocked]);

  async function attemptAuth() {
    if (Platform.OS === "web") {
      unlock();
      return;
    }
    setChecking(true);
    setAuthError(false);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        unlock();
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to open Human Web Browser",
        fallbackLabel: "Use PIN",
        disableDeviceFallback: false,
      });
      if (result.success) {
        unlock();
      } else {
        setAuthError(true);
      }
    } catch {
      unlock();
    } finally {
      setChecking(false);
    }
  }

  if (!isLocked) return null;

  return (
    <View
      style={[
        styles.overlay,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Feather name="lock" size={38} color="#7B5CFF" />
        </View>
        <Text style={styles.title}>Human Web Browser</Text>
        <Text style={styles.subtitle}>Unlock to continue</Text>

        {authError && (
          <Text style={styles.errorText}>Authentication failed. Please try again.</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.authBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={attemptAuth}
          disabled={checking}
        >
          <Feather name="shield" size={16} color="#fff" />
          <Text style={styles.authBtnText}>{checking ? "Authenticating…" : "Authenticate"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#080810",
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 40,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "#7B5CFF18",
    borderWidth: 1,
    borderColor: "#7B5CFF30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#EEEEFF",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#5A5A78",
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "#FF6B6B",
    textAlign: "center",
  },
  authBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7B5CFF",
    paddingHorizontal: 32,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  authBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
