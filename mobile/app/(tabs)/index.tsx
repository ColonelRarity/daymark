import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DayCell, Dumbbell, Glyph, Spark } from "@/src/components/Marks";

import { dayLabel, monthTitle, num, shiftISO, shortDay, todayISO, weekdayMon0 } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function sleepLabel(bed: string, wake: string) {
  if (!bed || !wake) return "Мій ритм";
  const [bedHour, bedMinute] = bed.split(":").map(Number);
  const [wakeHour, wakeMinute] = wake.split(":").map(Number);
  let minutes = wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute);
  if (minutes <= 0) minutes += 24 * 60;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} год ${rest} хв` : `${hours} год`;
}

export default function TodayScreen() {
  const { state, day, totals, setDate, mark } = useStore();
  const [monthOpen, setMonthOpen] = useState(false);
  const today = todayISO();
  const marked = state.checks[state.selectedDate];
  const dayNumber = Math.round(
    (Date.parse(`${state.selectedDate}T00:00:00Z`) - Date.parse(`${state.goalStart}T00:00:00Z`)) / 86400000,
  ) + 1;
  const canMark = state.selectedDate <= today && state.selectedDate >= state.goalStart;
  const target = state.calories;
  const ratio = target ? Math.min(totals.kcal / target, 1) : 0;
  const remaining = target == null ? null : Math.max(0, target - totals.kcal);
  const monday = shiftISO(state.selectedDate, -weekdayMon0(state.selectedDate));
  const week = Array.from({ length: 7 }, (_, index) => shiftISO(monday, index));
  const marks = Object.keys(state.checks).length;
  function pressDay(iso: string) {
    if (iso > today || iso < state.goalStart) return;
    setDate(iso);
    mark(state.checks[iso] ? "clear" : "full");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.kicker}>{state.selectedDate === today ? "СЬОГОДНІ" : dayLabel(state.selectedDate).toUpperCase()}</Text>
          <Text style={styles.hello}>Привіт, {state.name}. <Text style={styles.spark}>✳</Text></Text>
        </View>
        <View style={styles.dateControl}>
          <Pressable accessibilityRole="button" accessibilityLabel="Попередній день" onPress={() => setDate(shiftISO(state.selectedDate, -1))}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{shortDay(state.selectedDate)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Наступний день"
            disabled={state.selectedDate >= today}
            onPress={() => setDate(shiftISO(state.selectedDate, 1))}>
            <Text style={[styles.chevron, state.selectedDate >= today && styles.disabled]}>›</Text>
          </Pressable>
        </View>
      </View>

      <LinearGradient colors={["#FFE7C9", "#FFC3AD", "#FBB9B1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.energy}>
        <View style={styles.energyTop}>
          <Pressable onPress={() => router.push("/diary")}>
            <Text style={styles.energyLabel}>Енергія сьогодні ↗</Text>
          </Pressable>
          <Text style={styles.spark}>✳</Text>
        </View>
        <View style={styles.readout}>
          <View>
            <Text style={styles.energyValue}>{num(totals.kcal)}</Text>
            <Text style={styles.energyUnit}>ккал внесено</Text>
          </View>
          <View style={styles.targetBlock}>
            <Text style={styles.targetValue}>{remaining == null ? "Свій\nтемп." : num(remaining)}</Text>
            <Text style={styles.targetCaption}>{remaining == null ? "без заданої норми" : totals.kcal > (target ?? 0) ? "орієнтир уже досягнуто" : "до мого орієнтира"}</Text>
          </View>
        </View>
        <View style={styles.gauge}>
          <View style={[styles.gaugeFill, { width: `${Math.max(target ? 8 : 3, ratio * 100)}%` }]} />
          <View style={[styles.gaugeDot, { left: `${Math.min(96, Math.max(3, ratio * 100))}%` }]} />
        </View>
        <View style={styles.gaugeLabel}>
          <Text style={styles.gaugeText}>Мій щоденник</Text>
          <Pressable onPress={() => router.push("/profile")}>
            <Text style={styles.gaugeLink}>{target ? `${num(target)} ккал · змінити` : "Додати свій орієнтир"}</Text>
          </Pressable>
        </View>
        <View style={styles.macros}>
          {[
            ["Білки", totals.p],
            ["Жири", totals.f],
            ["Вуглеводи", totals.c],
          ].map(([label, value]) => (
            <View key={String(label)} style={styles.macro}>
              <Text style={styles.macroName}>{label}</Text>
              <Text style={styles.macroValue}>{totals.missing && value === 0 ? "—" : num(Number(value), 1)}<Text style={styles.macroUnit}> г</Text></Text>
            </View>
          ))}
        </View>
        <View style={styles.tools}>
          <Pressable accessibilityRole="button" style={styles.snap} onPress={() => router.push("/photo")}>
            <Text style={styles.snapIcon}>⌖</Text>
            <View>
              <Text style={styles.snapTitle}>Сфоткай</Text>
              <Text style={styles.snapSub}>Їжу, напій чи етикетку</Text>
            </View>
            <Text style={styles.snapArrow}>↗</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Внести їжу вручну" style={styles.manual} onPress={() => router.push("/search")}>
            <Text style={styles.manualPlus}>＋</Text>
            <Text style={styles.manualText}>Внести</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.reward}>
        <View style={styles.rewardHead}>
          <View>
            <Text style={styles.kicker}>МІЙ ШЛЯХ</Text>
            <Text style={styles.rewardTitle}>Маленькі перемоги.</Text>
          </View>
          <Pressable style={styles.count} onPress={() => router.push("/journey")}>
            <Text style={styles.countValue}>{marks}</Text>
            <Text style={styles.countLabel}>позначок ↗</Text>
          </Pressable>
        </View>
        <Text style={styles.goalName}>{state.goalTitle}</Text>
        <View style={styles.weekRow}>
          <Text style={styles.weekLabel}>{monthOpen ? `${monthTitle(state.selectedDate.slice(0, 7)).replace(/^./, (letter) => letter.toUpperCase())} р.` : "Цей тиждень"}</Text>
          <Pressable onPress={() => setMonthOpen((open) => !open)}>
            <Text style={styles.weekToggle}>{monthOpen ? "Згорнути ↑" : "Увесь місяць ↓"}</Text>
          </Pressable>
        </View>
        <View style={styles.grid}>
          {WEEK.map((name) => (
            <Text key={name} style={styles.weekday}>{name}</Text>
          ))}
          {(monthOpen ? monthDates(state.selectedDate) : week).map((iso, index) => (
            <DayCell
              key={iso ?? `empty-${index}`}
              iso={iso}
              mark={iso ? state.checks[iso] : undefined}
              selected={iso === state.selectedDate}
              future={iso ? iso > today : false}
              onPress={iso ? () => pressDay(iso) : undefined}
            />
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!canMark}
          onPress={() => mark(marked ? "clear" : "full")}
          style={[styles.victory, marked && styles.victoryDone, !canMark && styles.disabledButton]}>
          <Text style={styles.victoryIcon}>{marked ? "✦" : "✓"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.victoryTitle}>{marked ? "Цей день уже твій!" : "Закреслити день"}</Text>
            <Text style={styles.victorySub}>День {Math.max(dayNumber, 1)} · {marked ? "ще одна маленька перемога" : "відзнач свій крок"}</Text>
          </View>
          <Text style={styles.victoryMark}>{marked ? "↗" : "✳"}</Text>
        </Pressable>
        <View style={styles.rewardBottom}>
          <Pressable disabled={!canMark} onPress={() => mark(marked ? "clear" : "minimum")}>
            <Text style={styles.minimum}>{marked ? "Змінити або прибрати позначку" : "Сьогодні зроблено мій мінімум"}</Text>
          </Pressable>
          <Text style={styles.keep}>Без обнулення прогресу</Text>
        </View>
      </View>

      <Pressable style={styles.supports} onPress={() => router.push("/profile")}>
        <View style={styles.supportMark}><Text style={styles.supportStar}>✳</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.supportTitle}>Мої опори</Text>
          <Text style={styles.supportSub}>Мій набір під мою ціль</Text>
        </View>
        <Text style={styles.supportArrow}>↗</Text>
      </Pressable>

      <Pressable style={styles.coach} onPress={() => router.push("/coach")}>
        <View style={styles.orb}><Text style={styles.orbMark}>✦</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.coachKicker}>ПОМІЧНИК ДНЯ · АВТООНОВЛЕННЯ</Text>
          <Text style={styles.coachTitle}>Помічник підлаштовується під тебе</Text>
          <Text style={styles.coachSub}>Сон, харчування, рух і твій прогрес</Text>
        </View>
        <Text style={styles.coachArrow}>↗</Text>
      </Pressable>

      <Pressable style={styles.sport} onPress={() => router.push("/move")}>
        <View style={styles.sportIcon}><Dumbbell size={34} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sportKicker}>МІЙ РУХ</Text>
          <Text style={styles.sportTitle}>{day.workouts.length ? `${day.workouts.reduce((sum, item) => sum + item.minutes, 0)} хв у твоїй історії` : "Тренування, дім чи прогулянка"}</Text>
          <Text style={styles.sportSub}>{num(day.steps)} кроків · витрати ще не внесено</Text>
        </View>
        <Text style={styles.sportArrow}>↗</Text>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Для твого ритму</Text>
        <Pressable onPress={() => router.push("/spaces")}>
          <Text style={styles.weekToggle}>Усі простори ↗</Text>
        </Pressable>
      </View>
      <View style={styles.quickGrid}>
        <QuickTool tint="lavender" icon="search" title="Що я їм?" sub="Знайти продукт" onPress={() => router.push("/search")} />
        <QuickTool tint="lime" icon="barcode" title="Є етикетка?" sub="Розрахуй порцію" onPress={() => router.push("/label")} />
        <QuickTool tint="peach" icon="recipes" title="Що приготувати?" sub="100 смачних ідей" onPress={() => router.push("/recipes")} />
        <QuickTool tint="ink" icon="arrow" title="Моя перемога" sub="Картка для Stories" onPress={() => router.push("/story")} />
      </View>

      <View style={styles.banner}>
        <Image source={{ uri: "/art/movement-editorial.png" }} style={styles.bannerPhoto} />
        <LinearGradient colors={["#302F8CE8", "#333E9EAA", "#3635B31C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.bannerKicker}>ТВОЇ РІШЕННЯ. ТВІЙ РИТМ.</Text>
        <Text style={styles.bannerTitle}>Тримай курс.{"\n"}Крок за кроком.</Text>
        <Text style={styles.bannerText}>Цілі, рух і звички —{"\n"}в одному місці.</Text>
        <Pressable style={styles.bannerButton} onPress={() => router.push("/move")}>
          <Text style={styles.bannerButtonText}>Мій рух</Text>
          <Glyph name="arrow" size={16} color="#3E482B" />
        </Pressable>
        <View style={styles.badge}>
          <Dumbbell size={36} color="#71823E" />
          <Text style={styles.badgeText}>Сила{"\n"}малих дій</Text>
        </View>
        <View style={styles.ticks}><Text style={styles.ticksText}>✓  ✓  ✦</Text></View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Мої простори</Text>
        <Pressable onPress={() => router.push("/spaces")}><Text style={styles.weekToggle}>Усі екрани</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spaces}>
        <SpaceCard color="#FFC6AD" icon="food" iconColor="#81452C" spark="#81452C" title="Харчування" value={`${num(totals.kcal)} ккал`} sub="їжа з увагою" onPress={() => router.push("/diary")} />
        <SpaceCard color="#D9FF65" icon="move" iconColor="#50711C" spark="#50711C" title="Рух" value={num(day.steps)} sub="кроків у своєму темпі" onPress={() => router.push("/move")} />
        <SpaceCard color="#D9D5FB" icon="sleep" iconColor="#6B59AF" spark="#6B59AF" title="Сон" value={sleepLabel(day.bed, day.wake)} sub="час на відновлення" onPress={() => router.push("/sleep")} />
      </ScrollView>
    </ScrollView>
  );
}

const QUICK = {
  lavender: { bg: "#EBE3FF", fg: "#8D6CCE" },
  lime: { bg: "#E8F3CF", fg: "#91A85C" },
  peach: { bg: "#FFE2CA", fg: "#BA8A65" },
  ink: { bg: "#3B3F38", fg: "#D7E1B9" },
} as const;

function QuickTool({ tint, icon, title, sub, onPress }: { tint: keyof typeof QUICK; icon: "search" | "barcode" | "recipes" | "arrow"; title: string; sub: string; onPress: () => void }) {
  const palette = QUICK[tint];
  return (
    <Pressable style={[styles.quick, { backgroundColor: palette.bg }]} onPress={onPress}>
      <View style={[styles.quickIcon, tint === "ink" && styles.quickIconInk]}>
        <Glyph name={icon} color={palette.fg} />
      </View>
      <Text style={[styles.quickTitle, { color: palette.fg }]}>{title}</Text>
      <Text style={[styles.quickSub, { color: palette.fg }]}>{sub}</Text>
    </Pressable>
  );
}

function SpaceCard({ color, icon, iconColor, spark, title, value, sub, onPress }: { color: string; icon: "food" | "move" | "sleep"; iconColor: string; spark: string; title: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Pressable style={[styles.space, { backgroundColor: color }]} onPress={onPress}>
      <View style={styles.spaceTop}>
        <Text style={styles.spaceName}>{title}</Text>
        <View style={styles.spaceIcon}><Glyph name={icon} size={16} color={iconColor} /></View>
      </View>
      <Text style={styles.spaceValue}>{value}</Text>
      <Text style={styles.spaceSub}>{sub}</Text>
      <View style={styles.sparkLine}><Spark color={spark} /></View>
    </Pressable>
  );
}

function monthDates(selected: string) {
  const [year, month] = selected.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = weekdayMon0(first);
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return cells;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingBottom: 130, gap: 14 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.2 },
  hello: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 2 },
  spark: { color: theme.blue },
  dateControl: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.white, borderRadius: 12, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 8, paddingVertical: 8 },
  chevron: { fontSize: 22, color: theme.ink, paddingHorizontal: 4 },
  dateText: { fontSize: 13, fontWeight: "700", color: theme.ink },
  disabled: { opacity: 0.35 },
  energy: { borderRadius: 27, padding: 21 },
  energyTop: { flexDirection: "row", justifyContent: "space-between" },
  energyLabel: { backgroundColor: "#FFF6EC", borderRadius: 20, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 6, fontWeight: "700", color: "#6A4A3A" },
  readout: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14 },
  energyValue: { fontSize: 64, fontWeight: "800", letterSpacing: -3, color: "#413027", lineHeight: 66 },
  energyUnit: { color: "#7A5C4C", fontSize: 14 },
  targetBlock: { alignItems: "flex-end" },
  targetValue: { fontSize: 28, fontWeight: "800", color: "#413027", textAlign: "right", letterSpacing: -0.8 },
  targetCaption: { color: "#7A5C4C", fontSize: 13, textAlign: "right", maxWidth: 120 },
  gauge: { height: 10, borderRadius: 8, backgroundColor: "#FFFFFF88", marginTop: 16, justifyContent: "center" },
  gaugeFill: { height: 10, borderRadius: 8, backgroundColor: theme.blue },
  gaugeDot: { position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: theme.white, marginLeft: -9, borderWidth: 3, borderColor: theme.lime },
  gaugeLabel: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  gaugeText: { color: "#6A4A3A", fontSize: 13 },
  gaugeLink: { color: "#6A4A3A", fontSize: 13, fontWeight: "700", textDecorationLine: "underline" },
  macros: { flexDirection: "row", gap: 8, marginTop: 16 },
  macro: { flex: 1, backgroundColor: "#FFF6EE", borderRadius: 16, padding: 12 },
  macroName: { color: "#8A6A58", fontSize: 13 },
  macroValue: { fontSize: 22, fontWeight: "800", color: "#413027", marginTop: 4 },
  macroUnit: { fontSize: 14, fontWeight: "600" },
  tools: { flexDirection: "row", gap: 10, marginTop: 16 },
  snap: { flex: 1, backgroundColor: theme.blue, borderRadius: 17, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  snapIcon: { color: theme.white, fontSize: 20 },
  snapTitle: { color: theme.white, fontWeight: "800", fontSize: 16 },
  snapSub: { color: "#E4E0FF", fontSize: 12 },
  snapArrow: { color: theme.white, marginLeft: "auto", fontSize: 18 },
  manual: { width: 74, backgroundColor: "#FFF5E7", borderRadius: 17, alignItems: "center", justifyContent: "center" },
  manualPlus: { fontSize: 22, color: "#795E50", fontWeight: "600" },
  manualText: { fontSize: 12, color: "#795E50", fontWeight: "700" },
  reward: { backgroundColor: theme.white, borderRadius: 27, borderWidth: 1, borderColor: "#E7EADE", padding: 18 },
  rewardHead: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  rewardTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8, color: theme.ink },
  count: { backgroundColor: "#EEEAFF", borderRadius: 16, minWidth: 72, alignItems: "center", padding: 8 },
  countValue: { fontSize: 22, fontWeight: "800", color: "#6757B6" },
  countLabel: { fontSize: 11, color: "#6757B6", fontWeight: "700" },
  goalName: { marginTop: 8, color: theme.ink, fontWeight: "700" },
  weekRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between" },
  weekLabel: { color: theme.muted, fontSize: 13 },
  weekToggle: { color: theme.blue, fontWeight: "700", fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  weekday: { width: "14.28%", textAlign: "center", color: theme.muted, fontSize: 12, marginBottom: 6 },
  day: { width: "13.2%", marginHorizontal: "0.54%", aspectRatio: 1, borderRadius: 12, backgroundColor: "#F3F5EF", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  dayEmpty: { width: "13.2%", marginHorizontal: "0.54%", aspectRatio: 1 },
  dayFull: { backgroundColor: theme.lime },
  dayMin: { backgroundColor: "#E7EBFF" },
  daySelected: { borderWidth: 1.5, borderColor: theme.blue },
  dayFuture: { backgroundColor: "transparent" },
  dayText: { fontWeight: "700", color: theme.ink, fontSize: 15 },
  dayFutureText: { color: "#B1B6AB" },
  strike: { position: "absolute", width: "70%", height: 3, borderRadius: 3, backgroundColor: theme.ink, transform: [{ rotate: "-28deg" }] },
  strikeMin: { backgroundColor: theme.blue },
  victory: { marginTop: 12, backgroundColor: "#DFFF80", borderRadius: 17, minHeight: 64, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  victoryDone: { backgroundColor: "#E7EBFF" },
  victoryIcon: { fontSize: 18, fontWeight: "800", color: "#527125" },
  victoryTitle: { fontSize: 16, fontWeight: "800", color: "#527125" },
  victorySub: { fontSize: 12, color: "#527125" },
  victoryMark: { color: "#527125", fontSize: 18 },
  disabledButton: { opacity: 0.45 },
  rewardBottom: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", gap: 8 },
  minimum: { color: theme.ink, fontSize: 13, fontWeight: "700", flex: 1 },
  keep: { color: theme.muted, fontSize: 12 },
  supports: { backgroundColor: "#EDF4DC", borderWidth: 1, borderColor: "#E0E9CA", borderRadius: 21, padding: 15, flexDirection: "row", alignItems: "center", gap: 13 },
  supportMark: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#DFF28F", alignItems: "center", justifyContent: "center" },
  supportStar: { color: "#73894E", fontSize: 22 },
  supportTitle: { color: "#73894E", fontSize: 16, fontWeight: "800" },
  supportSub: { color: "#83985B", fontSize: 12, marginTop: 3 },
  supportArrow: { color: "#83985B", fontSize: 22 },
  coach: { backgroundColor: "#F1EAFF", borderWidth: 1, borderColor: "#DDD2F2", borderRadius: 23, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  orb: { width: 43, height: 48, borderRadius: 15, backgroundColor: "#7854BB", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-7deg" }] },
  orbMark: { color: "#E4FF9B", fontSize: 26 },
  coachKicker: { color: "#786291", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  coachTitle: { color: "#4F3C70", fontSize: 16, fontWeight: "800", marginTop: 3 },
  coachSub: { color: "#887995", fontSize: 12, marginTop: 2 },
  coachArrow: { color: "#8A6AB6", fontSize: 24 },
  sport: { backgroundColor: "#EFF3E4", borderWidth: 1, borderColor: "#E2E8D3", borderRadius: 22, padding: 15, flexDirection: "row", alignItems: "center", gap: 11 },
  sportIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#DFFF85", alignItems: "center", justifyContent: "center" },
  sportKicker: { color: "#82945A", fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  sportTitle: { color: "#4E5E30", fontSize: 15, fontWeight: "800" },
  sportSub: { color: "#87946D", fontSize: 12 },
  sportArrow: { color: "#759241", fontSize: 24 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  quick: { width: "47.5%", borderRadius: 21, minHeight: 142, padding: 17 },
  quickIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFFFFF99", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  quickIconInk: { backgroundColor: "#FFFFFF22" },
  quickTitle: { fontSize: 16, fontWeight: "800" },
  quickSub: { marginTop: 4, fontSize: 13, opacity: 0.85 },
  banner: { borderRadius: 27, minHeight: 265, backgroundColor: "#343BEA", overflow: "hidden", padding: 23 },
  bannerPhoto: { position: "absolute", right: -30, top: -40, width: "78%", height: "150%" },
  bannerKicker: { color: "#E2DCFF", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  bannerTitle: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 34, marginTop: 16 },
  bannerText: { color: "#E9E9FF", fontSize: 13, lineHeight: 20, marginTop: 10 },
  bannerButton: { alignSelf: "flex-start", marginTop: 16, backgroundColor: "#D9FF65", borderRadius: 13, minHeight: 43, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  bannerButtonText: { color: "#3E482B", fontWeight: "800" },
  badge: { position: "absolute", right: 16, top: 16, width: 76, height: 85, borderRadius: 19, backgroundColor: "#E1FF86", alignItems: "center", justifyContent: "center", transform: [{ rotate: "10deg" }] },
  badgeText: { color: "#71823E", fontSize: 10, fontWeight: "800", textAlign: "center" },
  ticks: { position: "absolute", right: 18, bottom: 18, borderWidth: 1, borderColor: "#FFFFFF55", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#FFFFFF18" },
  ticksText: { color: "#E8FF9F", fontSize: 18, letterSpacing: 4 },
  spaces: { gap: 10, paddingRight: 18 },
  space: { width: 168, minHeight: 150, borderRadius: 20, padding: 15, overflow: "hidden" },
  spaceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spaceName: { fontWeight: "700", color: theme.ink, fontSize: 14 },
  spaceIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#FFFFFFB0", alignItems: "center", justifyContent: "center" },
  spaceValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, color: theme.ink, marginTop: 18 },
  spaceSub: { color: theme.ink, opacity: 0.65, fontSize: 12, maxWidth: 110, marginTop: 2 },
  sparkLine: { position: "absolute", right: 8, bottom: 12, opacity: 0.35 },
});
