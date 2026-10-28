import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { DeviceProvider } from "@/src/device";
import { StoreProvider } from "@/src/store";
import { theme } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  anchor: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <View style={styles.stage}>
      <View style={styles.phone}>
        <StoreProvider>
          <DeviceProvider>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }} />
          </DeviceProvider>
        </StoreProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: theme.stage, alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 480, backgroundColor: theme.bg },
});
