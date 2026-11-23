import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// RN 0.88 widened ColorValue to include `null | number`, while
// @expo/vector-icons still accepts only `string | OpaqueColorValue`.
// React Navigation hands tabBarIcon a ColorValue; narrow it for Feather.
function iconColor(color: ColorValue): string {
  return typeof color === "string" ? color : (color as unknown as string) ?? "#000";
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: "globe", selected: "globe.americas.fill" }} />
        <NativeTabs.Trigger.Label>Browser</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="check">
        <NativeTabs.Trigger.Icon sf={{ default: "shield", selected: "shield.fill" }} />
        <NativeTabs.Trigger.Label>Check</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Icon sf={{ default: "flag", selected: "flag.fill" }} />
        <NativeTabs.Trigger.Label>Report</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lists">
        <NativeTabs.Trigger.Icon sf={{ default: "list.bullet", selected: "list.bullet" }} />
        <NativeTabs.Trigger.Label>Lists</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Icon sf={{ default: "ellipsis.circle", selected: "ellipsis.circle.fill" }} />
        <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isWeb = Platform.OS === "web";

  const baseHeight = isWeb ? 54 : 50;
  const tabBarHeight = baseHeight + (isAndroid ? insets.bottom : 0);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          ...(isIOS ? { position: "absolute" as const } : {}),
          backgroundColor: isIOS ? "transparent" : colors.toolbar,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 8,
          height: tabBarHeight,
          paddingBottom: isAndroid ? insets.bottom : 0,
          paddingTop: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.toolbar }]} />
          ),
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_700Bold",
          letterSpacing: 0.3,
        },
        tabBarItemStyle: {
          paddingVertical: 3,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Browser",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="globe" tintColor={color} size={22} />
            ) : (
              <Feather name="globe" size={20} color={iconColor(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="check"
        options={{
          title: "Check",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield" tintColor={color} size={22} />
            ) : (
              <Feather name="shield" size={20} color={iconColor(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="flag" tintColor={color} size={22} />
            ) : (
              <Feather name="flag" size={20} color={iconColor(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="lists"
        options={{
          title: "Lists",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="list.bullet" tintColor={color} size={22} />
            ) : (
              <Feather name="list" size={20} color={iconColor(color)} />
            ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="ellipsis.circle" tintColor={color} size={22} />
            ) : (
              <Feather name="more-horizontal" size={20} color={iconColor(color)} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (Platform.OS === "ios") {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
