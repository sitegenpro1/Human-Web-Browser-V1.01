import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

function loadKeyboardControllerModule() {
  try {
    return require("react-native-keyboard-controller");
  } catch {
    return null;
  }
}

const keyboardControllerModule = loadKeyboardControllerModule();
const KeyboardProvider =
  keyboardControllerModule?.KeyboardProvider ??
  (({ children }: React.PropsWithChildren) => <>{children}</>);

import { AppLockOverlay } from "@/components/AppLockOverlay";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppProvider } from "@/context/AppContext";
import { BookmarksProvider } from "@/context/BookmarksContext";
import { ClipboardProvider } from "@/context/ClipboardContext";
import { DownloadProvider } from "@/context/DownloadContext";
import { ExtensionsProvider } from "@/context/ExtensionsContext";
import { FirewallProvider } from "@/context/FirewallContext";
import { HistoryProvider } from "@/context/HistoryContext";
import { ProfileProvider } from "@/context/ProfileContext";
import { ResearchProvider } from "@/context/ResearchContext";
import { SafetyProvider } from "@/context/SafetyContext";
import { SessionProvider } from "@/context/SessionContext";
import { TabsProvider } from "@/context/TabsContext";
import { VaultProvider } from "@/context/VaultContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ title: "Settings", presentation: "card" }} />
      <Stack.Screen name="demo" options={{ title: "Demo", presentation: "card" }} />
      <Stack.Screen name="waitlist" options={{ title: "Waitlist & Pricing", presentation: "card" }} />
      <Stack.Screen name="about" options={{ title: "About & Manifesto", presentation: "card" }} />
      <Stack.Screen name="tabs-overview" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="bookmarks" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="history" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="research" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="vault" options={{ title: "Password Vault", headerBackTitle: "More", presentation: "card" }} />
      <Stack.Screen name="privacy" options={{ title: "Privacy Policy", headerBackTitle: "More", presentation: "card" }} />
      <Stack.Screen name="safety" options={{ title: "Safety & Privacy", headerBackTitle: "More", presentation: "card" }} />
      <Stack.Screen name="downloads" options={{ title: "Downloads", headerBackTitle: "More", presentation: "card" }} />
      <Stack.Screen name="firewall" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="profiles" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="sessions" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="scanner" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="extensions" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="clipboard" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafetyProvider>
            <DownloadProvider>
              <FirewallProvider>
                <ProfileProvider>
                  <ExtensionsProvider>
                    <SessionProvider>
                      <ClipboardProvider>
                        <AppProvider>
                          <HistoryProvider>
                            <BookmarksProvider>
                              <TabsProvider>
                                <ResearchProvider>
                                  <VaultProvider>
                                    <GestureHandlerRootView>
                                      <KeyboardProvider>
                                        <RootLayoutNav />
                                      </KeyboardProvider>
                                    </GestureHandlerRootView>
                                  </VaultProvider>
                                </ResearchProvider>
                              </TabsProvider>
                            </BookmarksProvider>
                          </HistoryProvider>
                        </AppProvider>
                        <AppLockOverlay />
                      </ClipboardProvider>
                    </SessionProvider>
                  </ExtensionsProvider>
                </ProfileProvider>
              </FirewallProvider>
            </DownloadProvider>
          </SafetyProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
