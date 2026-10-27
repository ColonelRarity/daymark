import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackBar } from "@/src/components/Chrome";
import { useStore, type CustomFood } from "@/src/store";
import { theme } from "@/src/theme";

export default function ProductScreen() {
  const { addCustomFood } = useStore();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [unit, setUnit] = useState<CustomFood["unit"]>("g");
  const [serving, setServing] = useState("100");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");
  const [error, setError] = useState("");

  function numberOrNull(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function save() {
    const energy = numberOrNull(kcal);
    const portion = numberOrNull(serving);
    if (!name.trim()) {
      setError("Вкажи назву");
      return;
    }
    if (energy == null || energy < 0 || energy > 10000) {
      setError("Вкажи калорії на 100");
      return;
    }
    if (portion == null || portion <= 0 || portion > 10000) {
      setError("Вкажи звичну порцію");
      return;
    }
    const food: CustomFood = {
      id: `own-${Date.now()}`,
      name: name.trim(),
      brand: brand.trim() || "Мій продукт",
      unit,
      serving: portion,
      kcal: energy,
      p: numberOrNull(p),
      f: numberOrNull(f),
      c: numberOrNull(c),
    };
    addCustomFood(food);
    router.replace(`/add?id=${food.id}`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <BackBar title="Моя база" />
      <Text style={styles.kicker}>МОЯ БАЗА / ЕТИКЕТКА АБО МЕНЮ</Text>
      <Text style={styles.title}>Твоя їжа —{"\n"}теж у базі.</Text>
      <Text style={styles.note}>Значення на 100 г або 100 мл. Якщо меню дає лише всю порцію, поділи її на вагу порції.</Text>
      <Field label="Назва" value={name} onChange={setName} placeholder="Продукт, страва або напій" />
      <Field label="Бренд / заклад" value={brand} onChange={setBrand} placeholder="Мій продукт" />
      <Text style={styles.label}>Значення на 100</Text>
      <View style={styles.pills}>
        {([["g", "грамів"], ["ml", "мілілітрів"]] as const).map(([id, label]) => (
          <Pressable key={id} onPress={() => setUnit(id)} style={[styles.pill, unit === id && styles.pillOn]}>
            <Text style={[styles.pillText, unit === id && styles.pillTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Звична порція" value={serving} onChange={setServing} keyboard="decimal-pad" />
      <Field label="Ккал / 100" value={kcal} onChange={setKcal} keyboard="decimal-pad" placeholder="З етикетки" />
      <Field label="Білки, г / 100" value={p} onChange={setP} keyboard="decimal-pad" placeholder="Може бути невідомо" />
      <Field label="Жири, г / 100" value={f} onChange={setF} keyboard="decimal-pad" placeholder="Може бути невідомо" />
      <Field label="Вуглеводи, г / 100" value={c} onChange={setC} keyboard="decimal-pad" placeholder="Може бути невідомо" />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Зберегти продукт у мою базу</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, value, onChange, placeholder, keyboard }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; keyboard?: "decimal-pad" }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={theme.muted} keyboardType={keyboard} style={styles.input} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 18, paddingBottom: 48, gap: 8 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 8, lineHeight: 36 },
  note: { color: theme.muted, lineHeight: 20, marginBottom: 8 },
  label: { fontWeight: "700", color: theme.ink, marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: theme.white, borderRadius: 14, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink },
  pills: { flexDirection: "row", gap: 8 },
  pill: { backgroundColor: theme.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.line },
  pillOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  pillText: { fontWeight: "700", color: theme.ink },
  pillTextOn: { color: "#fff" },
  error: { color: "#9B2C2C", fontWeight: "700", marginTop: 8 },
  button: { marginTop: 16, backgroundColor: theme.blue, borderRadius: 14, minHeight: 48, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
});
