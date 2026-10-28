import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useDevice, type ReminderTimes } from "@/src/device";
import { REMINDERS, applyReminders } from "@/src/reminders";
import { theme } from "@/src/theme";

const FIELDS: { id: keyof ReminderTimes; name: string }[] = [
  { id: "breakfast", name: "Сніданок" },
  { id: "water", name: "Вода зранку" },
  { id: "lunch", name: "Обід" },
  { id: "snack", name: "Перекус" },
  { id: "waterLate", name: "Вода вдень" },
  { id: "dinner", name: "Вечеря" },
];

export default function RemindersScreen() {
  const { device, setReminders } = useDevice();
  const [times, setTimes] = useState(device.times);
  const [error, setError] = useState("");

  function update(id: keyof ReminderTimes, value: string) {
    setTimes((current) => ({ ...current, [id]: value }));
  }

  async function save(on: boolean) {
    setError("");
    if (on && Object.values(times).some((value) => !/^\d{2}:\d{2}$/.test(value))) {
      setError("Час запиши як 08:30.");
      return;
    }
    try {
      await applyReminders(on, times);
      setReminders(on, times);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вдалося увімкнути нагадування.");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      <Text style={styles.kicker}>НАГАДУВАННЯ</Text>
      <Text style={styles.title}>Кілька разів на день.{"\n"}Без зайвого.</Text>
      <Text style={styles.sub}>Сніданок, обід, вечеря, перекус і вода. На iPhone вони приходять навіть коли застосунок закритий.</Text>
      {FIELDS.map((field) => (
        <View key={field.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{field.name}</Text>
            <Text style={styles.body}>{REMINDERS.find((item) => item.id === field.id)?.body}</Text>
          </View>
          <TextInput value={times[field.id]} onChangeText={(value) => update(field.id, value)} style={styles.input} />
        </View>
      ))}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={() => save(true)}><Text style={styles.primaryText}>{device.remindersOn ? "Оновити нагадування" : "Увімкнути нагадування"}</Text></Pressable>
      {device.remindersOn ? <Pressable onPress={() => save(false)}><Text style={styles.off}>Вимкнути</Text></Pressable> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 48 },
  close: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 24, color: theme.ink, marginTop: -2 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 8 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 10, lineHeight: 36 },
  sub: { color: theme.muted, marginTop: 10, marginBottom: 12, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  name: { fontWeight: "800", color: theme.ink },
  body: { color: theme.muted, fontSize: 12, marginTop: 2 },
  input: { width: 78, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingVertical: 10, textAlign: "center", fontWeight: "800", color: theme.ink },
  error: { color: "#9B2C2C", fontWeight: "700", marginTop: 12 },
  primary: { marginTop: 18, backgroundColor: theme.blue, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  off: { color: theme.muted, fontWeight: "800", textAlign: "center", marginTop: 14 },
});
