import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { DayCell, Dumbbell, Glyph, Spark } from "@/src/components/Marks";
import recipes from "@/src/data/recipes.json";
import { daySpan, monthTitle, num, shiftISO, shortDay, todayISO, weekdayMon0 } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
const NAVY = "#242840";
const LIME = "#D9FA77";
const VIOLET = "#5348F2";

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

function plural(count: number, one: string, few: string, many: string) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function monthDates(monthIso: string) {
  const [year, month] = monthIso.split("-").map(Number);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const lead = weekdayMon0(first);
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  return cells;
}

function shiftMonth(iso: string, delta: number) {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 10);
}

function EnergyRing({ percent }: { percent: number }) {
  const size = 96;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const length = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = length - (clamped / 100) * length;
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="#fff" stroke="rgba(255,255,255,0.72)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#5347E9" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${length.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
  return (
    <View style={styles.ringWrap}>
      <SvgXml xml={xml} width={size} height={size} />
      <View style={styles.ringLabel}>
        <Text style={styles.ringValue}>{percent}%</Text>
        <Text style={styles.ringCaption}>від{"\n"}орієнтира</Text>
      </View>
    </View>
  );
}

export default function TodayScreen() {
  const { state, day, totals, setDate, mark } = useStore();
  const scrollRef = useRef<ScrollView>(null);
  const [supportsY, setSupportsY] = useState(0);
  const [browsedMonth, setBrowsedMonth] = useState<string | null>(null);
  const today = todayISO();
  const marked = state.checks[state.selectedDate];
  const dayNumber = daySpan(state.goalStart, state.selectedDate) + 1;
  const totalDays = daySpan(state.goalStart, state.goalEnd) + 1;
  const canMark = state.selectedDate <= today && state.selectedDate >= state.goalStart;
  const target = state.calories;
  const percent = target ? Math.round((totals.kcal / target) * 100) : 0;
  const ahead = Math.max(0, daySpan(today, state.goalEnd));
  const marks = Object.keys(state.checks).length;
  const monthIso = browsedMonth ?? `${state.selectedDate.slice(0, 7)}-01`;
  const monthMarks = Object.keys(state.checks).filter((iso) => iso.startsWith(monthIso.slice(0, 7))).length;
  const foodDone = day.meals.length > 0;
  const doneCount = [foodDone, day.moveDone, day.sleepDone].filter(Boolean).length;
  const monthName = monthTitle(monthIso);
  const monthHeading = `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} р.`;

  let energyNote = "Додай перший прийом їжі";
  if (target == null) energyNote = totals.kcal ? "Без заданого орієнтира" : "Додай перший прийом їжі";
  else if (totals.kcal === 0) energyNote = "Додай перший прийом їжі";
  else if (totals.kcal < target) energyNote = `Ще ${num(target - totals.kcal)} ккал до орієнтира`;
  else if (totals.kcal > target) energyNote = `На ${num(totals.kcal - target)} ккал більше за орієнтир`;
  else energyNote = "Орієнтир на сьогодні зібрано";

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>{state.selectedDate === today ? "СЬОГОДНІ" : shortDay(state.selectedDate).toUpperCase()}</Text>
          <Text style={styles.hello}>Привіт, {state.name}. 👋</Text>
        </View>
        <View style={styles.dateControl}>
          <Pressable accessibilityRole="button" accessibilityLabel="Попередній день" onPress={() => { setBrowsedMonth(null); setDate(shiftISO(state.selectedDate, -1)); }}>
            <Text style={styles.chevron}>‹</Text>
          </Pressable>
          <Text style={styles.dateText}>{shortDay(state.selectedDate)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Наступний день"
            disabled={state.selectedDate >= today}
            onPress={() => { setBrowsedMonth(null); setDate(shiftISO(state.selectedDate, 1)); }}>
            <Text style={[styles.chevron, state.selectedDate >= today && styles.disabled]}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.cover}>
        <View style={{ flex: 1 }}>
          <Text style={styles.coverKicker}>DAYMARK / СЬОГОДНІ</Text>
          <Text style={styles.coverDay}>
            День {Math.max(dayNumber, 1)}
            <Text style={styles.coverTotal}> / {totalDays}</Text>
          </Text>
          <Text style={styles.coverGoal}>{state.goalTitle}</Text>
          <Pressable style={styles.coverButton} onPress={() => router.push("/journey")}>
            <Text style={styles.coverButtonText}>{marked ? "Моя позначка вже є" : "Подивитися мій шлях ↗"}</Text>
          </Pressable>
        </View>
        <View style={styles.coverArt}>
          <View style={styles.coverTile}><Dumbbell size={36} color="#5C6B32" /></View>
          <Text style={styles.coverMotto}>ONE DAY{"\n"}AT A TIME</Text>
        </View>
      </View>

      <LinearGradient colors={["#FFE9D8", "#FFD4BD", "#F8B7C4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.energy}>
        <View style={styles.energyTop}>
          <Pressable style={styles.energyPill} onPress={() => router.push("/diary")}>
            <Text style={styles.energyPillText}>Мій щоденник їжі ↗</Text>
          </Pressable>
          <Text style={styles.salad}>🥗</Text>
        </View>
        <Text style={styles.energyKicker}>ВНЕСЕНО СЬОГОДНІ</Text>
        <View style={styles.readout}>
          <View style={{ flex: 1 }}>
            <Text style={styles.energyValue}>{num(totals.kcal)}</Text>
            <Text style={styles.energyUnit}>ккал</Text>
            <Text style={styles.energyNote}>{energyNote}</Text>
          </View>
          <EnergyRing percent={percent} />
        </View>
        <View style={styles.targetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.targetTitle}>Орієнтир на день</Text>
            <Text style={styles.targetSub}>не жорсткий ліміт</Text>
          </View>
          <Pressable style={styles.targetButton} onPress={() => router.push("/profile")}>
            <Text style={styles.targetButtonText}>{target ? `${num(target)} ккал ↗` : "Додати ↗"}</Text>
          </Pressable>
        </View>
        <View style={styles.macroHead}>
          <Text style={styles.macroTitle}>Білки · жири · вуглеводи</Text>
          <Text style={styles.macroSub}>за внесеними стравами</Text>
        </View>
        <View style={styles.macros}>
          {[
            ["Білки", totals.p, "#5347E9"],
            ["Жири", totals.f, "#E07A62"],
            ["Вуглеводи", totals.c, "#7BAE3A"],
          ].map(([label, value, color]) => (
            <View key={String(label)} style={styles.macro}>
              <View style={styles.macroNameRow}>
                <View style={[styles.macroDot, { backgroundColor: String(color) }]} />
                <Text style={styles.macroName}>{label}</Text>
              </View>
              <Text style={styles.macroValue}>{totals.missing && value === 0 ? "—" : num(Number(value), 1)}<Text style={styles.macroUnit}> г</Text></Text>
            </View>
          ))}
        </View>
        <View style={styles.tools}>
          <Pressable accessibilityRole="button" style={styles.snap} onPress={() => router.push("/photo")}>
            <View style={{ flex: 1 }}>
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
          <Text style={styles.calendarKicker}>МІЙ КАЛЕНДАР</Text>
          <Pressable style={styles.pathPill} onPress={() => router.push("/journey")}>
            <Text style={styles.pathPillText}>Весь шлях ↗</Text>
          </Pressable>
        </View>
        <Text style={styles.rewardTitle}>{state.goalTitle}</Text>
        <Text style={styles.rewardSub}>Кожен закреслений день — ще один день, коли ти зробив крок до цілі.</Text>
        <View style={styles.stats}>
          <View style={styles.statNavy}><Text style={styles.statNavyText}>{plural(marks, "день закреслено", "дні закреслено", "днів закреслено")}</Text></View>
          <View style={styles.statLime}><Text style={styles.statLimeText}>{plural(ahead, "день до твоєї дати", "дні до твоєї дати", "днів до твоєї дати")}</Text></View>
        </View>
        <View style={styles.monthRow}>
          <Pressable accessibilityLabel="Попередній місяць" onPress={() => setBrowsedMonth(shiftMonth(monthIso, -1))}><Text style={styles.monthChevron}>‹</Text></Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.monthTitle}>{monthHeading}</Text>
            <Text style={styles.monthMeta}>{plural(monthMarks, "позначка цього місяця", "позначки цього місяця", "позначок цього місяця")}</Text>
          </View>
          <Pressable accessibilityLabel="Наступний місяць" onPress={() => setBrowsedMonth(shiftMonth(monthIso, 1))}><Text style={styles.monthChevron}>›</Text></Pressable>
        </View>
        <View style={styles.grid}>
          {WEEK.map((name) => <Text key={name} style={styles.weekday}>{name}</Text>)}
          {monthDates(monthIso).map((iso, index) => (
            <DayCell
              key={iso ?? `empty-${index}`}
              iso={iso}
              mark={iso ? state.checks[iso] : undefined}
              selected={iso === state.selectedDate}
              future={iso ? iso > today : false}
              onPress={iso ? () => setDate(iso) : undefined}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={styles.legendFull} /><Text style={styles.legendText}>Закреслено</Text></View>
          <View style={styles.legendItem}><View style={styles.legendToday} /><Text style={styles.legendText}>Сьогодні</Text></View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={!canMark}
          onPress={() => mark(marked ? "clear" : "full")}
          style={[styles.strike, !canMark && styles.disabledButton]}>
          <Text style={styles.strikeTitle}>{marked ? "Позначку збережено" : `Закреслити ${shortDay(state.selectedDate)}`}</Text>
          <Text style={styles.strikeSub}>Один дотик — і день у твоєму календарі ↗</Text>
        </Pressable>
      </View>

      <Pressable style={styles.weekCard} onPress={() => router.push("/week")}>
        <Text style={styles.cardEmoji}>📅</Text>
        <Text style={styles.cardKicker}>МЕНЮ + ТРЕНУВАННЯ</Text>
        <Text style={styles.cardTitle}>Мій план на 7 днів</Text>
        <Text style={styles.cardSub}>Побажання, продукти, час — усе врахуємо ↗</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/training")}>
        <LinearGradient colors={["#DFFB97", "#E9F7C9", "#DBD6FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.trainingCard}>
          <Text style={styles.cardKickerDark}>DAYMARK TRAINING · 81 ПРОГРАМ</Text>
          <Text style={styles.cardTitle}>Твій план руху на тиждень</Text>
          <Text style={styles.cardSub}>Побажання, тренування й інтерактивний плеєр ↗</Text>
        </LinearGradient>
      </Pressable>

      <Pressable style={styles.stepsCard} onPress={() => scrollRef.current?.scrollTo({ y: supportsY, animated: true })}>
        <Text style={styles.cardEmoji}>🎯</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepsTitle}>Мої кроки</Text>
          <Text style={styles.stepsSub}>Що зробити сьогодні</Text>
        </View>
        <Text style={styles.stepsArrow}>↗</Text>
      </Pressable>

      <Pressable style={styles.coach} onPress={() => router.push("/coach")}>
        <Text style={styles.cardEmoji}>🧭</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.coachKicker}>ПОМІЧНИК ДНЯ · АВТООНОВЛЕННЯ</Text>
          <Text style={styles.coachTitle}>Помічник підлаштовується під тебе</Text>
          <Text style={styles.coachSub}>Сон, харчування, рух і твій прогрес</Text>
        </View>
        <Text style={styles.coachArrow}>↗</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/wellbeing")}>
        <LinearGradient colors={["#D9D0FF", "#F1E8FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.voiceCard}>
          <Text style={styles.cardEmoji}>♪</Text>
          <Text style={styles.cardKickerDark}>МЕДИТАЦІЇ ТА АФІРМАЦІЇ</Text>
          <Text style={styles.cardTitle}>Заспокойся. Налаштуйся. Повір у себе.</Text>
          <Text style={styles.cardSub}>Для ранку, важкого дня або складного періоду ↗</Text>
        </LinearGradient>
      </Pressable>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Для твого ритму</Text>
        <Pressable onPress={() => router.push("/spaces")}><Text style={styles.sectionLink}>Усі простори ↗</Text></Pressable>
      </View>
      <View style={styles.quickGrid}>
        <QuickTool tint="lavender" icon="search" title="Що я їм?" sub="Знайти продукт" onPress={() => router.push("/search")} />
        <QuickTool tint="lime" icon="barcode" title="Є етикетка?" sub="Розрахуй порцію" onPress={() => router.push("/label")} />
        <QuickTool tint="peach" icon="recipes" title="Що приготувати?" sub={`${recipes.length} смачних ідей`} onPress={() => router.push("/recipes")} />
        <QuickTool tint="ink" icon="arrow" title="Моя перемога" sub="Картка для Stories" onPress={() => router.push("/story")} />
      </View>

      <View style={styles.banner}>
        <Image source={{ uri: "/art/movement-editorial.png" }} style={styles.bannerPhoto} />
        <LinearGradient colors={["#302F8CE8", "#333E9EAA", "#3635B31C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        <Text style={styles.bannerKicker}>ТВОЇ РІШЕННЯ. ТВІЙ РИТМ.</Text>
        <Text style={styles.bannerTitle}>Тримай курс.{"\n"}Крок за кроком.</Text>
        <Pressable style={styles.bannerButton} onPress={() => router.push("/move")}>
          <Text style={styles.bannerButtonText}>Мій рух</Text>
          <Glyph name="arrow" size={16} color="#3E482B" />
        </Pressable>
        <View style={styles.badge}>
          <Dumbbell size={36} color="#71823E" />
        </View>
      </View>

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>Мої простори</Text>
        <Pressable onPress={() => router.push("/spaces")}><Text style={styles.sectionLink}>Усі екрани</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.spaces}>
        <SpaceCard color="#FFC6AD" icon="food" iconColor="#81452C" spark="#81452C" title="Харчування" value={`${num(totals.kcal)} ккал`} sub="їжа з увагою" onPress={() => router.push("/diary")} />
        <SpaceCard color={LIME} icon="move" iconColor="#50711C" spark="#50711C" title="Рух" value={num(day.steps)} sub="кроків у своєму темпі" onPress={() => router.push("/move")} />
        <SpaceCard color="#D9D5FB" icon="sleep" iconColor="#6B59AF" spark="#6B59AF" title="Сон" value={sleepLabel(day.bed, day.wake)} sub="час на відновлення" onPress={() => router.push("/sleep")} />
      </ScrollView>

      <View style={styles.supports} onLayout={(event) => setSupportsY(event.nativeEvent.layout.y)}>
        <Text style={styles.supportsKicker}>ПІД ЦІЛЬ: {state.goalTitle.toUpperCase()}</Text>
        <View style={styles.supportsHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportsTitle}>Мої кроки</Text>
            <Text style={styles.supportsSub}>Ось дії, які ти обрав для свого дня.</Text>
          </View>
          <View>
            <Text style={styles.supportsCount}>{doneCount} із 3</Text>
            <Text style={styles.supportsCountLabel}>зроблено</Text>
          </View>
        </View>
        <SupportRow emoji="🍽" title="Мій щоденник їжі" sub={foodDone ? `Зроблено: ${plural(day.meals.length, "запис", "записи", "записів")} · план: 1 запис` : "План: 1 запис"} done={foodDone} onPress={() => router.push("/diary")} />
        <SupportRow emoji="🏃" title="Рух у моєму темпі" sub={day.moveDone ? "Зроблено" : "Дані зі щоденника"} done={day.moveDone} onPress={() => router.push("/move")} />
        <SupportRow emoji="🌙" title="Турбота про сон" sub={day.sleepDone ? "Зроблено: 1 запис · план: 1 запис" : "План: 1 запис"} done={day.sleepDone} onPress={() => router.push("/sleep")} />
      </View>
    </ScrollView>
  );
}

function SupportRow({ emoji, title, sub, done, onPress }: { emoji: string; title: string; sub: string; done: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.supportRow} onPress={onPress}>
      <Text style={styles.supportEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportSub}>{sub}</Text>
      </View>
      {done ? <View style={styles.check}><Text style={styles.checkMark}>✓</Text></View> : <Text style={styles.supportArrow}>↗</Text>}
    </Pressable>
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingBottom: 130, gap: 14 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  kicker: { color: "#8A84C8", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  hello: { fontSize: 30, fontWeight: "800", letterSpacing: -1.1, color: theme.ink, marginTop: 2 },
  dateControl: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.white, borderRadius: 14, paddingHorizontal: 6, paddingVertical: 8 },
  chevron: { fontSize: 22, color: theme.ink, paddingHorizontal: 4 },
  dateText: { fontSize: 13, fontWeight: "700", color: theme.ink },
  disabled: { opacity: 0.35 },
  cover: { backgroundColor: NAVY, borderRadius: 26, padding: 20, flexDirection: "row", gap: 12, shadowColor: "#1C2038", shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 12 } },
  coverKicker: { color: LIME, fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  coverDay: { color: "#fff", fontSize: 34, fontWeight: "800", letterSpacing: -1.2, marginTop: 8 },
  coverTotal: { color: "#A7ADC4", fontSize: 20, fontWeight: "700" },
  coverGoal: { color: "#fff", fontSize: 18, fontWeight: "700", marginTop: 6 },
  coverButton: { alignSelf: "flex-start", marginTop: 16, backgroundColor: LIME, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  coverButtonText: { color: "#2A3320", fontWeight: "800", fontSize: 13 },
  coverArt: { width: 78, alignItems: "center", justifyContent: "center", gap: 8 },
  coverTile: { width: 64, height: 64, borderRadius: 18, backgroundColor: LIME, alignItems: "center", justifyContent: "center" },
  coverMotto: { color: "#C9D0EA", fontSize: 8, fontWeight: "800", letterSpacing: 0.4, textAlign: "center" },
  energy: { borderRadius: 23, padding: 18 },
  energyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  energyPill: { backgroundColor: "#FFF6EC", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  energyPillText: { fontWeight: "700", color: "#6A4A3A", fontSize: 13 },
  salad: { fontSize: 26 },
  energyKicker: { marginTop: 16, color: "#8A6554", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  readout: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  energyValue: { fontSize: 52, fontWeight: "800", letterSpacing: -2.4, color: "#413027", lineHeight: 56 },
  energyUnit: { color: "#7A5C4C", fontSize: 16, fontWeight: "700", marginTop: -2 },
  energyNote: { color: "#7A5C4C", fontSize: 14, marginTop: 6 },
  ringWrap: { width: 96, height: 96, alignItems: "center", justifyContent: "center" },
  ringLabel: { position: "absolute", alignItems: "center" },
  ringValue: { fontSize: 18, fontWeight: "800", color: VIOLET },
  ringCaption: { fontSize: 9, fontWeight: "700", color: "#8A7CC8", textAlign: "center", lineHeight: 11 },
  targetRow: { marginTop: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  targetTitle: { color: "#413027", fontWeight: "800", fontSize: 15 },
  targetSub: { color: "#8A6554", fontSize: 12, marginTop: 2 },
  targetButton: { backgroundColor: "#FFF6EC", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  targetButtonText: { color: "#6A4A3A", fontWeight: "800" },
  macroHead: { marginTop: 16 },
  macroTitle: { color: "#413027", fontWeight: "800", fontSize: 15 },
  macroSub: { color: "#8A6554", fontSize: 12, marginTop: 2 },
  macros: { flexDirection: "row", gap: 8, marginTop: 10 },
  macro: { flex: 1, backgroundColor: "#FFF6EECC", borderRadius: 16, padding: 10 },
  macroNameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  macroDot: { width: 7, height: 7, borderRadius: 4 },
  macroName: { color: "#8A6A58", fontSize: 12 },
  macroValue: { fontSize: 18, fontWeight: "800", color: "#413027", marginTop: 6 },
  macroUnit: { fontSize: 12, fontWeight: "600" },
  tools: { flexDirection: "row", gap: 10, marginTop: 16 },
  snap: { flex: 1, backgroundColor: "#2C315B", borderRadius: 17, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 68 },
  snapTitle: { color: theme.white, fontWeight: "800", fontSize: 16 },
  snapSub: { color: "#D5D8EA", fontSize: 12, marginTop: 2 },
  snapArrow: { color: theme.white, fontSize: 18 },
  manual: { width: 78, backgroundColor: "#FFFDF7", borderRadius: 17, alignItems: "center", justifyContent: "center" },
  manualPlus: { fontSize: 22, color: "#795E50", fontWeight: "600" },
  manualText: { fontSize: 12, color: "#795E50", fontWeight: "700" },
  reward: { backgroundColor: theme.white, borderRadius: 28, padding: 18, shadowColor: "#20243A", shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
  rewardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  calendarKicker: { color: VIOLET, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  pathPill: { backgroundColor: "#EFEDFF", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  pathPillText: { color: "#4137CE", fontWeight: "800", fontSize: 12 },
  rewardTitle: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8, color: theme.ink, marginTop: 10 },
  rewardSub: { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  stats: { flexDirection: "row", gap: 8, marginTop: 14 },
  statNavy: { flex: 1, backgroundColor: NAVY, borderRadius: 14, padding: 12 },
  statNavyText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  statLime: { flex: 1, backgroundColor: LIME, borderRadius: 14, padding: 12 },
  statLimeText: { color: "#243018", fontWeight: "800", fontSize: 13 },
  monthRow: { marginTop: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthChevron: { fontSize: 26, color: theme.ink, paddingHorizontal: 8 },
  monthTitle: { fontSize: 18, fontWeight: "800", color: theme.ink },
  monthMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  weekday: { width: "14.28%", textAlign: "center", color: theme.muted, fontSize: 12, marginBottom: 6 },
  legend: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendFull: { width: 14, height: 14, borderRadius: 4, backgroundColor: "#8D78FF" },
  legendToday: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.8, borderColor: "#9E8AFA", backgroundColor: "#F5F1FF" },
  legendText: { color: theme.muted, fontSize: 12, fontWeight: "700" },
  strike: { marginTop: 14, backgroundColor: VIOLET, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  strikeTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  strikeSub: { color: "#E4E0FF", fontSize: 12, marginTop: 3 },
  disabledButton: { opacity: 0.45 },
  weekCard: { backgroundColor: "#DFFF8E", borderRadius: 24, padding: 18 },
  trainingCard: { borderRadius: 23, padding: 18 },
  voiceCard: { borderRadius: 22, padding: 18 },
  cardEmoji: { fontSize: 22, marginBottom: 8 },
  cardKicker: { color: "#5E6A32", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  cardKickerDark: { color: "#5C5678", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  cardTitle: { color: theme.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.6, marginTop: 6 },
  cardSub: { color: "#4E554C", fontSize: 14, marginTop: 4 },
  stepsCard: { backgroundColor: "#E0F4A5", borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  stepsTitle: { color: "#222836", fontSize: 18, fontWeight: "800" },
  stepsSub: { color: "#3E4A38", fontSize: 13, marginTop: 2 },
  stepsArrow: { color: "#222836", fontSize: 22 },
  coach: { backgroundColor: "#F1EAFF", borderRadius: 18, padding: 15, flexDirection: "row", alignItems: "center", gap: 12 },
  coachKicker: { color: "#786291", fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
  coachTitle: { color: "#292A48", fontSize: 16, fontWeight: "800", marginTop: 3 },
  coachSub: { color: "#746779", fontSize: 12, marginTop: 2 },
  coachArrow: { color: "#8A6AB6", fontSize: 22 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  sectionLink: { color: theme.blue, fontWeight: "700", fontSize: 13 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  quick: { width: "47.5%", borderRadius: 21, minHeight: 142, padding: 17 },
  quickIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#FFFFFF99", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  quickIconInk: { backgroundColor: "#FFFFFF22" },
  quickTitle: { fontSize: 16, fontWeight: "800" },
  quickSub: { marginTop: 4, fontSize: 13, opacity: 0.85 },
  banner: { borderRadius: 27, minHeight: 220, backgroundColor: "#343BEA", overflow: "hidden", padding: 23 },
  bannerPhoto: { position: "absolute", right: -30, top: -40, width: "78%", height: "150%" },
  bannerKicker: { color: "#E2DCFF", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  bannerTitle: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -1, lineHeight: 34, marginTop: 16 },
  bannerButton: { alignSelf: "flex-start", marginTop: 16, backgroundColor: LIME, borderRadius: 13, minHeight: 43, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 10 },
  bannerButtonText: { color: "#3E482B", fontWeight: "800" },
  badge: { position: "absolute", right: 16, top: 16, width: 72, height: 72, borderRadius: 19, backgroundColor: "#E1FF86", alignItems: "center", justifyContent: "center", transform: [{ rotate: "10deg" }] },
  spaces: { gap: 10, paddingRight: 18 },
  space: { width: 168, minHeight: 150, borderRadius: 20, padding: 15, overflow: "hidden" },
  spaceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  spaceName: { fontWeight: "700", color: theme.ink, fontSize: 14 },
  spaceIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#FFFFFFB0", alignItems: "center", justifyContent: "center" },
  spaceValue: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, color: theme.ink, marginTop: 18 },
  spaceSub: { color: theme.ink, opacity: 0.65, fontSize: 12, maxWidth: 110, marginTop: 2 },
  sparkLine: { position: "absolute", right: 8, bottom: 12, opacity: 0.35 },
  supports: { backgroundColor: theme.white, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: "#E7EADE" },
  supportsKicker: { color: VIOLET, fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  supportsHead: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginTop: 8 },
  supportsTitle: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6, color: theme.ink },
  supportsSub: { color: theme.muted, fontSize: 14, marginTop: 4 },
  supportsCount: { fontSize: 20, fontWeight: "800", color: theme.ink, textAlign: "right" },
  supportsCountLabel: { color: theme.muted, fontSize: 12, textAlign: "right" },
  supportRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#EEF0E6" },
  supportEmoji: { fontSize: 22, width: 32 },
  supportTitle: { fontSize: 15, fontWeight: "800", color: theme.ink },
  supportSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  supportArrow: { color: theme.muted, fontSize: 18 },
  check: { width: 26, height: 26, borderRadius: 8, backgroundColor: "#8B75E8", alignItems: "center", justifyContent: "center" },
  checkMark: { color: "#fff", fontWeight: "800" },
});
