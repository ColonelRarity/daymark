import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

const STROKE = (color: string, body: string, size: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  barcode: '<path d="M3 3h4M3 3v4m18-4h-4m4 0v4M3 21h4m-4 0v-4m18 4h-4m4 0v-4M7 7v10m3-10v10m4-10v10m3-10v10"/>',
  recipes: '<path d="M4 3h7c2 0 3 1 3 3v15c0-2-2-3-4-3H4V3Zm10 3c0-2 2-3 4-3h3v15h-3c-2 0-4 1-4 3M7 7h3m-3 4h3"/>',
  arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
  food: '<path d="M5 3v7m3-7v7m-6-7v7c0 2 6 2 6 0M5 12v9m13 0V3c-5 2-5 10 0 10"/>',
  sleep: '<path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/><path d="m17 3 .5 2 2 .5-2 .5-.5 2-.5-2-2-.5 2-.5Z"/>',
  move: '<path d="m5 4 3 2-4 6m16 8-3-2 4-6M8 7l8 10M3 5l4-3m14 17-4 3m-6-12 3-3"/>',
  today: '<rect x="3" y="4" width="18" height="17" rx="4"/><path d="M7 2v5m10-5v5M3 10h18m-13 5 3 3 5-6"/>',
  journey: '<path d="M4 19h16M5 16l5-5 4 2 5-9M15 4h4v4"/>',
  camera: '<path d="m8 5 2-2h4l2 2h4a2 2 0 0 1 2 2v12H2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
  basket: '<path d="M3 8h18l-2 13H5L3 8Zm4 0 5-6 5 6M9 12v5m6-5v5"/>',
};

export function Glyph({ name, size = 20, color }: { name: keyof typeof PATHS; size?: number; color: string }) {
  return <SvgXml xml={STROKE(color, PATHS[name], size)} width={size} height={size} />;
}

export function Dumbbell({ size = 42, color = "#6f842f" }: { size?: number; color?: string }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 70" width="${size}" height="${size}" fill="${color}"><g transform="rotate(-28 35 35)"><rect x="10" y="18" width="13" height="34" rx="5"/><rect x="47" y="18" width="13" height="34" rx="5"/><rect x="5" y="25" width="8" height="20" rx="3"/><rect x="58" y="25" width="8" height="20" rx="3"/><rect x="22" y="30" width="26" height="10" rx="4"/></g></svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

export function Spark({ color }: { color: string }) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 38" width="70" height="30" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 31 13 21 24 26 36 11 48 16 61 6 73 14 87 3"/></svg>`;
  return <SvgXml xml={xml} width={70} height={30} />;
}

function Strike({ minimum }: { minimum: boolean }) {
  const stroke = minimum ? "#9b73ed" : "#dfff7f";
  const tail = minimum ? "#a581e3" : "#dfff7f";
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%"><path d="M9 45 Q29 30 55 19" fill="none" stroke="${stroke}" stroke-width="7" stroke-linecap="round"/><path d="m47 47 3-5 3 5-3 5Z" fill="${tail}"/></svg>`;
  return (
    <View style={styles.strike} pointerEvents="none">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}

export function DayCell({
  iso,
  mark,
  selected,
  future,
  onPress,
}: {
  iso: string | null;
  mark?: "full" | "minimum";
  selected?: boolean;
  future?: boolean;
  onPress?: () => void;
}) {
  const full = mark === "full";
  const minimum = mark === "minimum";
  const todayOpen = selected && !full && !minimum;
  return (
    <Pressable disabled={!iso || future} onPress={onPress} style={[styles.cell, minimum && styles.minimum, future && styles.future, todayOpen && styles.today, !iso && styles.blank]}>
      {full ? <LinearGradient colors={["#8D78FF", "#6150F4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      {iso ? <Text style={[styles.num, full && styles.numFull, minimum && styles.numMin, future && styles.numFuture, todayOpen && styles.numToday]}>{Number(iso.slice(-2))}</Text> : null}
      {mark ? <Strike minimum={minimum} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: "13.2%",
    marginHorizontal: "0.54%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F4F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
    overflow: "hidden",
  },
  blank: { backgroundColor: "#F4F5EE" },
  minimum: { backgroundColor: "#E8F8C9" },
  future: { backgroundColor: "#FAFBF7", borderWidth: 1, borderColor: "#F0F2E9" },
  today: { backgroundColor: "#F5F1FF", borderWidth: 1.8, borderColor: "#9E8AFA" },
  num: { fontSize: 16, fontWeight: "700", color: "#929A87", zIndex: 1 },
  numFull: { color: "#FFFFFF" },
  numMin: { color: "#859C44" },
  numFuture: { color: "#D0D5C8" },
  numToday: { color: "#6A50C6" },
  strike: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 },
});
