import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { BackBar } from "@/src/components/Chrome";
import { num } from "@/src/format";
import { scalePer100 } from "@/src/nutrition/calc";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function LabelScreen() {
  const { addMeal } = useStore();
  const [name, setName] = useState("");
  const [per100, setPer100] = useState("");
  const [grams, setGrams] = useState("100");
  const amount = Number(grams.replace(",", "."));
  const kcal100 = Number(per100.replace(",", "."));
  const result = Number.isFinite(kcal100) && Number.isFinite(amount) ? scalePer100(kcal100, amount) : null;

  return (
    <View style={styles.screen}>
      <BackBar title="За етикеткою" />
      <TextInput value={name} onChangeText={setName} placeholder="Назва" placeholderTextColor={theme.muted} style={styles.input} />
      <TextInput value={per100} onChangeText={setPer100} placeholder="ккал / 100 г" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={styles.input} />
      <TextInput value={grams} onChangeText={setGrams} placeholder="Грами" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={styles.input} />
      <Text style={styles.result}>{result == null ? "—" : `${num(result, 1)} ккал`}</Text>
      <Pressable
        style={styles.button}
        onPress={() => {
          if (!name.trim() || result == null || amount <= 0) return;
          addMeal({ name: name.trim(), grams: amount, kcal: result, p: null, f: null, c: null, slot: "snack", emoji: "◌" });
          router.back();
        }}>
        <Text style={styles.buttonText}>Додати</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 16, gap: 12 },
  input: { backgroundColor: theme.white, borderRadius: 14, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink },
  result: { fontSize: 36, fontWeight: "800", color: theme.ink },
  button: { backgroundColor: theme.blue, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: theme.white, fontWeight: "800" },
});
