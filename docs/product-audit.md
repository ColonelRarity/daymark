# Daymark — аудит стану продукту

Основа: коміт `cf0e5d4` на `main`. Гілка роботи: `work/product-stages`.

Живий застосунок — це прототип `mobile/public/prototype/index.html`, який `mobile/app/_layout.tsx`
показує у WebView з `http://127.0.0.1:14711` (loopback-сервер `mobile/ios/Daymark/PrototypeServer.swift`
віддає копію прототипу з бандла). `mobile/app/(tabs)/*.tsx`, `mobile/src/store.tsx`, `mobile/app/coach.tsx` —
стара збірка, на телефоні не відкривається, у цьому аудиті не оцінюється як продукт.

Перевірка в браузері: `python3 -m http.server 8787 --bind 127.0.0.1` з `mobile/public`,
сторінка `http://127.0.0.1:8787/prototype/index.html`. Для перевірки нативного сховища в браузері
є `node mobile/scripts/prototype-server.mjs` — такий самий `/store`, як у Swift-сервері, на тому ж порту 14711.

## Що вже є в cf0e5d4 (і це лишається)

| Сценарій | Файл | Стан |
|---|---|---|
| Перший вхід: ціль → про мене → ритм → «Мій план» | `start-flow.js`, `smart-plan.js` | Працює. 4 кроки, стать обов'язкова, план версії 7, підлога 1500/1700 |
| Одна цифра калорій дня `dayEnergy(iso)` | `smart-plan.js` | Працює. Годинник > тренування > заплановане > кроки, джерела не складаються |
| Збережений тиждень тренувань головніший за `dayPlan.sessions` | `smart-plan.js: savedTrainingOn` | Працює |
| Щоденник їжі: типи breakfast/lunch/dinner/snack/drink, олія/масло окремо, за етикеткою, фото як сценарій | `app.js: mealModal, foodView`, `food-tools.js` | Працює, але шлях довгий (див. «зламано») |
| Локальна база: Ciqual 3 339, звичайні продукти 766, готові страви 1 026, заклади 743, OFF-пак ~250 тис. рядків за запитом | `food-catalog.js`, `common-products.js`, `generic-dishes.js`, `food-ua-catalog.js`, `off-pack.json`, `off-search.js` | Працює. Схеми з сирим/готовим статусом, датою перевірки і рівнем достовірності як окремих полів немає |
| Конструктор напою | `food-tools.js: drinkBuilder` | Працює |
| Рецепти (RECIPES + розширення), покупки, заміна, фото-плитки | `recipes-data.js`, `recipe-expansion*.js`, `app.js` | Працює. Яйце = 50 г, частина круп сирими |
| Тиждень меню від денної цифри, WEEK_MEAL_LAYOUT 2–4 прийоми | `weekly-studio.js`, `weekly-refine.js` | Працює. Форма питає 3 чи 4 прийоми |
| Тренування дім/зал/вулиця, медична зупинка, плеєр із чернеткою на сьогодні | `training-*.js`, `sport-coach.js` | Працює. Плеєр не повноекранний, під блокуванням екрана таймер не живе |
| Сон, самопочуття, медитації | `wellbeing.js` | Працює, окремий ключ `daymark-wellbeing-v1` |
| Мова uk/en через `daymark-lang`, звертання за статтю | `locale.js` | Працює як шар фраз поверх innerHTML |
| Кроки з iPhone через `/health/steps` | `PrototypeServer.swift`, `smart-plan.js: pullPhoneSteps` | Працює лише на телефоні |
| Іконка і сплеш | `mobile/assets/brand` | Зібрано |

## Що зламано або небезпечно

| # | Проблема | Де | Наслідок |
|---|---|---|---|
| 1 | **Увесь стан живе в `localStorage` WKWebView.** Файлу в сховищі застосунку немає. | `app.js: persist()`, всі `daymark-*` ключі | iOS може очистити WebsiteData; зміна порту/origin = втрата всього; запис не атомарний; бекапу немає |
| 2 | **Помилка читання стирає дані.** Якщо `JSON.parse`/`validateState` кидає, `state` лишається демо, а `phone-shell.js` робить `localStorage.removeItem(KEY)` і підставляє `freshUser()`. | `app.js:25`, `phone-shell.js:68-71` | Один битий байт = порожній застосунок, остання ціла копія знищена |
| 3 | **`finishStart()` збирає новий стан із `logs: {}`.** | `start-flow.js:162` | Повторний прохід старту (після втрати `startChoices`, скидання валідатором тощо) обнуляє щоденник, улюблене, свої продукти, ваги |
| 4 | **`validateState()` вирізає `startChoices`, `dayPlan`, `smartMeta`, `needsSetup`.** Їх повертає `restoreSmartExtras()` другим читанням того самого ключа. | `app.js: validateState`, `smart-plan.js: restoreSmartExtras` | Крихко: якщо друге читання впаде — план і відповіді старту зникають, а `phone-shell` знову відкриє старт (див. #3) |
| 5 | **`meal-builder.js` не виконується взагалі.** `SyntaxError: Identifier 'originalFoodView' has already been declared` — конфлікт із `recipe-expansion-ui.js:20`. | `meal-builder.js:3` | «Тарілки»/чернетки `mealDraft` на телефоні не існує. Працює лише старий шлях: `foodAddModal → вибір → пошук → mealModal → зберегти → назад на сторінку` |
| 6 | **Шлях додавання їжі довгий, тип прийому за замовчуванням `snack`.** | `app.js: mealModal`, `foodAddModal` | Сніданок з 5 продуктів: ~25–30 натискань, кожен продукт окремо через «＋ Ще їжа» → «Пошук» → результат → select типу → «Зберегти», після чого модал закривається |
| 7 | **Пошук:** список результатів нижче за підказки, категорію, «де шукати» і довідку; поле не у фокусі; після картки запит не зберігається в модалі | `food-tools.js: catalogueSearch` | Людина гортає вниз до списку, потім назад |
| 8 | **Експорт/відновлення охоплюють лише `daymark-concept-v1`.** | `app.js: backup/restore` | Тиждень, тренування, самопочуття, мова не входять у копію |
| 9 | **`selectedDate` фіксується при завантаженні.** Застосунок, що лишився відкритим через північ, пише їжу у вчора. | `app.js:27` | «Дата стрибає»/їжа не в той день |
| 10 | Дата цілі рахується з 7700 ккал = 1 кг як точний прогноз (`endDate`, `weeklyKg`). | `smart-plan.js: computeSmartPlan` | Обіцянка дати, а не побажання |
| 11 | Повноекранного плеєра тренування, що переживає блокування екрана, немає. Таймер у `trainingRun` з `setInterval`. | `training-flow.js` | Фон/блокування губить відлік |
| 12 | «Мої пристрої», «DAYMARK Plus», «Apple Health» — макети без сервісу. | `app.js: integrationModal, plusModal` | Не імітувати далі; прибирати з основного шляху |

## Що лишається поза цим зрізом

- Голос, серверний акаунт, AI-помічник, синхронізація між телефонами — не імітуються.
- HealthKit entitlement не додається. Кроки лишаються з CMPedometer через `/health/steps`.
- Нові фото рецептів пакетом не генеруються; спершу аудит плиток, пілот 10 кадрів лише за згодою.
- Android: каталогу немає, створювати без живого пристрою не треба.

## Пріоритети

- **P0** — збереження на диску (етап 0) і безперервне додавання їжі в один прийом (етап 1).
- **P1** — база продуктів пакетами з перевіркою (етап 2), анкета і пояснений орієнтир (етап 4), рецепти і тиждень (етап 3).
- **P2** — великий каталог вправ і повноекранний плеєр (етап 5), голос, нові фото.

## Звіт за зрізами

Заповнюється після кожного зрізу: які файли змінені, який сценарій пройдено в браузері, що ще ні.

### Етап 0 — збереження

_Ще не почато._

### Етап 1 — один щоденник

_Ще не почато._

### Етап 2 — база

_Ще не почато._

### Етап 3 — рецепти і тиждень

_Ще не почато._

### Етап 4 — анкета і пояснений план

_Ще не почато._

### Етап 5 — рух

_Ще не почато._

## Посилання для орієнтиру сценаріїв (не для копіювання)

- YAZIO Help Center — https://help.yazio.com/
- YAZIO — https://www.yazio.com/
- FatSecret app — https://www.fatsecret.com/app
- USDA FoodData Central (CC0) — https://fdc.nal.usda.gov/
- Open Food Facts, умови ODbL і зображення — https://world.openfoodfacts.org/terms-of-use
- NIDDK Body Weight Planner — https://www.niddk.nih.gov/bwp
- WHO guidelines on physical activity — https://www.who.int/publications/i/item/9789240015128
- NIH ODS, Protein / Dietary Supplements fact sheets — https://ods.od.nih.gov/
