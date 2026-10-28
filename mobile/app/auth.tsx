import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDevice } from "@/src/device";
import { theme } from "@/src/theme";

export default function AuthScreen() {
  const { device, signIn, signOut } = useDevice();
  const [error, setError] = useState("");

  async function apple() {
    setError("");
    try {
      const Apple = await import("expo-apple-authentication");
      const available = await Apple.isAvailableAsync();
      if (!available) throw new Error("Вхід через Apple відкривається на iPhone.");
      const result = await Apple.signInAsync({
        requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      });
      const name = [result.fullName?.givenName, result.fullName?.familyName].filter(Boolean).join(" ") || "Apple";
      signIn({ provider: "apple", id: result.user, name, email: result.email || "" });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вдалося увійти через Apple.");
    }
  }

  async function google() {
    setError("");
    const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!clientId) {
      setError("Для входу Google додай OAuth-клієнт: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.");
      return;
    }
    try {
      const AuthSession = await import("expo-auth-session");
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "daymark" });
      const discovery = { authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth", tokenEndpoint: "https://oauth2.googleapis.com/token" };
      const request = new AuthSession.AuthRequest({
        clientId,
        redirectUri,
        responseType: AuthSession.ResponseType.Token,
        scopes: ["openid", "profile", "email"],
      });
      const result = await request.promptAsync(discovery);
      if (result.type !== "success") return;
      const profile = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${result.params.access_token}` },
      }).then((response) => response.json());
      signIn({
        provider: "google",
        id: profile.sub,
        name: profile.name || "Google",
        email: profile.email || "",
      });
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вдалося увійти через Google.");
    }
  }

  return (
    <View style={styles.screen}>
      <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      <Text style={styles.kicker}>МІЙ ВХІД</Text>
      <Text style={styles.title}>Твій щоденник.{"\n"}Твій телефон.</Text>
      <Text style={styles.sub}>Фото і записи лишаються на пристрої. Вхід потрібен, щоб відновити підписку на новому телефоні.</Text>
      {device.account ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{device.account.name}</Text>
          <Text style={styles.cardSub}>{device.account.provider === "apple" ? "Apple" : "Google"}{device.account.email ? ` · ${device.account.email}` : ""}</Text>
          <Pressable onPress={signOut}><Text style={styles.link}>Вийти</Text></Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pressable style={styles.apple} onPress={apple}><Text style={styles.appleText}>Увійти з Apple</Text></Pressable>
          <Pressable style={styles.google} onPress={google}><Text style={styles.googleText}>Увійти з Google</Text></Pressable>
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => router.push("/paywall")}><Text style={styles.link}>Підписка і пробні 7 днів</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 22 },
  close: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 24, color: theme.ink, marginTop: -2 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 12 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 10, lineHeight: 38 },
  sub: { color: theme.muted, marginTop: 12, lineHeight: 21 },
  actions: { marginTop: 28, gap: 10 },
  apple: { backgroundColor: theme.ink, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  appleText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  google: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  googleText: { color: theme.ink, fontWeight: "800", fontSize: 16 },
  card: { marginTop: 28, backgroundColor: theme.white, borderRadius: 18, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 6 },
  cardTitle: { fontWeight: "800", fontSize: 18, color: theme.ink },
  cardSub: { color: theme.muted },
  error: { color: "#9B2C2C", fontWeight: "700", marginTop: 16, lineHeight: 20 },
  link: { color: theme.blue, fontWeight: "800", marginTop: 18 },
});
