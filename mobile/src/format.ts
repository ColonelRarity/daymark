export function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function shiftISO(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function weekdayMon0(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

export function num(value: number, digits = 0) {
  const negative = value < 0;
  const abs = Math.abs(value);
  const rounded = digits > 0 ? abs.toFixed(digits) : String(Math.round(abs));
  const [whole, fraction] = rounded.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const text = fraction ? `${grouped},${fraction}` : grouped;
  return negative ? `−${text}` : text;
}

const MONTHS = ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
const MONTHS_NOM = ["січень", "лютий", "березень", "квітень", "травень", "червень", "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"];

export function dayLabel(iso: string) {
  const [, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]}`;
}

export function shortDay(iso: string) {
  const [, month, day] = iso.split("-");
  const names = ["січ.", "лют.", "бер.", "квіт.", "трав.", "черв.", "лип.", "серп.", "вер.", "жовт.", "лист.", "груд."];
  return `${Number(day)} ${names[Number(month) - 1]}`;
}

export function addMonthsISO(iso: string, count: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1 + count, 1));
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  cursor.setUTCDate(Math.min(day, last));
  return cursor.toISOString().slice(0, 10);
}

export function daySpan(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
}

export function weekdayShort(iso: string) {
  return ["нд", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

export function sleepHours(bed: string, wake: string) {
  if (!bed || !wake || !bed.includes(":") || !wake.includes(":")) return 0;
  const [bedHour, bedMinute] = bed.split(":").map(Number);
  const [wakeHour, wakeMinute] = wake.split(":").map(Number);
  return (((wakeHour * 60 + wakeMinute - (bedHour * 60 + bedMinute)) + 1440) % 1440) / 60;
}

export function hoursText(hours: number) {
  const mins = Math.round(hours * 60);
  return `${Math.floor(mins / 60)} год ${String(mins % 60).padStart(2, "0")} хв`;
}

export function monthTitle(iso: string) {
  const [year, month] = iso.split("-").map(Number);
  return `${MONTHS_NOM[month - 1]} ${year}`;
}
