import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useDevice } from "@/src/device";
import { pickMealFromLibrary, pickMealPhoto } from "@/src/photos";
import { theme } from "@/src/theme";

export default function PhotoScreen() {
  const { savePhoto } = useDevice();
  const [error, setError] = useState("");

  async function take(kind: "camera" | "library") {
    setError("");
    try {
      const uri = kind === "camera" ? await pickMealPhoto() : await pickMealFromLibrary();
      if (!uri) return;
      const id = savePhoto(uri);
      router.push(`/photo-review?id=${id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вдалося зберегти фото.");
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>ФОТО / НА ЦЬОМУ ТЕЛЕФОНІ</Text>
      <Text style={styles.title}>Сфоткай.{"\n"}Запам’ятай свій смак.</Text>
      <Text style={styles.sub}>Знімок лишається на пристрої. Модель дивиться його тут і пропонує страву з бази. Перед записом порцію підтверджуєш ти.</Text>
      <Pressable style={styles.zone} onPress={() => take("camera")}>
        <Text style={styles.zoneTitle}>Зробити фото</Text>
        <Text style={styles.zoneSub}>Камера · файл лишається тут</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => take("library")}>
        <Text style={styles.secondaryText}>Обрати з галереї</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 22 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 14, lineHeight: 36 },
  sub: { color: theme.muted, marginTop: 10, lineHeight: 20 },
  zone: { marginTop: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B4BDEA", backgroundColor: "#E8EDFF", borderRadius: 19, minHeight: 180, alignItems: "center", justifyContent: "center", padding: 20 },
  zoneTitle: { fontWeight: "800", fontSize: 16, color: theme.ink },
  zoneSub: { color: theme.muted, marginTop: 6, textAlign: "center" },
  secondary: { marginTop: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.white, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  secondaryText: { fontWeight: "800", color: theme.ink },
  error: { color: "#9B2C2C", fontWeight: "700", marginTop: 14, lineHeight: 20 },
});
