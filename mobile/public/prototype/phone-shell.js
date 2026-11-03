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
if (state.demo) {
  try { localStorage.removeItem(KEY); } catch (error) {}
  state = freshUser();
}
try { render(); } catch (error) {}
if (state.needsSetup || (!state.startChoices && !diaryHasMeals())) openStartFlow();
