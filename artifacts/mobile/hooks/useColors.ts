import { useContext } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { AppContext } from "@/context/AppContext";

export function useColors() {
  const ctx = useContext(AppContext);
  const systemScheme = useColorScheme();

  const themeMode = ctx?.settings?.theme ?? "dark";
  const effectiveScheme = themeMode === "system" ? (systemScheme ?? "dark") : themeMode;

  const palette =
    effectiveScheme === "dark" && "dark" in colors
      ? (colors as unknown as Record<string, typeof colors.light>).dark
      : colors.light;

  return { ...palette, radius: colors.radius };
}
