import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { createElement, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import { WebView } from "react-native-webview";

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
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && contentReady) SplashScreen.hideAsync();
  }, [loaded, contentReady]);

  if (!loaded) return null;

  return (
    <View style={styles.stage}>
      <View style={styles.phone}>
        {Platform.OS === "web"
          ? createElement("iframe", {
              src: "/prototype/index.html",
              title: "DAYMARK",
              onLoad: () => setContentReady(true),
              style: { border: "none", width: "100%", height: "100%", backgroundColor: theme.bg },
            })
          : <WebView originWhitelist={["*"]} source={{ uri: nativePrototypeUri() }} style={styles.web} scalesPageToFit={false} contentInsetAdjustmentBehavior="never" setBuiltInZoomControls={false} setDisplayZoomControls={false} onLoadEnd={() => setContentReady(true)} onError={() => setContentReady(true)} onHttpError={() => setContentReady(true)} />}
      </View>
    </View>
  );
}

function nativePrototypeUri() {
  return "http://127.0.0.1:14711/index.html";
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: theme.stage, alignItems: "center" },
  phone: { flex: 1, width: "100%", maxWidth: 480, height: "100%", backgroundColor: theme.bg },
  web: { flex: 1, backgroundColor: theme.bg },
});
