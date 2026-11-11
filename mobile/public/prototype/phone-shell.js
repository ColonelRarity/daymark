document.addEventListener("gesturestart", event => event.preventDefault());
document.addEventListener("gesturechange", event => event.preventDefault());

const drawnRecipeArt = recipeArt;
recipeArt = function (recipe, extra = "") {
  const html = drawnRecipeArt(recipe, extra);
  const match = html.match(/url\(([^)]+)\)/);
  if (!match) return html;
  const src = match[1].replace(/['"]/g, "");
  return html.replace(/background-image:url\([^)]+\);?/, "").replace("</div>", '<img src="' + src + '" alt="" decoding="async" draggable="false"></div>');
};

document.addEventListener("error", event => {
  const img = event.target;
  if (!img || img.tagName !== "IMG" || !img.closest(".recipe-art")) return;
  const tries = Number(img.dataset.retry || 0);
  if (tries >= 2) return;
  img.dataset.retry = String(tries + 1);
  const src = img.src.split("?")[0];
  setTimeout(() => { img.src = src + "?retry=" + (tries + 1); }, 350 * (tries + 1));
}, true);

function freshUser() {
  const start = today();
  return {
    version: 1,
    demo: false,
    needsSetup: true,
    profile: { name: "", age: "", height: "", weight: "", targetWeight: "", sex: "", activityLevel: "unknown" },
    settings: { calories: null, steps: 8000, sleep: 8, style: "balanced", fasting: false, motion: true },
    goals: [{
      id: "setup",
      title: "Моя ціль",
      kind: "form",
      start,
      end: months(start, 3),
      habits: ["food", "move", "sleep"],
      minimum: "Один запис їжі",
      checks: {}
    }],
    active: "setup",
    logs: {},
    favorites: [],
    fastingStart: null,
    customFoods: []
  };
}

var finishingSetup = false;
var closeUnlocked = closeModal;
closeModal = function () {
  if (state.needsSetup && !finishingSetup) {
    toast("Спочатку подивись свій план. Параметри можна дописати пізніше.");
    return;
  }
  closeUnlocked();
};
$("modal").addEventListener("cancel", event => {
  if (state.needsSetup && !finishingSetup) event.preventDefault();
});
$("modal").addEventListener("close", () => {
  if (state.needsSetup && !finishingSetup && !$("modal").open) openStartFlow();
});

function diaryHasMeals() {
  return Object.values(state.logs || {}).some(day => day && Array.isArray(day.meals) && day.meals.length);
}
/* No stored copy, or one that did not read: start empty. The stored key is never removed here;
   a copy that failed to read stays under KEY + '.damaged' (see app.js). */
if (state.demo && !hasRealMeals(state) && !state.startChoices && !state.myPlan && !(typeof storageDamaged !== "undefined" && storageDamaged)) {
  state = freshUser();
}
if (typeof restoreKeptMeals === "function") restoreKeptMeals();
try { render(); } catch (error) {}
if (state.needsSetup || (!state.startChoices && !diaryHasMeals())) openStartFlow();
if (typeof storageDamaged !== "undefined" && storageDamaged) {
  setTimeout(() => toast("Попередню копію даних не вдалося прочитати. Вона збережена окремо — у «Моєму просторі» її можна завантажити файлом."), 900);
}
if (window.DaymarkStore && window.DaymarkStore.mode === "native" && window.DaymarkStore.damaged) {
  setTimeout(() => toast("Основний файл даних був пошкоджений. Відновлено останню цілу копію."), 1400);
}

/* The app stays open across midnight. When it comes back, "today" moves with the calendar
   so new food is not written into yesterday. */
let shellToday = today();
function watchDay() {
  const now = today();
  if (now === shellToday) return;
  const wasOnToday = selectedDate === shellToday;
  shellToday = now;
  if (wasOnToday) {
    selectedDate = now;
    monthView = now.slice(0, 7);
    if (!$("modal").open) { try { render(); } catch (error) {} }
  }
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") watchDay(); });
window.addEventListener("focus", watchDay);
window.addEventListener("pageshow", watchDay);
setInterval(watchDay, 60000);
