# DAYMARK · clickable product concept

Working name, not a cleared trademark. Private web prototype for reviewing a future iOS / Android product. The original personal My Season site is unchanged.

## Run and edit

Buildless: `dist/index.html`, `dist/style.css`, `dist/app-ux.css`, `dist/recipes-data.js`, `dist/nutrition-data.js`, `dist/app.js`. No dependencies or API keys. Serve `dist/` with an ordinary static server, or use the supported Sites preview workflow. Site identity lives in `.openai/hosting.json`.

## Product idea

The product opens with a personally chosen goal and date, rather than a calorie deficit. The signature interaction is crossing out a day. A user can mark either a full day or a personally defined minimum. Neither food intake nor perfect task completion is a gate. Missed days do not reset earned days. Future dates cannot be marked.

Visual system: cobalt `#254DF5`, lime `#D9FA72`, warm food peach `#FFB59C`, sleep lavender `#D9D5FB`, ink `#171A1C`, canvas `#F4F5F0`. Sans-serif typography, oversize editorial numbers, short animations, reduced-motion support. Ukrainian UI, responsive desktop and mobile layouts.

## Functional in this prototype

- Demo account with clearly labeled fictional records; independent local storage key `daymark-concept-v1`.
- Three-step onboarding: direction, custom title/date range, optional profile parameters, self-selected habits and minimum.
- Starting a personal journey from the demo banner clears demo records and creates an empty personal dataset. Adding another goal retains the current dataset.
- Multiple goals and separate calendars; date ranges up to two years. Full/minimum marks, removal, progress and a small celebration.
- Food diary: search in a sourced local catalogue (see FOOD-PERSONAL.md), manual portion input, per-100g/ml label calculation, macros, editing/deleting, repeated favorites, local photo attachment. Unknown calories remain unknown.
- Sleep logs with overnight duration, manually entered steps and workouts, 7-day record charts, water marks.
- Opt-in pause-between-meals stopwatch with no prescribed fasting duration; food display preference with no automatic diet prescription.
- Space switcher with swipeable cards. Progress Story PNG export (1080×1920); no body photos, weight or calories included.
- Local JSON export and validated restore; profile preferences and reduced-motion setting.

## Intentionally simulated / not connected

- AI: the illustrated bowl is a fixed demo. An uploaded photo is NEVER analyzed or assigned the example's calories. AI example records are visibly labeled. Real image recognition is absent. A local, attributed Ciqual 2025 reference snapshot and selected official Ukrainian restaurant data are included; there is no live food API.
- Apple Health / Health Connect: informational integration flows only, no permission or fake successful connection. No automatic steps, exercise energy, heart rate or sleep stages.
- Plus at $1.99/month: pricing hypothesis only, no trial activation, payment, billing or subscription entitlement.
- No cloud account, sync, notifications, native widgets, live activity, barcode decoding, store distribution or production medical guidance.
- Optional adult starting calorie/macronutrient estimates use Mifflin–St Jeor × PAL. They require explicit review and application, are estimates rather than measured requirements, and are not clinical assessment; see FOOD-PERSONAL.md.

## Recommended product sequence for Cursor

1. Validate the signature calendar, onboarding and daily return flow with a small user group. Observe: can people create a goal, log a meal, cross out a day and return after a missed day? Refine before broadening the feature set.
2. Implement a native application (choose and document a shared iOS/Android approach), authenticated data ownership, database, offline queue/sync, safe backups, and deletion/export. Preserve the visual tokens and interaction patterns here; do not ship this local-only prototype as production.
3. Connect a licensed food data source with region/language coverage and unit provenance. Separate raw/cooked food, per-100g vs serving values, restaurant recipes and verified label data. Barcode lookup must identify an actual product, not approximate an image.
4. Add server-side AI behind an authenticated endpoint. Keep keys out of clients. Require user review of ingredients, portion sizes and hidden oil/sauce. Multiple photos of the same plate must not be counted twice. Show assumptions and uncertainty. Validate accuracy on labeled, weighed test meals; never promise a universal ±100 kcal error. Do not treat a decorative confidence percentage or fixed interval as a calibrated accuracy claim.
5. Add native Apple Health / Health Connect adapters with per-type permission, provenance and duplicate prevention. Do not automatically eat back wearable exercise calories. Apple Watch app/widget is its own implementation task.
6. Add genuine StoreKit / Google Play subscriptions, restore purchases, localized pricing and entitlement checks. Set the AI allowance after measuring per-user inference/storage costs, store deductions, support and taxes. Do not promise unlimited AI for $1.99 before unit economics are known.
7. Add optional native reminders/widgets, subscriptions and story export/share sheets only after core retention is demonstrated. Diet modes and fasting are optional preferences rather than the product's initial identity.

## Research anchors

- YAZIO: https://help.yazio.com/hc/en-us/articles/39137901903889-What-is-the-AI-Calorie-Tracking-Feature-and-how-does-it-work — photo estimates require review and portion correction.
- fatsecret: https://www.fatsecret.com/fatsecret-app-help/getting-started/food-add-options — manual search, portion editing, saved meals and photo flows.
- Apple: https://developer.apple.com/documentation/healthkit
- Android: https://developer.android.com/health-and-fitness/health-connect

## Verification

JavaScript syntax, all seven screen renderers, navigation/action coverage, goal-mark round trips, manual calories, local persistence, label math, month-end/leap-date handling, sleep across midnight, onboarding data separation and backup validation are checked outside the browser. Core web interactions have also been exercised in the supported browser preview. Native-device and accessibility QA are still required before native release. Real API, wearable and billing integrations have not been tested because they do not exist in this prototype.

## Recipe discovery update

The product now includes a dedicated «Що приготувати?» screen, a prominent homepage feature and a food-diary shortcut. `dist/recipes-data.js` contains 100 distinct authored recipes with ingredient quantities and preparation steps across breakfast, lunch, dinner, snacks and dessert. `RECIPE_INGREDIENTS` supplies ingredient names, shopping units, shopping categories and ingredient flags; it is not a verified allergen or nutrition database.

Features: text search, meal categories, base ingredient, time limit, no-fish/no-egg/no-dairy/no-nuts ingredient filters, quick/home-style/sweet/no-cook/simple-product collections, all-selected pantry ingredient matching, random choice within active filters, saved recipes, serving multipliers, combined shopping lists, checked grocery items, copying/downloading the grocery list, and an explicit manual diary-entry handoff. Recipe kcal/macros are now estimated from ingredient quantities using the documented food reference mapping and assumptions. Every recipe has a distinct generated illustration matched to its title/ingredient list, rendered from seven4×4 atlases.

New optional `recipeExtras` local data is validated and included in backup/restore. Old backups without it receive empty saved/cart/checked arrays. Adding a recipe does not overwrite goals or food entries.

Art assets in `dist/assets/` were created with built-in image generation. `food-atlas.png`: premium editorial 3×3 atlas of syrniki, chicken/buckwheat, fish/potatoes, lavash, dessert, oats, borscht, meatballs/puree and hummus/vegetables. `movement-editorial.png`: adult woman in fully covered cobalt/charcoal athletic styling on a cobalt studio background. These are project-owned illustrative assets; no user body photograph is used.

The user’s prior food preferences informed this first collection: ordinary Ukrainian/home-style dishes, sandwiches and lavash, sweet breakfasts, syrniki with fruit, and no exposed/runny fried yolks. The app remains a general recipe collection rather than a personalized calorie prescription. Font sizes were increased, especially labels and calendar dates. Mobile ingredient filters collapse behind a disclosure to keep the meal cards accessible.

## Mobile usability revision
Single mobile app frame with internal scrolling, thumb-level5-item navigation, dedicated camera action, profile in header. Energy/optional target and macro card first, goal calendar second. Full-day quickmark, bright lime-on-purple strokes, celebration respecting reduced motion. Calendar starts as week, expands to month.100 distinct recipe image regions and approximate recipe/portion kcal plus macros; see NUTRITION.md. Nutrition/assets load locally, all original localStorage records retained. No native App Store package or live AI/Health integrations implied.

## Sport and companion revision

`dist/activity-data.js` contains91 exact Compendium2024 activity presets; `dist/sport-coach.js` contains the local tracker and explainable day/7day companion; `dist/sport-coach.css` styles them within the existing mobile interface. Daily activity context is now available in onboarding and profile. The previous generated fitness image is reused in a compact motivational banner with a dumbbell / goal visual system. See SPORT-COACH.md for formulas, sources, migration, validation and native integration handoff. All old local records are retained. Device auto-sync, background push and live AI are explicitly not connected.

Checks: `node tests/core.cjs`; `node tests/flows.cjs`; `node tests/sport-coach.cjs`.

Non-fitness custom goals can now use the focus habit (learning, work or a personal habit) and a generic10-minute minimum, with no food or exercise requirement.

## Food catalogue and personal supports revision

3,815 sourced food/drink records (3,339 Ciqual references; 476 selected Ukrainian restaurant positions) plus the existing 100 recipe estimates; search, category/source filters, standard and weighed portions, provenance and unknown-macro handling. Eighteen drink templates support explicit component quantities, eight milk options, sugar/syrup, counts and a label override. Eighteen goal directions and twenty-seven customizable supports include quantities, schedules, automatic diary progress and per-goal manual values. Adult starting energy/macros can be calculated, reviewed and applied. Sources, formula boundaries, implementation handoff and QA are documented in FOOD-PERSONAL.md.

New modules: `food-catalog.js`, `food-tools.js`, `personal-data.js`, `personal-tools.js`, `food-personal.css`. Existing local data remains on version 1 with validated optional fields. New check: `node tests/food-personal.cjs`.
