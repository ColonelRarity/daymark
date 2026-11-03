/* Interface language and grammatical address.
   Ukrainian stays the source. English is a phrase layer on the screens.
   Sex picks one Ukrainian form instead of showing both. */

const LANG_KEY = "daymark-lang";

function uiLang() {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "uk";
  } catch (error) {
    return "uk";
  }
}

function uiSex() {
  const sex = state && state.profile && state.profile.sex;
  return sex === "female" || sex === "male" ? sex : "";
}

const UI_PHRASES = [
  ["Сьогодні на головній цифра може зрости: від тренування в щоденнику, від кроків понад план або від активних ккал годинника. Менше руху порцію не зменшує.", "Today’s number on the home screen can go up after a logged workout, extra steps, or Watch active calories. Moving less does not shrink the portion."],
  ["Цифра виходить із різниці ваги і дати. Звичайний день уже включає обрану активність.", "The number comes from the weight gap and the date. A typical day already includes the activity you chose."],
  ["Жіноча і чоловіча формули різняться приблизно на 160 ккал обміну в спокої. Середину більше не підставляємо.", "The female and male formulas differ by about 160 kcal of resting burn. We no longer use a midpoint."],
  ["Обери стать. Від неї залежить формула і те, як Daymark до тебе звертається.", "Choose sex. It sets the formula and how Daymark addresses you."],
  ["Потрібна для формули і для того, як Daymark до тебе звертається. Без статі план не рахуємо.", "Needed for the formula and for how Daymark addresses you. Without sex we do not calculate a plan."],
  ["Кроки iPhone підставляються самі. Тренування в щоденнику і кільце Move з годинника піднімають сьогоднішню цифру їжі. Прямий доступ до Apple Health на цьому акаунті розробника недоступний, тож активні ккал годинника вносяться з кільця Move.", "iPhone steps come in on their own. A logged workout and the Watch Move ring raise today’s food number. Direct Apple Health access is not available on this developer account, so Watch active calories are entered from the Move ring."],
  ["Цифра Move з Apple Watch замінює оцінку тренувань і кроків за цей день, а не додається зверху.", "The Apple Watch Move number replaces the workout and step estimate for that day. It is not added on top."],
  ["Активні ккал з годинника вищі за звичайний день", "Watch active calories are above a typical day"],
  ["За тренуванням у щоденнику", "From the workout in the diary"],
  ["Оцінка за типом і часом, не вимір годинника", "Estimated from type and duration, not a watch measurement"],
  ["Кроків більше, ніж у плані. Додаємо обережно — це не годинник", "More steps than the plan. Added cautiously — this is not a watch"],
  ["Кроків більше, ніж у плані. Додаємо обережно", "More steps than the plan. Added cautiously"],
  ["Годинник уже вписаний у звичайний день", "The watch is already inside a typical day"],
  ["ккал лише на цей день", "kcal for this day only"],
  ["Сьогодні з урахуванням руху", "Today, including movement"],
  ["Орієнтир на день", "Daily target"],
  ["не жорсткий ліміт", "not a hard limit"],
  ["Спочатку обери жіночу або чоловічу формулу.", "Choose the female or male formula first."],
  ["Обери жіночу або чоловічу стать, щоб іти далі.", "Choose female or male to continue."],
  ["Перерахувати мій план", "Recalculate my plan"],
  ["Жіноча формула", "Female formula"],
  ["Чоловіча формула", "Male formula"],
  ["Мій план", "My plan"],
  ["МІЙ ПЛАН", "MY PLAN"],
  ["МІЙ СТАРТ", "MY START"],
  ["СЬОГОДНІ ПІД ЦІЛЬ", "TODAY, FOR THE GOAL"],
  ["Далі: про мене", "Next: about me"],
  ["Далі: мій ритм", "Next: my rhythm"],
  ["Отримати мій план", "Get my plan"],
  ["Почати з цим планом", "Start with this plan"],
  ["Якої зміни ти хочеш?", "What change do you want?"],
  ["Схуднути й побачити зміни", "Lose weight and see a change"],
  ["Збудувати сильне тіло", "Build a strong body"],
  ["Набрати вагу впевнено", "Gain weight with confidence"],
  ["Зберегти форму й ритм", "Keep my shape and rhythm"],
  ["Повернутися до комфортної ваги", "Return to a comfortable weight"],
  ["Стати сильнішою", "Get stronger"],
  ["Стати сильнішим", "Get stronger"],
  ["Стати витривалішою", "Build stamina"],
  ["Стати витривалішим", "Build stamina"],
  ["Переважно сиджу", "Mostly sitting"],
  ["Часто гуляю", "I walk a lot"],
  ["Тренуюся 2–3 рази", "I train 2–3 times"],
  ["Дуже рухливі дні", "Very active days"],
  ["Як до тебе звертатися?", "What should we call you?"],
  ["Бажана вага", "Goal weight"],
  ["Вага зараз", "Weight now"],
  ["Дата цілі", "Goal date"],
  ["Моя звичайна активність", "My usual activity"],
  ["Мій щоденник їжі", "My food diary"],
  ["ВНЕСЕНО СЬОГОДНІ", "LOGGED TODAY"],
  ["Додай перший прийом їжі", "Add the first meal"],
  ["до орієнтира", "to the target"],
  ["від орієнтира", "of the target"],
  ["Білки · жири · вуглеводи", "Protein · fat · carbs"],
  ["Білки", "Protein"],
  ["Жири", "Fat"],
  ["Вуглеводи", "Carbs"],
  ["Внести їжу вручну", "Log food manually"],
  ["Ідеї їжі", "Food ideas"],
  ["Щоденник", "Diary"],
  ["Мій шлях", "My path"],
  ["Сфоткай", "Snap"],
  ["Сьогодні", "Today"],
  ["Привіт", "Hello"],
  ["Мій профіль", "My profile"],
  ["Закрити", "Close"],
  ["Назад", "Back"],
  ["Зберегти", "Save"],
  ["ккал", "kcal"],
  ["МОВА", "LANGUAGE"],
  ["СТАТЬ", "SEX"],
  ["Жінка", "Female"],
  ["Чоловік", "Male"],
  ["Жіноча", "Female"],
  ["Чоловіча", "Male"],
  ["УТОЧНИТИ", "ADJUST"],
  ["Вік", "Age"],
  ["Зріст", "Height"],
  ["Вага", "Weight"],
  ["Бажана", "Goal"],
  ["Їжа", "Food"],
  ["Рух", "Movement"],
  ["Строк", "Timing"],
  ["Кожен закреслений день — ще один день, коли ти зробила крок до цілі.", "Every marked day is another day you stepped toward the goal."],
  ["Кожен закреслений день — ще один день, коли ти зробив крок до цілі.", "Every marked day is another day you stepped toward the goal."],
  ["Ось дії, які ти обрала для свого дня.", "Here are the actions you chose for your day."],
  ["Ось дії, які ти обрав для свого дня.", "Here are the actions you chose for your day."],
  ["Я готова далі", "I’m ready to continue"],
  ["Я готовий далі", "I’m ready to continue"],
  ["Ти зробила це!", "You did it!"],
  ["Ти зробив це!", "You did it!"],
  ["Налаштування збережено", "Settings saved"],
  ["Мій план калорій і БЖВ", "My calorie and macro plan"],
  ["Розрахувати за параметрами й активністю", "Calculate from your stats and activity"],
  ["Зберегти налаштування", "Save settings"],
  ["Мій контекст і помічник", "My context and coach"],
  ["Активність, параметри, БЖВ і підказки", "Activity, stats, macros, and tips"],
  ["Тут усе по-твоєму.", "This space is yours."],
  ["Мій орієнтир, ккал", "My calorie target"],
  ["Орієнтир кроків", "Step target"],
  ["Мої пристрої", "My devices"],
  ["Мої дані", "My data"],
  ["У прототипі кроки, тренування й сон вносяться вручну. Доступ до пристроїв не запитується.", "iPhone steps come in from the phone. Workouts and the Watch Move ring also change today’s food."],
  ["Зберігаються на цьому пристрої в браузері. Без хмарної синхронізації.", "Stored on this device. No cloud sync."],
  ["Локальне збереження працює.", "Local saving works."],
  ["Завантажити копію", "Download a copy"],
  ["Повернути демонстраційні дані", "Restore demo data"],
  ["Фокус харчування", "Food focus"],
  ["Звичайний щоденник", "Regular diary"],
  ["Гнучкий режим", "Flexible mode"],
  ["Акцент на вуглеводах / кето", "Lower carb / keto"],
  ["Необов’язково", "Optional"],
  ["Нова ціль", "New goal"],
  ["Їжу, напій чи етикетку", "Food, a drink, or a label"],
  ["Мій план на 7 днів", "My 7-day plan"],
  ["Побажання, продукти, час — усе врахуємо", "Preferences, foods, and timing — all included"],
  ["Ще не внесено", "Nothing logged yet"],
  ["кроків у своєму темпі", "steps at your pace"],
  ["їжа з увагою", "food, noticed"],
  ["час на відновлення", "time to recover"],
  ["Що зробити сьогодні", "What to do today"],
  ["Почнемо з одного запису", "Start with one entry"],
  ["Сон, харчування, рух і твій прогрес", "Sleep, food, movement, and your progress"],
  ["Тримай курс.", "Stay with it."],
  ["Крок за кроком.", "One step at a time."],
  ["Цілі, рух і звички — в одному місці.", "Goals, movement, and habits in one place."],
  ["Мій рух", "My movement"],
  ["Усі екрани", "All screens"],
  ["Попередній день", "Previous day"],
  ["Наступний день", "Next day"],
  ["Попередній місяць", "Previous month"],
  ["Наступний місяць", "Next month"],
  ["Харчування", "Food"],
  ["Весь шлях", "The whole path"],
  ["Моя позначка вже є", "Today is marked"],
  ["Маленькі перемоги.", "Small wins."],
  ["позначок", "marks"],
  ["Цей тиждень", "This week"],
  ["Увесь місяць ↓", "Whole month ↓"],
  ["Згорнути ↑", "Collapse ↑"],
  ["Мої опори", "My supports"],
  ["Мій набір під мою ціль", "My set for my goal"],
  ["Сила малих дій", "The strength of small actions"],
  ["ТВОЇ РІШЕННЯ. ТВІЙ РИТМ.", "YOUR CHOICES. YOUR PACE."],
  ["МЕНЮ + ТРЕНУВАННЯ", "MENU + TRAINING"],
  ["ПОМІЧНИК ДНЯ", "DAY COACH"],
  ["АВТООНОВЛЕННЯ", "UPDATES ITSELF"],
  ["Раз на тиждень Daymark просить зважитись. Нова вага оновлює той самий план, меню й ідеї їжі.", "Once a week Daymark asks you to weigh in. The new weight updates the same plan, menu, and food ideas."],
  ["Одна цифра на цей тиждень.", "One number for this week."],
  ["Краще зранку, в схожих умовах. Від неї оновиться план, а меню й ідеї їжі візьмуть ту саму цифру.", "Morning works best, in similar conditions. The plan updates from it, and the menu and food ideas use the same number."],
  ["Зберегти вагу", "Save weight"],
  ["Час зважитись", "Time to weigh in"],
  ["Одна ранкова цифра. План, меню й ідеї їжі оновляться від неї.", "One morning number. The plan, menu, and food ideas update from it."],
  ["Внести вагу", "Log weight"],
  ["Зважитись", "Weigh in"],
  ["РАЗ НА ТИЖДЕНЬ", "ONCE A WEEK"],
  ["ЇЖА ЦЬОГО ДНЯ", "FOOD FOR THIS DAY"],
  ["Калорії з твого плану", "Calories from your plan"],
  ["Відкрити мій план", "Open my plan"],
  ["Заповнити мій план", "Fill in my plan"],
  ["Меню візьме вже відому цифру.", "The menu will use the number you already have."],
  ["Стать, вік, вага й активність живуть в одному плані. Тут лише смак і зручний рух.", "Sex, age, weight, and activity live in one plan. Here you only choose taste and a comfortable way to move."],
  ["У день із тренуванням страви будуть щільніші. Змінити дані можна в плані, не тут.", "Meals are heartier on a training day. Change your details in the plan, not here."],
  ["Спершу одна анкета.", "One setup, first."],
  ["Плану ще немає", "There is no plan yet"],
  ["Стать, вік, вага й активність вводяться один раз.", "Sex, age, weight, and activity are entered once."],
  ["Порції зібрані під ту саму цифру, що на головній. У день із тренуванням меню щільніше.", "Portions follow the same number as the home screen. The menu is heartier on a training day."],
  ["Спочатку заповни план один раз — і меню отримає твою цифру. Зараз страви без персональної калорійності.", "Fill in the plan once and the menu gets your number. For now the meals have no personal calories."],
  ["Звичайний день", "Typical day"],
  ["День із тренуванням зібраний щільніше.", "A training day is built heartier."],
  ["Орієнтир плану змінився. Онови тиждень, щоб порції зійшлися з новою цифрою.", "The plan number changed. Update the week so the portions match the new number."],
  ["Звідки цифра меню?", "Where does the menu number come from?"],
  ["під твій прийом", "close to your meal"],
  ["легше за прийом", "lighter than your meal"],
  ["щільніше за прийом", "heartier than your meal"],
  ["ПІД ТВІЙ ДЕНЬ", "FOR YOUR DAY"],
  ["Ідеї без жорсткої цифри", "Ideas without a hard number"],
  ["на прийом", "per meal"],
  ["ккал на цей день, разом із рухом", "kcal for this day, movement included"],
  ["Страви під ту саму цифру, що й день.", "Meals for the same number as the day."],
  ["Один план для всього додатка", "One plan for the whole app"],
  ["Натисни, щоб змінити або прибрати позначку", "Tap to change or remove the mark"],
  ["Цілі, рух і звички —", "Goals, movement, and habits —"],
  ["в одному місці.", "in one place."],
  ["день закреслено", "day marked"],
  ["позначити день", "mark the day"],
  ["Рух у моєму темпі", "Movement at my pace"],
  ["Турбота про сон", "Sleep care"],
  ["Твій план руху на тиждень", "Your movement plan for the week"],
  ["Подивитися всі мої кроки", "See all my actions"],
  ["День відпочинку", "Rest day"],
  ["Зроблено", "Done"],
  ["Відкрити", "Open"],
  ["День", "Day"],
  ["Сон", "Sleep"],
  ["хв", "min"],
  ["ПРОГРАМ", "PROGRAMS"],
  ["закреслено", "marked"],
  ["рази", "times"],
  ["Відкрити мої кроки", "Open my actions"],
  ["МЕДИТАЦІЇ ТА АФІРМАЦІЇ", "MEDITATIONS AND AFFIRMATIONS"],
  ["Заспокойся. Налаштуйся. Повір у себе.", "Settle. Focus. Trust yourself."],
  ["Для ранку, важкого дня або складного періоду", "For the morning, a hard day, or a difficult stretch"],
  ["ВНЕСЕНО СЬОГОДНІ", "LOGGED TODAY"],
  ["Орієнтир на день", "Today’s target"],
  ["не жорсткий ліміт", "not a hard limit"],
  ["Білки · жири · вуглеводи", "Protein · fat · carbs"],
  ["за внесеними стравами", "from logged meals"],
  ["Білки", "Protein"],
  ["Жири", "Fat"],
  ["Вуглеводи", "Carbs"],
  ["Енергія сьогодні", "Energy today"],
  ["від орієнтира", "of the target"],
  ["свій темп", "your pace"],
  [" г", " g"],
  ["Анімація", "Animation"],
  ["Таймер паузи", "Fasting timer"],
  ["Для твого ритму", "For your rhythm"],
  ["Усі простори", "All spaces"],
  ["Мої кроки", "My actions"],
  ["Мої простори", "My spaces"],
  ["Що я їм?", "What am I eating?"],
  ["Знайти продукт", "Find a food"],
  ["Є етикетка?", "Got a label?"],
  ["Розрахуй порцію", "Calculate a portion"],
  ["Що приготувати?", "What should I cook?"],
  ["Тарілки під ціль", "Plates for the goal"],
  ["Внести", "Log"],
  ["Порахувати", "Calculate"],
  ["Звертаємось до тебе в жіночому роді.", "We’ll address you in the feminine."],
  ["Звертаємось до тебе в чоловічому роді.", "We’ll address you in the masculine."]
];

const UI_FEMALE = [
  ["Кожен закреслений день — ще один день, коли ти зробив крок до цілі.", "Кожен закреслений день — ще один день, коли ти зробила крок до цілі."],
  ["Ось дії, які ти обрав для свого дня.", "Ось дії, які ти обрала для свого дня."],
  ["Я готова / готовий далі", "Я готова далі"],
  ["Ти зробила / зробив це!", "Ти зробила це!"],
  ["готова або готовий", "готова"],
  ["готова / готовий", "готова"],
  ["не впевнена / не впевнений", "не впевнена"],
  ["не впевнений / не впевнена", "не впевнена"],
  ["робив / робила", "робила"],
  ["ліг / лягла", "лягла"],
  ["прокинувся / прокинулася", "прокинулася"],
  ["Відновився / відновилася", "Відновилася"],
  ["сама / сам", "сама"],
  ["Стати сильнішою", "Стати сильнішою"],
  ["Стати витривалішою", "Стати витривалішою"],
  ["ти зробив", "ти зробила"],
  ["ти обрав", "ти обрала"]
];

const UI_MALE = [
  ["Я готова / готовий далі", "Я готовий далі"],
  ["Ти зробила / зробив це!", "Ти зробив це!"],
  ["готова або готовий", "готовий"],
  ["готова / готовий", "готовий"],
  ["не впевнена / не впевнений", "не впевнений"],
  ["не впевнений / не впевнена", "не впевнений"],
  ["робив / робила", "робив"],
  ["ліг / лягла", "ліг"],
  ["прокинувся / прокинулася", "прокинувся"],
  ["Відновився / відновилася", "Відновився"],
  ["сама / сам", "сам"],
  ["Стати сильнішою", "Стати сильнішим"],
  ["Стати витривалішою", "Стати витривалішим"]
];

function uiSwap(text, from, to) {
  if (!from || from === to || text.indexOf(from) < 0) return text;
  const letters = /[0-9A-Za-z\u0400-\u04FF\u2019']/u;
  const words = /[A-Za-z\u0400-\u04FF\u2019']/u;
  let out = "";
  let index = 0;
  while (index < text.length) {
    const at = text.indexOf(from, index);
    if (at < 0) return out + text.slice(index);
    const before = at > 0 ? text[at - 1] : "";
    let afterAt = at + from.length;
    while (text[afterAt] === " " || text[afterAt] === "\u00a0") afterAt += 1;
    const after = text[afterAt] || "";
    if ((before && letters.test(before)) || (after && words.test(after))) {
      out += text.slice(index, at + 1);
      index = at + 1;
      continue;
    }
    out += text.slice(index, at) + to;
    index = at + from.length;
  }
  return out;
}

function voiceUk(text) {
  const pairs = (uiSex() === "female" ? UI_FEMALE : uiSex() === "male" ? UI_MALE : []).slice().sort((a, b) => b[0].length - a[0].length);
  return pairs.reduce((value, pair) => uiSwap(value, pair[0], pair[1]), text);
}

function translateUi(text) {
  const pairs = UI_PHRASES.slice().sort((a, b) => b[0].length - a[0].length);
  return pairs.reduce((value, pair) => uiSwap(value, pair[0], pair[1]), text);
}

function present(text) {
  const value = String(text == null ? "" : text);
  if (uiLang() === "en") return translateUi(value);
  return voiceUk(value);
}

function patchPresent(element) {
  if (!element || element.dataset.present === "1") return;
  element.dataset.present = "1";
  const proto = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
  Object.defineProperty(element, "innerHTML", {
    configurable: true,
    set(value) { proto.set.call(this, present(value == null ? "" : String(value))); },
    get() { return proto.get.call(this); }
  });
}

["view", "bottomNav", "sideNav", "breadcrumb", "modalBody"].forEach(id => patchPresent($(id)));

if (typeof openModal === "function") {
  const openModalRaw = openModal;
  openModal = function (eyebrow, html) {
    openModalRaw(present(eyebrow || ""), html);
  };
}

if (typeof toast === "function") {
  const toastRaw = toast;
  toast = function (message) {
    toastRaw(present(message || ""));
  };
}

function applyChrome() {
  document.documentElement.lang = uiLang() === "en" ? "en" : "uk";
  const close = $("closeModal");
  if (close) close.setAttribute("aria-label", uiLang() === "en" ? "Close" : "Закрити");
  const profile = document.querySelector(".header-profile");
  if (profile) {
    profile.setAttribute("aria-label", uiLang() === "en" ? "My profile" : "Мій профіль");
    profile.textContent = uiLang() === "en" ? "Me" : "Я";
  }
}

if (typeof profileView === "function") {
  const profileBeforeLocale = profileView;
  profileView = function () {
    const sex = uiSex();
    const bar = '<section class="lang-bar"><span>МОВА</span><div><button type="button" data-set-lang="uk" class="' + (uiLang() === "uk" ? "on" : "") + '">Українська</button><button type="button" data-set-lang="en" class="' + (uiLang() === "en" ? "on" : "") + '">English</button></div><span>СТАТЬ</span><div><button type="button" data-set-sex="female" class="' + (sex === "female" ? "on" : "") + '">Жінка</button><button type="button" data-set-sex="male" class="' + (sex === "male" ? "on" : "") + '">Чоловік</button></div></section>';
    return profileBeforeLocale().replace('<div class="profile-grid">', bar + '<div class="profile-grid">');
  };
}

document.addEventListener("click", event => {
  const langButton = event.target.closest("[data-set-lang]");
  if (langButton) {
    try { localStorage.setItem(LANG_KEY, langButton.dataset.setLang === "en" ? "en" : "uk"); } catch (error) {}
    applyChrome();
    if (typeof render === "function") render();
    return;
  }
  const sexButton = event.target.closest("[data-set-sex]");
  if (!sexButton || !state || !state.profile) return;
  state.profile.sex = sexButton.dataset.setSex;
  state.startChoices = state.startChoices || {};
  state.startChoices.sex = state.profile.sex;
  if (state.profile.weight && typeof computeSmartPlan === "function" && typeof applySmartPlan === "function") {
    applySmartPlan(computeSmartPlan(planInputFromState()), { fresh: false });
    if (typeof persist === "function") persist();
  }
  if (typeof render === "function") render();
  if (typeof toast === "function") toast(state.profile.sex === "female" ? "Звертаємось до тебе в жіночому роді." : "Звертаємось до тебе в чоловічому роді.");
});

applyChrome();
