# Daymark — карта проєкту

Живий продукт на телефоні — це не екрани React Native. `mobile/app/_layout.tsx` відкриває WebView на `http://127.0.0.1:14711/index.html`. Сторінку віддає `PrototypeServer.swift` з копії `mobile/public/prototype/`, яку збірка кладе в бандл. У браузері той самий контракт дає `mobile/scripts/prototype-server.mjs`.

`mobile/app/(tabs)/*.tsx`, `mobile/src/store.tsx` і решта екранів Expo на телефоні не показуються. Зміна їхнього дизайну нічого не змінює в застосунку, доки корінь лишається WebView.

Старіший зріз стану є в `docs/product-audit.md` і `docs/food-base.md`. Цей файл описує код, який зараз збирається. Файли з суфіксом ` 2` (`app 2.js`, `food-catalog 2.js`) — копії iCloud. Їх не підключає `index.html`, їх не треба правити і не треба комітити.

Ключ моделі лежить лише в Keychain телефону або в `mobile/MarkKey.local`. Цей файл у git не входить і в бандл не копіюється. У карті його вмісту немає.

## Як не зламати продукт, міняючи дизайн

Дизайн — це HTML-рядки всередині функцій і файли CSS. Поведінка — це функції, які пишуть у `state` і викликають `persist()`. Можна замінити розмітку й класи. Не можна:

- перейменувати функцію, яку пізніший файл підміняє (`homeApp`, `foodView`, `energyPanel`, `validateState`, `persist`, `render`);
- прибрати `data-action` або `data-view`: кліки розбирає один об’єкт `actions` і делегування в `app.js`;
- писати страву, тренування чи позначку дня іншим шляхом, ніж функції нижче;
- складати кілька джерел калорій дня в одну суму;
- показувати особисте число калорій без статі;
- вважати фото вимірюванням, а орієнтир закладу — офіційним меню.

Пізніший `<script>` у `index.html` перемагає ранній, якщо присвоює ту саму глобальну функцію. Нижче ланцюг підмін. Якщо видалити середній файл, наступний викличе вже не ту версію.

| Функція | Хто написав першим | Хто підмінив, у порядку завантаження |
|---|---|---|
| `homeApp` | `app.js` | `design-pass.js` → `clarity-pass.js` → `start-flow.js` → `weekly-studio.js` → `my-plan.js` → `mark.js` |
| `energyPanel` | `app.js` | `energy-pass.js` |
| `rewardCalendar`, `victoryCalendar`, `journeyView` | `app.js` | `victory-pass.js` |
| `foodView` | `app.js` | `diary-flow.js` → `mark.js` |
| `mealModal`, `closeModal` | `app.js` | `phone-shell.js` (`closeModal`) → `diary-flow.js` |
| `recipeArt` | `app.js` | `phone-shell.js` |
| `profileView` | `app.js` | `account.js` |
| `validateState` | `app.js` | `weekly-studio.js` → `my-plan.js` |
| `render` | `app.js` | `weekly-studio.js` |
| `sportView`, `sportHomeCard` | `sport-coach.js` | `training-studio.js`, потім `weekly-studio.js` знову чіпає `sportView` |
| `trainingStudio` | `training-studio.js` | `design-pass.js` → `visual-system.js` (двічі) |
| `trainingOpen` | `training-studio.js` | `visual-system.js` |
| `supportRows`, `smartHabitPanel`, `supportsView` | `personal-tools.js` | `visual-system.js` → `victory-pass.js` (`supportRows`) → `clarity-pass.js` (`smartHabitPanel`) |
| `weekFormView`, `weekView`, `weekResult` | `weekly-studio.js` | `weekly-refine.js` |
| `planModal` | `personal-tools.js` | `weekly-refine.js` |
| `coachView` | `sport-coach.js` | `weekly-refine.js` |
| `onboardSmartView` | `personal-tools.js` | `weekly-studio.js` → `visual-system.js` |
| `toast` | `app.js` | `clarity-pass.js` лише підміняє один текст |

CSS теж іде шарами: пізніший файл у `<head>` перекриває ранній за тієї самої специфічності. Телефонна рамка, відступ від статус-бару і непрозорий шапка модалки — `phone-shell.css`. Аркуш щоденника — `diary-flow.css`. Марк і «Сфоткай» — `mark.css`.

## Одна цифра дня

`dayEnergy(iso)` у `smart-plan.js` — єдина цифра орієнтира. Повертає `{ base, extra, target, perMeal, meals, note, confidence, maintenance }`.

Джерела `extra` не додаються. Береться найкраще відоме:

1. `watch` — кроки з годинника / телефону (`/health/steps`);
2. `workout` — записане тренування цього дня;
3. `planned` — тренування з плану;
4. інакше лише `base`.

Чий план тренування: спочатку тиждень «Мого плану» (`myPlanWorkoutOn`), потім збережений тиждень `daymark-training-week-v1` (`savedTrainingOn`), і лише потім `state.dayPlan.sessions`.

`energyPanel` у `energy-pass.js` малює цю цифру. `state.settings.calories` — ручний орієнтир, якщо плану немає. Підлога розрахунку: 1500 ккал для жінки, 1700 для чоловіка (`energy-calc.js`, версія правил у коментарі файлу). Без статі особистого числа немає. Догляд і вагітність (`plan.care`) не дають дефіциту й не призначають тренування. Темп без цільової ваги — близько 0,5 кг на тиждень. Це план, не обіцянка ваги на дату.

`EnergyCalc` не читає DOM і не читає `state`. Його викликають `plan-engine.js`, `smart-plan.js` і тести `mobile/scripts/energy/energy-calc.test.mjs`.

## Щоденник їжі

Запис прийому — об’єкт у `log(iso).meals`:

| Поле | Зміст |
|---|---|
| `id` | рядок, `uid()` |
| `name` | українська назва, до 140 символів |
| `type` | `breakfast`, `lunch`, `dinner`, `snack`, `drink` |
| `grams`, `unit` | `g` або `ml` |
| `kcal`, `p`, `f`, `c` | на цю порцію; `null`, якщо невідомо. Невідоме не замінюється нулем |
| `source` | `manual`, `catalog`, `calculated`, `restaurant`, `label`, `user-food`, `reference`, `mark`, `voice`, `photo` |
| `emoji` | символ картки |
| `photo` | лише `data:image/jpeg|png|webp;base64`, до 4 000 000 символів. Інакше `validateState` зрізає фото, але страву лишає |
| `foodRef` | звідки картка: бренд, якість, url, дата |

Хто має право писати страву:

- ручний шлях і каталог: `diaryCommit`, `diaryAddItem`, `catalogMeal` → `mealModal`;
- рецепт у щоденник: дія `recipe-to-diary`;
- тиждень меню: кнопка з `data-slot` викликає `commitPlannedMeal`;
- Марк у чаті: `markSaveMeal` після розбору фрази;
- «Сфоткай»: `snapCommit` лише після кнопки «Записати». До цього є лише чернетка `snapDraft`.

`diary-flow.js` підміняє `foodView` і відкриває аркуш поверх сторінки харчування. «Готово» закриває аркуш: страви вже збережені в момент додавання. Рядок прийомів їжі стоїть під кнопкою, щоб «Готово» її не накривало.

Пошук: `diarySearch` → `diaryMatches` + `diaryScore`. Синоніми в `DIARY_SYNONYMS`. Марк не кличе пошук сирою фразою: `mark-parse.js` прибирає «алло», «точка», «привіт», повтори, а `markMatchFoods` шукає стемами по 1–2 слова і вимагає, щоб стема була в назві, не лише в аліасах.

## База їжі

Усі картки проходять через `allFoods()`:

`customFoods` + `COMMON_PRODUCTS` + `DAYMARK_FOODS` + `GENERIC_DISHES` + `UA_VENUE_FOODS` + `FOOD_CATALOG` + `UA_FOOD_CATALOG` + рецепти як картки `recipeCatalogueFoods()`.

Форма картки описана на початку `food-schema.js`. `quality` вирішує підпис і чесність:

| `quality` | Що казати людині |
|---|---|
| `reference` | довідник Ciqual, на 100 г |
| `common-product` | звичайний продукт, середнє, є `estimateLow` / `estimateHigh` |
| `generic-estimate` | типова страва без закладу |
| `restaurant` | опубліковано закладом (McDonald’s, KFC, частина інших) |
| `restaurant-estimate` | вага типова, калорії — оцінка категорії, не меню кухні |
| `label-community` | етикетка Open Food Facts |
| `user` | власний продукт людини |
| `recipe` | ідея рецепта Daymark |
| `calculated` | конструктор напою або етикетка, яку порахували |

`FOOD_CATALOG` — близько 3815 карток (Ciqual плюс мережі з офіційних сторінок). Назви довідника українською, `originalName` лишається мовою джерела. `UA_FOOD_CATALOG` — близько 313 карток: Пузата Хата (`restaurant`), Япіко (`restaurant-estimate`) і українські етикетки. `venues-ua.js` збирає `UA_VENUE_FOODS`: 51 заклад (піца, суші, бургери, шаурма, кава, пекарні, їдальні, грузинська кухня, вок, салати) і сотні страв з `quality: "restaurant-estimate"`. `COMMON_PRODUCTS` — 766, `GENERIC_DISHES` — 1026. Великий `off-pack.json` не входить у перший екран: `off-search.js` дочитує його за запитом.

`nutritionEstimate()` і старий множник `PLAN_PAL` не повертати. Конструктор напою — `drinkBuilder` / `drinkEstimate` / `saveDrink`.

## План і перший вхід

`PlanEngine.build(answers)` у `plan-engine.js` чистий: ті самі відповіді й той самий понеділок дають той самий план (`seedFrom`). Версія правил у файлі — `plan-1.0`. Розкладка прийомів: 2, 3, 4, 5 або `2s`. Жорсткі умови відсіюють (алерген, плита, медична заборона), м’які лише сортують. Тести: `mobile/scripts/plan/plan-engine.test.mjs`.

`start-flow.js` веде чотири кроки й кличе той самий рушій. Чернетка відповідей — `daymark-start-draft-v1`. `finishStart` збирає профіль і план. Повторний старт не має стирати вже записані страви: `hasRealMeals` / `rememberMeals` це стримують.

`my-plan.js` — екран «Мій план»: меню, тренування, покупки, зважування раз на 7 днів за згодою, історія і відкат. `validateState` тут дописує поля плану, які базова перевірка `app.js` інакше відріже. `restoreSmartExtras` у `smart-plan.js` повертає `dayPlan`, `smartMeta`, `startChoices`, якщо валідатор їх зняв.

`weekly-studio.js` збирає окремий тиждень страв під `dayEnergy`. Кнопка запису в щоденник мусить мати `data-slot`, інакше `commitPlannedMeal` не знатиме прийом.

## Рух

`activity-data.js` — довідник активностей і MET. `sport-coach.js` — щоденник руху, самопочуття, «помічник дня». `training-studio.js` малює бібліотеку програм. `training-flow.js` — плеєр: секунди, пауза, чернетка `daymark-training-draft-v1`, завершення пише тренування в `log().workouts`. `training-evolution.js` — майстер нового тижня й ключ `daymark-training-week-v1`. `training-polish.js` — звукові сигнали плеєра. `training-expansion.js` додає програми в `TRAINING_PLANS`.

Медичне обмеження зупиняє призначення навантаження. Плеєр не обіцяє роботу під замкненим екраном.

## Марк

`mark-parse.js` не пише в щоденник і не ходить у мережу. `MarkParse.parseMealUtterance` повертає тип прийому, намір (`log`, `advice`, `meditation`, `workout`, `emotion`, `off`, `chat`), частку тарілки й шматки фрази. Погода, мода, політика й подібне — `off`, якщо в фразі немає їжі чи тренування. Корінь `вечер` ловить «вечерю».

`mark.js`:

- чат `markHandle` одразу пише знайдені страви через `markSaveMeal` (той самий `persist`);
- «Сфоткай» `snapHandle` лише кладе чернетку; `snapCommit` пише `source: "photo"`;
- у модель іде фраза і короткий підсумок дня, не архів;
- без ключа лишається локальний розбір і каталог; фото тоді йде в CLIP (`photo-recognize.js`, `Xenova/clip-vit-base-patch32`);
- з ключем `POST /mark/chat` і `POST /mark/plate` йдуть на `gpt-4o-mini` через нативний міст.

Голос на телефоні: `POST /mark/listen` (`uk-UA`, до 8 с). У браузері — `webkitSpeechRecognition`, якщо він є.

## Пам’ять

Усе, що починається на `daymark-`, тримає `storage-bridge.js`. У браузері це `localStorage`. На порту `14711` міст дзеркалить ключі в `POST /store`. Запис синхронний (`flushBlocking`), з номером `revision`. Сервер відхиляє запис зі старим номером (`409`). Клієнт тоді читає сервер, `absorbRemoteMeals` зливає страви і пробує ще раз. Порожнє демо не затирає щоденник, якщо `storageDamaged` і справжніх страв немає.

Ключі:

| Ключ | Хто |
|---|---|
| `daymark-concept-v1` | основний `state` |
| `daymark-store-meta` | revision і службове сховища |
| `daymark-concept-v1.before-restore` | копія перед імпортом |
| `daymark-concept-v1.damaged` | зіпсований JSON, не для показу |
| `daymark-lang` | `uk` або `en`. Збережені назви страв лишаються українськими |
| `daymark-wellbeing-v1` | медитації, окремо від `state` |
| `daymark-start-draft-v1` | незакінчений перший вхід |
| `daymark-week-studio-v1` | зібраний тиждень меню |
| `daymark-training-week-v1` | тиждень тренувань |
| `daymark-training-draft-v1` | незакінчений плеєр |
| `daymark-training-preferences-v1` | обмеження й інвентар |

`validateState` у `app.js` — ворота. Пізні файли обгортають її і додають свої поля. Нове поле страви, якого немає у валідаторі, буде відкинуте. Тому `fraction` і `per100` лишаються на чернетці Марка і в збережену страву не копіюються.

`backupBundle` / `restoreBackup` знімають усі ключі `daymark-*`. Відновлення питає підтвердження і кладе поточний стан у `.before-restore`.

## Нативний шар

`AppDelegate` піднімає `PrototypeServer.start()`, а той кличе `DaymarkServices.prepare()`.

`PrototypeServer.swift`:

- `GET/PUT/POST /store` — один JSON, атомарна заміна, попередня ціла копія, `409` на старий revision;
- решта `GET` — файли з `prototype/` бандла, без виходу через `..`;
- `GET /health/steps` — кроки з Core Motion;
- усе, що починається з `/account` і `/mark`, віддає `DaymarkServices` до статичних файлів.

`DaymarkServices.swift`:

| Маршрут | Що робить |
|---|---|
| `GET /account` | чи є вхід Apple або Google |
| `POST /account/apple` | Sign in with Apple. На особистому безкоштовному акаунті Apple це не підписується, кнопку в інтерфейсі прибрано |
| `POST /account/google` | PKCE, `daymark://oauth`. Порожній `DaymarkGoogleClientID` у `Info.plist` дає `google-client`, не вдаваний успіх |
| `POST /account/signout` | забуває токен, щоденник не стирає |
| `GET /mark/status` | чи є ключ у Keychain |
| `POST /mark/key` | записати або стерти ключ. Тіло `{ "key": "sk-…" }` |
| `POST /mark/listen` | мікрофон і розпізнавання |
| `POST /mark/chat` | текст у модель |
| `POST /mark/plate` | фото тарілки в модель |

`importBundledKey` читає лише файл у Documents телефону (`Файли → Daymark → MarkKey.local`). Якщо там є рядок `sk-`, він іде в Keychain (`app.daymark.bezruk`, акаунт `mark-key`), а файл стирається. З бандла ключ не читається і скрипт копіювання прототипу його туди не кладе.

`CODE_SIGN_ENTITLEMENTS` прибрано: особиста команда не підписує Sign in with Apple та iCloud. Файл `Daymark.entitlements` на диску може лишатися, але в збірку не входить. Повертати його в проєкт на цій команді не можна.

`mobile/.gitignore` ігнорує `/ios` і `/android` як згенеровані. Уже відстежувані `project.pbxproj`, `Info.plist`, `PrototypeServer.swift` у git є. Нові Swift-файли треба додавати через `git add -f`.

Збірка: схема `Daymark`, конфігурація Release, один `xcodebuild` за раз, з `mobile/ios` або з `/tmp/daymark-mobile/ios`, якщо Documents ще не дочитаний з iCloud. `Pods` у git немає.

## Мова

`locale.js` тримає `daymark-lang`. `present()` проходить по вже зібраному HTML і підміняє фрази, якщо мова англійська. Стать змінює граматичне звертання. Назви вже записаних страв не перекладаються назад. Первинна мова інтерфейсу — українська.

## Екрани

`navigate(name)` ставить `currentView` і кличе `render()`. Імена в `VIEW_NAMES`: `today`, `journey`, `food`, `move`, `sleep`, `profile`, `goals`, `recipes`, `coach`, `supports`. Нижнє меню: Сьогодні, Мій шлях, Сфоткай (`data-action="photo"`), Ідеї їжі, Щоденник.

| Екран | Функція, яка збирає HTML | Заувага |
|---|---|---|
| Мій день | ланцюг `homeApp` | енергія, календар, кроки, Марк, вхід у тиждень |
| Мій шлях | `journeyView` | позначки `goal.checks[iso]` = `full` або `minimum` |
| Харчування | `foodView` | після `diary-flow.js` це аркуш щоденника |
| Рух | `sportView` | вкладки програм і власного руху |
| Сон | `sleepView` | годинник у `log().sleep` |
| Профіль | `profileView` | акаунт зверху, потім дані й експорт |
| Цілі | `goalsView` | одна активна ціль |
| Рецепти | `recipesView` | фільтри не пишуть у щоденник самі |
| Помічник | `coachView` | сон, їжа, рух, самопочуття |
| Опори / кроки | `supportsView` | частина пунктів сама читає щоденник |
| Тиждень | `weekView` | окремий стан студії |
| Медитації | `daymarkWellbeingView` | свій ключ сховища |
| Перший вхід | `openStartFlow` | шар поверх, поки немає цілі |

Модалки відкриває `openModal(eyebrow, html)`. Закриття під час запису фото блокується прапорцем `modalData.uploadBusy`.

## Файли прототипу

Порядок нижче — порядок `<script>` і `<link>`. Для скриптів це і є порядок підмін.

### Дані, без інтерфейсу

- `recipes-data.js` — `RECIPES`, `RECIPE_INGREDIENTS`, `RECIPE_NUTRITION`. Яйце в розрахунку = 50 г. Калорії рецепта — сума сирих інгредієнтів (`recipeEstimate`), без вигаданих втрат варіння.
- `nutrition-data.js` — таблиці, на які спираються рецепти й частина оцінок.
- `recipe-expansion.js` — дописує рецепти в `RECIPES` до завантаження інтерфейсу.
- `activity-data.js` — активності, MET, групи для вибору тренування.
- `food-catalog.js` — `FOOD_CATALOG`, `FOOD_CATEGORIES`.
- `food-schema.js` — `FoodSchema.validate`, `confidence`, `prep`, `sourceOf`. Єдине місце, де якість картки стає підписом і рівнем довіри.
- `staple-names.js` — українські назви для частини карток Ciqual (`STAPLE_NAMES`) і кілька етикеток, яких не було в довіднику.
- `food-ua-catalog.js` — `UA_FOOD_CATALOG`.
- `venues-ua.js` — `UA_VENUE_FOODS`. Оцінка категорії, поле `review` каже, що це не меню закладу.
- `common-products.js` — `COMMON_PRODUCTS`.
- `generic-dishes.js` — `GENERIC_DISHES`.
- `food-packages.js` — `daymarkFoods()` збирає `DAYMARK_FOODS` і накладає латки.
- `personal-data.js` — шаблони цілей `GOAL_TEMPLATES`, означення опор `SUPPORT_DEFINITIONS`, групи.
- `off-pack.json` — зріз Open Food Facts. Новий дамп не викачувати. `off-meta.js` — службові поля пакета.

### Поведінка

- `sport-coach.js` — рух, сон у картці дня, перевірка самопочуття, макроцілі як орієнтир, екран помічника. `normalizeWorkout` потім звужує `training-studio.js`.
- `training-studio.js` — сітка програм, картка вправи, старт сесії. Частину функцій замінюють пізніші файли.
- `food-tools.js` — каталог, власний продукт, конструктор напою. `catalogueSearch` відкриває модалку. `renderCatalogResults` змішує джерела, щоб перший екран не був стіною одного бренду.
- `personal-tools.js` — опори, їхній розклад, старий майстер плану. `nutritionEstimate` тут історична і не повинна знову стати джерелом цифри дня.
- `app.js` — `state`, валідатор, `persist`, навігація, рецепти, календар, список покупок, демо, експорт. Великий об’єкт `actions` — єдина таблиця кліків.
- `training-flow.js` — плеєр і запис завершеної сесії.
- `training-evolution.js` — конструктор тижня тренувань.
- `wellbeing.js` — медитації й афірмації. Зовнішні імена: `daymarkWellbeingView`, `daymarkOpenWellbeing`.
- `design-pass.js` — обкладинка дня й обкладинка тренувань. Підміняє `homeApp` і `trainingStudio`.
- `visual-system.js` — фото на картках опор і програм. Знову підміняє ті самі функції.
- `clarity-pass.js` — «опори» стають «мої кроки», править один тост і домашній блок.
- `victory-pass.js` — календар перемог і список кроків на сьогодні.
- `energy-pass.js` — картка енергії читає `dayEnergy`.
- `recipe-expansion-ui.js` — домальовує колекції рецептів. Не оголошувати повторно `originalFoodView`: раніше це валило сусідній скрипт.
- `training-expansion.js` — додаткові програми.
- `weekly-studio.js` — тиждень меню. Підміняє `render`, тож сторінка `week` малюється тут, а не в `app.js`.
- `weekly-refine.js` — тексти тижня й форма без зайвої обіцянки.
- `training-polish.js` — звук плеєра.
- `off-search.js` — пошук по великому пакету після локальної бази.
- `photo-recognize.js` — CLIP для тарілки, коли ключа моделі немає. `mark.js` замінює `uploadPlate`, тож кнопка «Сфоткай» іде в `snapOpen`, а CLIP лишається запасним шляхом у `snapFromImage`.
- `energy-calc.js` — `EnergyCalc`.
- `plan-engine.js` — `PlanEngine`.
- `start-flow.js` — перший вхід. Підміняє `homeApp`, щоб показати старт, доки цілі немає.
- `smart-plan.js` — `dayEnergy` і застосування плану до `state`.
- `locale.js` — мова й граматичне звертання.
- `my-plan.js` — «Мій план», зважування, історія. Останній валідатор перед Марком.
- `diary-flow.js` — аркуш щоденника.
- `phone-shell.js` — не стирати справжні страви під час ремонту сховища; ілюстрації рецептів не вилазять з картки; закриття модалки безпечне під час запису.
- `mark-parse.js` — розбір фрази.
- `mark.js` — Марк і «Сфоткай». Останній, хто підміняє `homeApp` і `foodView`: картка Марка на день і посилання «Голос, текст і калорії Марка».
- `account.js` — картка «Мій акаунт» перед «Мої дані». Вихід не чистить щоденник. Google без client id чесно каже, що входу ще немає.

### Сховище і стилі

- `storage-bridge.js` вантажиться першим. `window.DaymarkStore`: `exportAll`, `importAll`, `flushNow`, прапорці `dirty`, `damaged`, `source`.
- `style.css` — базова сітка, рецепти, календар.
- `app-ux.css` — колонка телефона 480px, нижнє меню, прокрутка `#view` з нижнім полем, щоб меню не лягало на останній рядок.
- Далі тематичні CSS з іменами, паралельними скриптам: `sport-coach.css`, `training-*.css`, `food-personal.css`, `wellbeing.css`, `motivation.css`, `design-pass.css`, `visual-system.css`, `clarity-pass.css`, `victory-pass.css`, `theme-icons.css`, `energy-pass.css`, `recipe-expansion.css`, `weekly-studio.css`, `weekly-refine.css`, `training-polish.css`, `phone-shell.css`, `start-flow.css`, `my-plan.css`, `diary-flow.css`, `mark.css`.

У CSS немає розрахунків. Якщо клас зникне з HTML, правило просто не застосується. Небезпечно прибирати клас, на який спирається пізніший скрипт через `querySelector` (`.diary-done`, `.snap-sheet`, `#foodSearch`, `#recipeGrid`, `#modal`, `#view`).

## Скрипти поза сторінкою

- `mobile/scripts/prototype-server.mjs` — той самий `/store`, що й Swift, для браузера. Маршрутів Марка тут немає: голос і модель на комп’ютері не прикидаються телефоном.
- `mobile/scripts/mark/mark-parse.test.mjs` — фраза, частка тарілки, «погода» проти «запиши вечерю», і що старий revision не затирає вечерю.
- `mobile/scripts/energy/energy-calc.test.mjs` — підлога, стать, темп.
- `mobile/scripts/plan/plan-engine.test.mjs` і `load-prototype-plan.mjs` — план відтворюється.
- `mobile/scripts/food-base/` — збірка карток. Новий дамп Open Food Facts не качати звідси без окремого рішення.

## React Native, який зараз не на екрані

Ці файли лишаються в репозиторії, але `_layout.tsx` їх не монтує:

`mobile/app/(tabs)/index.tsx`, `diary.tsx`, `recipes.tsx`, `journey.tsx`, `photo.tsx`, `_layout.tsx`; `mobile/app/coach.tsx`, `week.tsx`, `training.tsx`, `search.tsx`, `sleep.tsx`, `move.tsx`, `profile.tsx`, `onboard.tsx`, `auth.tsx`, `paywall.tsx`, `story.tsx`, `add.tsx`, `label.tsx`, `product.tsx`, `choose.tsx`, `reminders.tsx`, `spaces.tsx`, `wellbeing.tsx`, `photo-review.tsx`, `recipe/[id].tsx`.

`mobile/src/store.tsx` — старий сховище Expo, не `daymark-concept-v1`. `mobile/src/nutrition/*` — паралельний калькулятор, не `EnergyCalc` і не `allFoods()`. Поки корінь — WebView, баги телефона шукати в `prototype/` і Swift, не тут.

## Де шукати баг

| Симптом | Куди дивитися |
|---|---|
| Страва зникла після згортання | `storage-bridge.js` revision, `persist`, `validateState`, чи не відрізав валідатор поле |
| Вечеря є в аркуші й немає на головній | `foodView` / `diaryCommit` пишуть у `log(today())`, а головна читає `totals()` за `selectedDate` |
| Цифра дня стрибає | `dayEnergy`: чи не склались два джерела; чи тиждень тренувань не перебив план |
| «Готово» або шапка налізли на вміст | `diary-flow.css`, `phone-shell.css` (`#modal .modal-top`) |
| Марк записав сиру фразу | `mark-parse.js` `items` / `cleanSpeech`, потім `markMatchFoods`. У «Сфоткай» без збігу стара чернетка має лишитись |
| Фото назвало не ту їжу | без ключа це CLIP у `photo-recognize.js`; з ключем — `/mark/plate` |
| Каталог показує англійську | `localized` і `staple-names.js`. `originalName` навмисно лишається в «Повна назва в джерелі» |
| Заклад виглядає як офіційне меню | має бути `restaurant-estimate` і текст `productNotice` |
| План інший після перезапуску | `PlanEngine` seed; `restoreSmartExtras`; чи не зібрався новий стан із порожнім `logs` |
| Кнопка мовчить | чи є `data-action` в `actions`. Пізні файли додають ключі (`snap-save`, `diary-type`, `week-log`) |
| Google «увійшов» без клієнта | так бути не повинно: порожній `DaymarkGoogleClientID` → `google-client` |
| Збірка не підписується | не повертати entitlements Sign in with Apple / iCloud на особисту команду |

## Каталог функцій

Нижче кожна іменована `function` живих скриптів прототипу. «Згадують» означає, що це слово є в іншому файлі. Короткі імена (`log`, `read`, `save`, `view`, `check`, `body`) інколи збігаються з даними або чужим текстом, тому згадка в `food-catalog.js` чи `off-pack` ще не доводить виклик. Якщо те саме ім’я оголошене у двох файлах, на телефоні працює те, що присвоєне останнім у ланцюжку підмін вище. Внутрішні функції `PlanEngine` і `EnergyCalc` зовні видно як `PlanEngine.build`, `EnergyCalc.estimate` тощо.


### `account.js`

- `accountCard` — лише цей файл.
- `accountCall` — лише цей файл.
- `accountTell` — лише цей файл.

### `app.js`

- `appLocale` — лише цей файл.
- `offset` — згадують `diary-flow.js`, `my-plan.js`, `personal-tools.js`, `plan-engine.js`, `sport-coach.js`, `start-flow.js`, `training-evolution.js`, `victory-pass.js`, `visual-system.js`, `weekly-studio.js`.
- `months` — згадують `food-catalog.js`, `phone-shell.js`, `start-flow.js`, `victory-pass.js`.
- `makeDemo` — лише цей файл.
- `hasRealMeals` — згадують `phone-shell.js`, `start-flow.js`.
- `rememberMeals` — лише цей файл.
- `forgetMeal` — згадують `diary-flow.js`.
- `forgetAllMeals` — лише цей файл.
- `restoreKeptMeals` — згадують `phone-shell.js`.
- `absorbRemoteMeals` — лише цей файл.
- `log` — згадують `diary-flow.js`, `food-catalog.js`, `mark-parse.js`, `mark.js`, `my-plan.js`, `smart-plan.js`, `sport-coach.js`, `training-flow.js`, `training-studio.js`, `weekly-studio.js`.
- `totals` — згадують `diary-flow.js`, `energy-pass.js`, `food-tools.js`, `mark.js`, `my-plan.js`, `personal-tools.js`, `smart-plan.js`, `sport-coach.js`.
- `persist` — згадують `clarity-pass.js`, `diary-flow.js`, `food-tools.js`, `locale.js`, `mark.js`, `my-plan.js`, `personal-tools.js`, `smart-plan.js`, `sport-coach.js`, `start-flow.js` і ще 3.
- `toast` — згадують `account.js`, `clarity-pass.js`, `diary-flow.js`, `food-catalog.js`, `food-tools.js`, `food-ua-catalog.js`, `locale.js`, `mark.js`, `my-plan.js`, `personal-tools.js` і ще 9.
- `navHTML` — згадують `wellbeing.js`.
- `dateControl` — згадують `clarity-pass.js`, `diary-flow.js`, `personal-tools.js`, `sport-coach.js`, `training-studio.js`, `visual-system.js`.
- `pageTop` — згадують `clarity-pass.js`, `diary-flow.js`, `personal-tools.js`, `sport-coach.js`, `training-studio.js`, `victory-pass.js`, `visual-system.js`.
- `ringPanel` — лише цей файл.
- `spark` — згадують `energy-pass.js`, `wellbeing.js`.
- `sleepDuration` — згадують `sport-coach.js`, `weekly-refine.js`.
- `hoursText` — згадують `sport-coach.js`, `weekly-refine.js`.
- `spacesDeck` — лише цей файл.
- `monthCalendar` — лише цей файл.
- `monthTitle` — згадують `victory-pass.js`.
- `calendarKey` — лише цей файл.
- `calendarPanel` — лише цей файл.
- `habitPanel` — лише цей файл.
- `todayView` — лише цей файл.
- `goalCard` — згадують `visual-system.js`.
- `goalsView` — лише цей файл.
- `journeyView` — згадують `victory-pass.js`.
- `mealRows` — лише цей файл.
- `foodView` — згадують `diary-flow.js`, `mark.js`, `recipe-expansion-ui.js`, `smart-plan.js`.
- `fastingCard` — згадують `diary-flow.js`.
- `historyBars` — лише цей файл.
- `sleepView` — лише цей файл.
- `moveView` — лише цей файл.
- `profileView` — згадують `account.js`, `locale.js`.
- `storageStatusLine` — лише цей файл.
- `storagePanel` — лише цей файл.
- `render` — згадують `account.js`, `design-pass.js`, `diary-flow.js`, `locale.js`, `mark.js`, `my-plan.js`, `phone-shell.js`, `recipe-expansion-ui.js`, `smart-plan.js`, `start-flow.js` і ще 6.
- `navigate` — згадують `diary-flow.js`, `personal-tools.js`, `sport-coach.js`, `training-flow.js`, `training-studio.js`, `wellbeing.js`.
- `openModal` — згадують `clarity-pass.js`, `diary-flow.js`, `food-tools.js`, `locale.js`, `mark.js`, `my-plan.js`, `personal-tools.js`, `smart-plan.js`, `sport-coach.js`, `start-flow.js` і ще 6.
- `closeModal` — згадують `diary-flow.js`, `locale.js`, `personal-tools.js`, `phone-shell.js`, `smart-plan.js`, `sport-coach.js`, `training-evolution.js`, `training-flow.js`, `training-studio.js`, `victory-pass.js`.
- `celebrate` — лише цей файл.
- `markModal` — згадують `victory-pass.js`.
- `startOnboarding` — лише цей файл.
- `onboardView` — згадують `weekly-studio.js`.
- `collectOnboard` — згадують `weekly-studio.js`.
- `searchModal` — лише цей файл.
- `renderSearch` — лише цей файл.
- `mealModal` — згадують `diary-flow.js`, `food-tools.js`.
- `portionResult` — згадують `food-tools.js`.
- `photoModal` — згадують `photo-recognize.js`.
- `uploadPlate` — згадують `photo-recognize.js`.
- `bowlArt` — лише цей файл.
- `aiDemo` — лише цей файл.
- `aiTotals` — лише цей файл.
- `aiResult` — лише цей файл.
- `foodAddModal` — лише цей файл.
- `shareModal` — лише цей файл.
- `drawWrapped` — лише цей файл.
- `downloadStory` — лише цей файл.
- `spacesModal` — згадують `clarity-pass.js`, `recipe-expansion-ui.js`.
- `integrationModal` — лише цей файл.
- `plusModal` — лише цей файл.
- `sleepLogModal` — лише цей файл.
- `stepsModal` — лише цей файл.
- `legacyWorkoutModal` — лише цей файл.
- `download` — згадують `weekly-studio.js`.
- `validDate` — згадують `diary-flow.js`, `my-plan.js`, `personal-tools.js`, `smart-plan.js`, `start-flow.js`, `training-evolution.js`, `weekly-studio.js`.
- `validateState` — згадують `my-plan.js`, `weekly-studio.js`.
- `backupBundle` — лише цей файл.
- `restoreBackup` — лише цей файл.
- `recipeExtras` — згадують `start-flow.js`.
- `normalizeRecipeExtras` — лише цей файл.
- `recipeEstimate` — згадують `diary-flow.js`, `food-tools.js`, `mark.js`, `plan-engine.js`, `smart-plan.js`, `weekly-studio.js`.
- `recipeNutrition` — лише цей файл.
- `recipeArt` — згадують `phone-shell.js`, `recipe-expansion-ui.js`, `weekly-studio.js`.
- `recipeSearchText` — лише цей файл.
- `recipeMatches` — лише цей файл.
- `matchedRecipes` — згадують `my-plan.js`, `smart-plan.js`.
- `recipeCard` — згадують `smart-plan.js`.
- `recipeHomeFeature` — згадують `recipe-expansion-ui.js`.
- `recipesView` — згадують `my-plan.js`, `recipe-expansion-ui.js`, `smart-plan.js`, `weekly-studio.js`.
- `renderRecipeResults` — лише цей файл.
- `bindRecipes` — лише цей файл.
- `quantity` — згадують `my-plan.js`, `weekly-studio.js`.
- `recipeModal` — згадують `diary-flow.js`, `recipe-expansion-ui.js`, `weekly-studio.js`.
- `shoppingIngredients` — лише цей файл.
- `shoppingText` — лише цей файл.
- `shoppingModal` — лише цей файл.
- `toggleRecipeSaved` — лише цей файл.
- `recipeRandom` — лише цей файл.
- `energyPanel` — згадують `energy-pass.js`.
- `victoryCalendar` — згадують `training-flow.js`, `victory-pass.js`.
- `rewardCalendar` — згадують `victory-pass.js`.
- `homeApp` — згадують `clarity-pass.js`, `design-pass.js`, `energy-pass.js`, `mark.js`, `my-plan.js`, `recipe-expansion-ui.js`, `smart-plan.js`, `start-flow.js`, `weekly-studio.js`, `wellbeing.js`.
- `appNav` — згадують `wellbeing.js`.
- `calorieTargetModal` — лише цей файл.
- `showVictory` — згадують `victory-pass.js`.
- `quickMark` — лише цей файл.
- `undoLastVictory` — лише цей файл.

### `clarity-pass.js`

- `clarityEditor` — лише цей файл.

### `design-pass.js`

- `homeDayCover` — згадують `energy-pass.js`.
- `trainingCollectionActive` — лише цей файл.

### `diary-flow.js`

- `diaryNormalize` — згадують `mark.js`.
- `diaryTermGroup` — лише цей файл.
- `diaryEditDistanceLE1` — лише цей файл.
- `diaryHaystack` — лише цей файл.
- `diaryMatches` — лише цей файл.
- `diaryKind` — лише цей файл.
- `diaryKindLabel` — лише цей файл.
- `diaryConfidence` — лише цей файл.
- `diaryPrepState` — лише цей файл.
- `diaryScore` — лише цей файл.
- `diarySearch` — згадують `mark.js`.
- `diaryTypeForNow` — згадують `mark.js`.
- `diaryItems` — лише цей файл.
- `diarySum` — лише цей файл.
- `diaryFmt` — лише цей файл.
- `diaryIsLiquid` — лише цей файл.
- `diaryUnit` — лише цей файл.
- `diaryMealSection` — лише цей файл.
- `diaryDaySummary` — лише цей файл.
- `diaryWaterPanel` — лише цей файл.
- `diaryOpen` — лише цей файл.
- `diaryClose` — лише цей файл.
- `diaryName` — лише цей файл.
- `diaryRecent` — лише цей файл.
- `diaryItemButton` — лише цей файл.
- `diaryFoodButton` — лише цей файл.
- `diaryHome` — лише цей файл.
- `diaryResults` — лише цей файл.
- `diaryPaintOff` — лише цей файл.
- `diaryPresent` — лише цей файл.
- `diaryCard` — лише цей файл.
- `diaryServingWord` — лише цей файл.
- `diaryServingPlural` — лише цей файл.
- `diaryBaseOf` — лише цей файл.
- `diaryPortion` — лише цей файл.
- `diaryPaintPortion` — лише цей файл.
- `diaryPaint` — лише цей файл.
- `diaryPaintClear` — лише цей файл.
- `diaryCustomForm` — лише цей файл.
- `diarySaveCustom` — лише цей файл.
- `diaryMealFromFood` — лише цей файл.
- `diaryCommit` — лише цей файл.
- `diaryAddItem` — лише цей файл.
- `diaryRepeatYesterday` — лише цей файл.
- `diaryEditOpen` — лише цей файл.
- `diarySaveItem` — лише цей файл.
- `diaryDeleteItem` — лише цей файл.
- `diaryReuse` — лише цей файл.
- `watchViewport` — лише цей файл.
- `commitPlannedMeal` — згадують `mark.js`.

### `energy-calc.js`

- `sessionKcal` — згадують `plan-engine.js`, `smart-plan.js`.
- `macros` — згадують `app.js`, `diary-flow.js`, `energy-pass.js`, `food-schema.js`, `locale.js`, `personal-tools.js`, `smart-plan.js`, `sport-coach.js`.
- `estimate` — згадують `app.js`, `diary-flow.js`, `food-packages.js`, `food-schema.js`, `food-tools.js`, `food-ua-catalog.js`, `generic-dishes.js`, `locale.js`, `mark.js`, `personal-tools.js` і ще 4.
- `withManualTarget` — лише цей файл.
- `withAdjustment` — згадують `plan-engine.js`, `smart-plan.js`.
- `check` — згадують `app.js`, `diary-flow.js`, `food-schema.js`, `food-tools.js`, `mark-parse.js`, `my-plan.js`, `personal-tools.js`, `plan-engine.js`, `smart-plan.js`, `sport-coach.js` і ще 7; те саме ім'я оголошене ще в `plan-engine.js`.

### `food-packages.js`

- `daymarkFoods` — лише цей файл.
- `applyFoodPatches` — лише цей файл.

### `food-schema.js`

- `sourceOf` — лише цей файл.
- `confidence` — згадують `diary-flow.js`, `energy-calc.js`, `locale.js`, `my-plan.js`, `smart-plan.js`.
- `prep` — згадують `common-products.js`, `diary-flow.js`, `food-packages.js`.
- `prepWord` — лише цей файл.
- `status` — згадують `account.js`, `app.js`, `diary-flow.js`, `energy-calc.js`, `food-packages.js`, `my-plan.js`, `plan-engine.js`, `smart-plan.js`, `storage-bridge.js`, `training-polish.js` і ще 2.
- `validate` — згадують `diary-flow.js`, `food-tools.js`.
- `normalizeName` — лише цей файл.
- `dedupKey` — лише цей файл.
- `normalize` — згадують `diary-flow.js`.

### `food-tools.js`

- `foodInputValue` — згадують `app.js`.
- `foodFormNumber` — згадують `app.js`.
- `sourceFoods` — згадують `off-search.js`.
- `genericFoods` — згадують `off-search.js`.
- `commonFoods` — згадують `off-search.js`.
- `packageFoods` — лише цей файл.
- `venueFoods` — лише цей файл.
- `allFoods` — згадують `diary-flow.js`.
- `recipeCatalogueFoods` — лише цей файл.
- `foodById` — згадують `app.js`, `diary-flow.js`, `off-search.js`.
- `safeSourceURL` — згадують `app.js`, `personal-tools.js`.
- `foodSearchText` — згадують `diary-flow.js`, `off-search.js`.
- `sourceGroup` — лише цей файл.
- `catalogMatches` — лише цей файл.
- `catalogueSearch` — згадують `app.js`, `off-search.js`, `photo-recognize.js`.
- `qualityLabel` — згадують `off-search.js`.
- `venueSamples` — лише цей файл.
- `renderCatalogResults` — згадують `app.js`, `off-search.js`.
- `foodProvenance` — згадують `diary-flow.js`, `mark.js`.
- `productNotice` — згадують `app.js`.
- `catalogMeal` — згадують `app.js`.
- `customFoodModal` — згадують `app.js`.
- `saveCustomFood` — згадують `app.js`.
- `drinkData` — лише цей файл.
- `drinkBuilder` — згадують `app.js`.
- `drinkEstimate` — лише цей файл.
- `renderDrinkResult` — лише цей файл.
- `saveDrink` — згадують `app.js`.

### `locale.js`

- `uiLang` — згадують `app.js`.
- `uiSex` — лише цей файл.
- `uiSwap` — лише цей файл.
- `voiceUk` — лише цей файл.
- `translateUi` — лише цей файл.
- `present` — згадують `diary-flow.js`.
- `patchPresent` — лише цей файл.
- `applyChrome` — лише цей файл.

### `mark-parse.js`

- `mealType` — згадують `mark.js`.
- `isOffTopic` — лише цей файл.
- `portion` — згадують `app.js`, `diary-flow.js`, `food-schema.js`, `food-tools.js`, `locale.js`, `mark.js`.
- `stripNoise` — лише цей файл.
- `dedupeWords` — лише цей файл.
- `cleanSpeech` — лише цей файл.
- `items` — згадують `app.js`, `design-pass.js`, `diary-flow.js`, `mark.js`, `my-plan.js`, `personal-tools.js`, `plan-engine.js`, `start-flow.js`, `training-evolution.js`, `training-expansion.js` і ще 3.
- `intent` — згадують `mark.js`, `training-evolution.js`.
- `parseMealUtterance` — згадують `mark.js`.
- `toneFor` — згадують `mark.js`.

### `mark.js`

- `markContext` — лише цей файл.
- `markTone` — лише цей файл.
- `markPlateGrams` — лише цей файл.
- `markMealFromFood` — лише цей файл.
- `markSaveMeal` — лише цей файл.
- `markStem` — лише цей файл.
- `markHay` — лише цей файл.
- `markHit` — лише цей файл.
- `markMatchFoods` — лише цей файл.
- `markSuggestions` — лише цей файл.
- `markLocalReply` — лише цей файл.
- `markPush` — лише цей файл.
- `markModelReply` — лише цей файл.
- `markHandle` — лише цей файл.
- `markPaint` — лише цей файл.
- `markOpen` — лише цей файл.
- `markHear` — лише цей файл.
- `markListen` — лише цей файл.
- `markPlate` — лише цей файл.
- `snapPortionText` — лише цей файл.
- `snapApplyPortion` — лише цей файл.
- `snapFromFood` — лише цей файл.
- `snapFromVision` — лише цей файл.
- `snapPaintDraft` — лише цей файл.
- `snapPieceGrams` — лише цей файл.
- `snapSum` — лише цей файл.
- `snapFromHits` — лише цей файл.
- `snapOpen` — лише цей файл.
- `snapRead` — лише цей файл.
- `snapFromImage` — лише цей файл.
- `snapTake` — лише цей файл.
- `snapHandle` — лише цей файл.
- `snapCommit` — лише цей файл.

### `my-plan.js`

- `myPlanActive` — лише цей файл.
- `myPlanStale` — лише цей файл.
- `myPlanRecipe` — лише цей файл.
- `myPlanMeal` — лише цей файл.
- `myPlanDay` — лише цей файл.
- `myPlanSession` — лише цей файл.
- `myPlanToday` — лише цей файл.
- `myPlanShortages` — лише цей файл.
- `myPlanHero` — лише цей файл.
- `myPlanShopping` — лише цей файл.
- `myPlanBody` — згадують `start-flow.js`.
- `myPlanWriteWeek` — лише цей файл.
- `myPlanWriteTraining` — лише цей файл.
- `myPlanSnapshot` — лише цей файл.
- `startMyPlan` — згадують `start-flow.js`.
- `openMyPlan` — згадують `smart-plan.js`.
- `myPlanEditBlock` — лише цей файл.
- `myPlanEditForm` — лише цей файл.
- `myPlanDiff` — лише цей файл.
- `myPlanReview` — лише цей файл.
- `myPlanReviewBlock` — лише цей файл.
- `myPlanReviewDecide` — лише цей файл.
- `myPlanWeighBlock` — лише цей файл.
- `myPlanHistoryBlock` — лише цей файл.
- `myPlanRollback` — лише цей файл.
- `myPlanSwap` — лише цей файл.
- `seedMenuFromPlan` — лише цей файл.

### `off-search.js`

- `foodEmoji` — лише цей файл.
- `paintCatalogEmoji` — лише цей файл.
- `offFood` — згадують `diary-flow.js`.
- `loadOffPack` — згадують `diary-flow.js`.
- `offTermGroups` — лише цей файл.
- `offQueryActive` — лише цей файл.
- `offCategoryOk` — лише цей файл.
- `offMatches` — лише цей файл.
- `collectOff` — згадують `diary-flow.js`.
- `offButton` — лише цей файл.
- `paintOffSection` — лише цей файл.

### `personal-tools.js`

- `supportRule` — згадують `clarity-pass.js`, `visual-system.js`.
- `supportStatus` — згадують `victory-pass.js`, `visual-system.js`.
- `supportRows` — згадують `clarity-pass.js`, `victory-pass.js`, `visual-system.js`.
- `smartHabitPanel` — згадують `app.js`, `clarity-pass.js`, `visual-system.js`.
- `supportsView` — згадують `app.js`, `clarity-pass.js`, `visual-system.js`.
- `supportsSettings` — згадують `app.js`, `clarity-pass.js`, `visual-system.js`.
- `supportScheduleName` — згадують `clarity-pass.js`, `visual-system.js`.
- `saveSupports` — згадують `app.js`.
- `supportOpen` — згадують `app.js`, `visual-system.js`.
- `nutritionEstimate` — згадують `app.js`.
- `planModal` — згадують `app.js`, `weekly-refine.js`.
- `renderNutritionPlan` — лише цей файл.
- `applyNutritionPlan` — згадують `app.js`.
- `normalizeCustomFoods` — згадують `app.js`.
- `normalizeSupportRules` — згадують `app.js`.
- `normalizeSupportValues` — згадують `app.js`.
- `onboardSmartView` — згадують `app.js`, `clarity-pass.js`, `visual-system.js`, `weekly-studio.js`.

### `phone-shell.js`

- `freshUser` — згадують `app.js`.
- `diaryHasMeals` — лише цей файл.
- `watchDay` — лише цей файл.

### `photo-recognize.js`

- `plateClassifier` — лише цей файл.
- `focusPlate` — лише цей файл.
- `recognizePlate` — згадують `mark.js`.

### `plan-engine.js`

- `layoutKey` — згадують `my-plan.js`.
- `layoutFor` — згадують `smart-plan.js`.
- `seedFrom` — лише цей файл.
- `noise` — лише цей файл.
- `normalizeAnswers` — згадують `my-plan.js`, `smart-plan.js`, `start-flow.js`.
- `purposeOf` — лише цей файл.
- `energyInput` — згадують `smart-plan.js`.
- `groupIds` — лише цей файл.
- `groupAllergen` — лише цей файл.
- `groupCategories` — лише цей файл.
- `recipeHits` — лише цей файл.
- `recipeAllergen` — лише цей файл.
- `recipeNeedsStove` — лише цей файл.
- `foodReject` — згадують `my-plan.js`, `smart-plan.js`.
- `likesMatch` — лише цей файл.
- `foodScore` — лише цей файл.
- `pickMeal` — згадують `my-plan.js`.
- `relaxOptions` — лише цей файл.
- `relaxLabel` — згадують `my-plan.js`.
- `buildFood` — лише цей файл.
- `countRepeats` — лише цей файл.
- `programKind` — лише цей файл.
- `programExerciseText` — лише цей файл.
- `moveReject` — лише цей файл.
- `moveScore` — лише цей файл.
- `buildMove` — згадують `smart-plan.js`.
- `relaxMoveOptions` — лише цей файл.
- `reasons` — згадують `my-plan.js`, `training-evolution.js`, `training-flow.js`.
- `build` — згадують `food-packages.js`, `food-schema.js`, `my-plan.js`, `start-flow.js`, `storage-bridge.js`.
- `check` — згадують `app.js`, `diary-flow.js`, `energy-calc.js`, `food-schema.js`, `food-tools.js`, `mark-parse.js`, `my-plan.js`, `personal-tools.js`, `smart-plan.js`, `sport-coach.js` і ще 7; те саме ім'я оголошене ще в `energy-calc.js`.

### `smart-plan.js`

- `planNumber` — лише цей файл.
- `planRound` — лише цей файл.
- `planInputFromState` — згадують `locale.js`.
- `planActivityCompat` — лише цей файл.
- `planSessionsCompat` — лише цей файл.
- `planMovement` — лише цей файл.
- `planTextFood` — лише цей файл.
- `planTextMove` — лише цей файл.
- `planTextPace` — лише цей файл.
- `computeSmartPlan` — згадують `locale.js`, `my-plan.js`, `start-flow.js`.
- `smartPlanBody` — згадують `my-plan.js`, `start-flow.js`.
- `applyTrainingPrefs` — лише цей файл.
- `planHistoryList` — згадують `my-plan.js`.
- `planHistoryAdd` — згадують `my-plan.js`.
- `applySmartPlan` — згадують `locale.js`, `my-plan.js`, `start-flow.js`.
- `planSessionToday` — лише цей файл.
- `metFromWorkout` — лише цей файл.
- `workoutBurn` — лише цей файл.
- `movementFoodShare` — лише цей файл.
- `foodExtraFromBurn` — лише цей файл.
- `todayMoveAdjust` — лише цей файл.
- `savedTrainingOn` — лише цей файл.
- `myPlanWorkoutOn` — лише цей файл.
- `plannedWorkout` — лише цей файл.
- `plannedFoodExtra` — лише цей файл.
- `dayEnergy` — згадують `diary-flow.js`, `energy-pass.js`, `mark.js`, `training-evolution.js`, `weekly-studio.js`.
- `dayCalorieTarget` — згадують `energy-pass.js`.
- `weightChecks` — лише цей файл.
- `rememberStartingWeight` — лише цей файл.
- `latestWeightCheck` — лише цей файл.
- `weighReminder` — згадують `my-plan.js`, `start-flow.js`.
- `weighInDue` — лише цей файл.
- `weighStatusLine` — згадують `my-plan.js`.
- `openWeighIn` — лише цей файл.
- `saveWeighIn` — лише цей файл.
- `adoptCalorieBase` — згадують `app.js`.
- `recipePortionFit` — лише цей файл.
- `recipeGoalScore` — згадують `weekly-studio.js`.
- `openSmartPlan` — згадують `personal-tools.js`.
- `restoreSmartExtras` — лише цей файл.
- `rememberPhoneSteps` — лише цей файл.
- `pullPhoneSteps` — лише цей файл.

### `sport-coach.js`

- `sportOptions` — лише цей файл.
- `coachSettings` — лише цей файл.
- `macroTargets` — лише цей файл.
- `activityById` — згадують `personal-tools.js`.
- `metEstimate` — лише цей файл.
- `normalizeWorkout` — згадують `app.js`, `training-studio.js`.
- `movementTotals` — згадують `personal-tools.js`, `smart-plan.js`, `weekly-refine.js`.
- `dumbbellArt` — згадують `training-evolution.js`, `training-flow.js`, `training-studio.js`.
- `rhythmBanner` — згадують `app.js`.
- `sportHomeCard` — згадують `app.js`, `design-pass.js`, `smart-plan.js`, `training-evolution.js`, `training-expansion.js`, `training-flow.js`, `training-studio.js`.
- `activityChooser` — згадують `app.js`.
- `renderActivities` — лише цей файл.
- `workoutEditor` — згадують `app.js`.
- `updateWorkoutEstimate` — лише цей файл.
- `saveWorkoutForm` — згадують `app.js`.
- `workoutRows` — лише цей файл.
- `movementWeek` — лише цей файл.
- `sportView` — згадують `app.js`, `training-studio.js`, `weekly-studio.js`.
- `watchDayModal` — згадують `app.js`.
- `bodySettingsModal` — згадують `app.js`.
- `macroCoverage` — згадують `personal-tools.js`.
- `dayInsights` — лише цей файл.
- `coachTeaser` — згадують `app.js`, `diary-flow.js`.
- `macroProgress` — лише цей файл.
- `weekSummary` — лише цей файл.
- `coachWeek` — лише цей файл.
- `coachView` — згадують `app.js`, `weekly-refine.js`.
- `checkInModal` — згадують `app.js`.
- `coachNotifications` — згадують `app.js`.

### `start-flow.js`

- `startDraftLoad` — лише цей файл.
- `startDraftSave` — лише цей файл.
- `startDraftClear` — лише цей файл.
- `startHasDraft` — згадують `my-plan.js`.
- `startGet` — лише цей файл.
- `startSet` — лише цей файл.
- `startRange` — лише цей файл.
- `startTitle` — згадують `my-plan.js`.
- `startKind` — лише цей файл.
- `readStartFields` — згадують `my-plan.js`.
- `sPill` — лише цей файл.
- `sPills` — згадують `my-plan.js`.
- `sKicker` — згадують `my-plan.js`.
- `sField` — згадують `my-plan.js`.
- `sGroupLabel` — згадують `my-plan.js`.
- `startStepMarks` — лише цей файл.
- `startStepGoal` — лише цей файл.
- `startExcludeRow` — згадують `my-plan.js`.
- `startStepFood` — лише цей файл.
- `startStepMove` — лише цей файл.
- `startPlan` — лише цей файл.
- `startStepPlan` — лише цей файл.
- `paintStart` — лише цей файл.
- `openStartFlow` — згадують `app.js`, `my-plan.js`, `phone-shell.js`.
- `startLater` — лише цей файл.
- `finishStart` — лише цей файл.
- `startValidate` — згадують `my-plan.js`.
- `startHandleControl` — згадують `my-plan.js`.

### `storage-bridge.js`

- `isOwn` — лише цей файл.
- `webviewKeys` — лише цей файл.
- `collect` — лише цей файл.
- `envelope` — лише цей файл.
- `noteRevision` — лише цей файл.
- `migrate` — лише цей файл.
- `requestSync` — лише цей файл.
- `flushNow` — лише цей файл.
- `schedule` — лише цей файл.
- `flushBlocking` — згадують `app.js`.
- `absorbRemote` — лише цей файл.
- `bump` — згадують `plan-engine.js`.

### `training-evolution.js`

- `trainingOptions` — лише цей файл.
- `trainingWizardField` — лише цей файл.
- `trainingWizardOpen` — лише цей файл.
- `trainingWizardRender` — лише цей файл.
- `trainingWizardCollect` — лише цей файл.
- `trainingWeek` — згадують `weekly-studio.js`.
- `trainingWeeklyPanel` — лише цей файл.
- `trainingFlowBack` — лише цей файл.

### `training-flow.js`

- `trainingHistory` — лише цей файл.
- `trainingScore` — згадують `training-evolution.js`.
- `trainingRecommend` — лише цей файл.
- `trainingSelect` — лише цей файл.
- `trainingCoachPanel` — згадують `design-pass.js`, `training-evolution.js`.
- `trainingSetCount` — згадують `training-evolution.js`.
- `trainingTargetSeconds` — згадують `training-evolution.js`.
- `trainingTotalSets` — згадують `training-evolution.js`.
- `trainingTimedStages` — згадують `training-evolution.js`.
- `trainingActiveMs` — згадують `training-evolution.js`.
- `trainingClock` — згадують `training-evolution.js`.
- `trainingSaveDraft` — згадують `training-evolution.js`.
- `trainingPause` — згадують `training-evolution.js`.
- `trainingResume` — лише цей файл.
- `trainingStart` — згадують `app.js`, `training-studio.js`; те саме ім'я оголошене ще в `training-studio.js`.
- `trainingFlowRender` — згадують `training-evolution.js`, `training-polish.js`.
- `trainingFlowNext` — згадують `training-evolution.js`.
- `trainingFlowSkip` — лише цей файл.
- `trainingFlowComplete` — лише цей файл.
- `trainingFlowLeave` — лише цей файл.
- `trainingFlowDiscard` — лише цей файл.

### `training-polish.js`

- `workoutSoundTone` — лише цей файл.
- `workoutSoundBeat` — лише цей файл.
- `workoutSoundSchedule` — лише цей файл.
- `workoutSoundSync` — лише цей файл.
- `workoutSoundStop` — лише цей файл.
- `workoutSoundCue` — лише цей файл.
- `workoutSoundPanel` — лише цей файл.

### `training-studio.js`

- `trainingFigure` — згадують `training-evolution.js`, `training-flow.js`.
- `body` — згадують `app.js`, `clarity-pass.js`, `diary-flow.js`, `locale.js`, `mark-parse.js`, `mark.js`, `my-plan.js`, `personal-tools.js`, `plan-engine.js`, `smart-plan.js` і ще 10.
- `trainingTimes` — лише цей файл.
- `trainingStudio` — згадують `design-pass.js`, `training-evolution.js`, `training-flow.js`, `visual-system.js`.
- `trainingOpen` — згадують `app.js`, `training-evolution.js`, `visual-system.js`.
- `trainingExercise` — згадують `app.js`, `training-evolution.js`.
- `trainingStart` — згадують `app.js`, `training-flow.js`; те саме ім'я оголошене ще в `training-flow.js`.
- `trainingSessionRender` — згадують `app.js`, `training-flow.js`.
- `trainingFinish` — згадують `app.js`.
- `trainingTabs` — лише цей файл.

### `visual-system.js`

- `supportVisual` — згадують `clarity-pass.js`.
- `supportProgress` — лише цей файл.
- `supportReadout` — згадують `clarity-pass.js`, `victory-pass.js`.
- `supportSource` — лише цей файл.
- `supportsToday` — згадують `clarity-pass.js`.
- `supportWeek` — згадують `clarity-pass.js`.
- `trainingPhoto` — лише цей файл.

### `weekly-refine.js`

- `weekVariantCount` — лише цей файл.
- `rhythmOverview` — лише цей файл.

### `weekly-studio.js`

- `weekValid` — лише цей файл.
- `weekOptions` — згадують `weekly-refine.js`.
- `weekGoalPurpose` — лише цей файл.
- `weekEnergy` — лише цей файл.
- `weekBodyContext` — лише цей файл.
- `weekCandidate` — згадують `my-plan.js`.
- `weekPick` — лише цей файл.
- `weekBuild` — лише цей файл.
- `weekSave` — згадують `my-plan.js`.
- `weekTrainingSync` — лише цей файл.
- `weekFormView` — згадують `weekly-refine.js`.
- `weekMealCard` — згадують `my-plan.js`.
- `weekResult` — згадують `weekly-refine.js`.
- `weekView` — згадують `weekly-refine.js`.
- `weekError` — лише цей файл.
- `weekGenerate` — лише цей файл.
- `weekSwap` — лише цей файл.
- `weekShopping` — лише цей файл.
- `weekShoppingItems` — лише цей файл.
- `weekShoppingText` — лише цей файл.

### `wellbeing.js`

- `read` — згадують `app.js`, `my-plan.js`, `personal-data.js`, `phone-shell.js`, `visual-system.js`.
- `save` — згадують `app.js`, `diary-flow.js`, `mark.js`.
- `escText` — лише цей файл.
- `doneToday` — лише цей файл.
- `sessionCard` — лише цей файл.
- `selectedSession` — лише цей файл.
- `player` — згадують `training-evolution.js`, `training-flow.js`.
- `motivation` — лише цей файл.
- `view` — згадують `app.js`, `clarity-pass.js`, `design-pass.js`, `diary-flow.js`, `energy-calc.js`, `energy-pass.js`, `locale.js`, `personal-tools.js`, `sport-coach.js`, `training-evolution.js` і ще 4.
- `open` — згадують `app.js`, `clarity-pass.js`, `design-pass.js`, `diary-flow.js`, `food-tools.js`, `my-plan.js`, `personal-tools.js`, `phone-shell.js`, `start-flow.js`, `storage-bridge.js` і ще 8.
- `close` — згадують `app.js`, `diary-flow.js`, `locale.js`, `my-plan.js`, `phone-shell.js`, `smart-plan.js`, `training-flow.js`, `training-polish.js`, `victory-pass.js`.
- `begin` — лише цей файл.
- `next` — згадують `app.js`, `diary-flow.js`, `mark.js`, `my-plan.js`, `smart-plan.js`, `start-flow.js`, `storage-bridge.js`, `training-evolution.js`, `training-flow.js`, `victory-pass.js` і ще 3.
- `restart` — згадують `plan-engine.js`, `start-flow.js`.
- `go` — згадують `food-schema.js`, `locale.js`, `storage-bridge.js`.
