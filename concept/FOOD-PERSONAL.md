# Food, drinks and personal supports · 23 October 2026

## Scope and sources

The local snapshot contains **3,815 sourced records** plus the 100 existing authored recipe estimates, which link to their ingredient/portion screen. It does not represent every Ukrainian restaurant or live current stock. Source links, dates, standard portions and quality are kept with diary entries. 647 source names are Ukrainian (476 restaurant positions and 171 common references); the remaining reference names retain original English with Ukrainian search keywords. Original names are retained where localized. UI controls and explanations are Ukrainian.

- **3,339 Ciqual foods with published energy:** Anses. 2025. Ciqual French food composition table. https://doi.org/10.5281/zenodo.17550133. Extracted from the official Ciqual 2025 workbook: energy in kcal/100g, protein, fat and carbohydrate. Raw and cooked records remain separate. These are French average compositions, not verified Ukrainian brand labels. Missing and below-quantification values are unknown rather than zero.
- **107 McDonald’s Ukraine positions:** https://www.mcdonalds.com/ua/uk-ua/eat/fullmenu.html and the site's public `dnaapp/itemDetails?country=UA&language=uk&showLiveData=true&item=…` data. Official values are per serving; normalized by the published serving weight/volume. Example Big Mac item 200148: 212g, 526 kcal, 27g protein, 27g fat, 43g carbohydrate. Precise source values are retained for portion math despite two-decimal input display.
- **328 KFC Ukraine positions/size variants:** official PDF linked at https://www.kfc.ua/nutritional-values. Values use its explicitly marked 100g/100ml reference row and the adjacent standard portion quantity. Numeric bounds and duplicate name/portion pairs were checked. Thirteen retained records have a warning because the published portion energy disagrees with its weight × per-100 value by over 5%/10kcal. Two records have macro/energy consistency warnings. The app explicitly explains its use of the per-100 row; a flagged result must be checked with the restaurant, not advertised as exact. No correction is invented to conceal source errors.
- **38 Lviv Croissants positions:** https://lvivcroissants.com/ua/menu/ publishes weight and kcal/100g. It does not publish P/F/C in this source; all three remain null. Example Галицький: 215g, 295.4 kcal/100g.
- **3 Sushi Master Kharkiv positions:** https://kharkiv.sushi-master.ua/menu/rolls/rol-kaliforniya-z-vugrem-v-kunzhuti-new (240g, 552.97kcal); https://kharkiv.sushi-master.ua/menu/rolls/rol-kaliforniya-z-krevetkoyu-v-kunzhuti (240g, 508.8kcal); https://kharkiv.sushi-master.ua/menu/sushi/sushi-nigiri-z-vugrem (65g, 230.17kcal). Source nutrients are for the whole published portion, normalized to 100g. Coverage is deliberately partial.

A user can add up to 500 personal products from a label/menu with explicit per-100g or per-100ml units. These remain user supplied. The app does not import other apps' proprietary databases or imply a licensed FatSecret/YAZIO connection. A production catalogue needs maintained ingestion, restaurant/version/region identifiers, multilingual editorial review and appropriate reuse terms.

## Drink builder

18 templates, 8 milk/plant drink options, actual milk/cream/espresso amounts, matcha/cocoa powders, wine and beer/cider variants, spirit and mixer quantities, sugar and syrup grams, serving volume and number of servings. Cups do not silently scale milk. The UI explains that water/ice occupy the rest; actual liquid components cannot exceed the selected cup. One diary record is limited to 10,000ml and normal HTML input bounds also apply.

Energy/macros are summed from Ciqual components. For liquids the UI explicitly assumes 1ml ≈ 1g, so this is a composition estimate, not a cafe's certified nutrition. Alcohol energy is taken from source energy, not reconstructed from 4/4/9 macros. Syrup is an explicitly labelled 65%-sugar model, not a branded syrup lookup. Unsweetened matcha uses the published 237kcal/100g reference in https://www.ichizen-matcha.com/en-eu/blogs/column/matcha-calories-nutrition; its missing macros propagate as unknown. Brand labels override generic references. Entering an exact ready-drink kcal/100ml value overrides energy and leaves macros unknown. Review/save is explicit, and counts multiply all ingredients.

## Personal starting nutrition estimate

Mifflin–St Jeor resting estimate: 10×kg + 6.25×cm − 5×age + 5 (male coefficient) or −161 (female coefficient). Original study: https://pubmed.ncbi.nlm.nih.gov/2305711/. Product scope is ages 19–78 (original adult study range), 30–300kg and 120–230cm. These numeric bounds do not guarantee accuracy at individual extremes. Formula coefficient and usual activity are required rather than inferred.

Resting estimate × selected PAL 1.4/1.6/1.8/2.0 = estimated maintenance. PAL includes usual exercise; recorded workouts and watch totals are **not added again**. NIDDK describes typical PAL 1.4–2.5 at https://www.niddk.nih.gov/bwp; this app is not the NIDDK dynamic model. Product heuristics: −10% loss, +5% gain, unchanged maintenance. These are transparent starting settings, not guaranteed rates or deadline predictions. Target date never forces a greater deficit.

No automatic plan for pregnancy, breastfeeding or an individual clinical diet. No automatic loss below BMI18.5. Calculated results below 1500kcal are withheld as a product boundary, not asserted to be a universal human minimum. Users can keep an optional clinician-agreed/manual target or diary without a calculated target.

Presets P20/F30/C50% or P25/F30/C45%, within the adult AMDR ranges P10–35%, F20–35%, C45–65% published by Health Canada: https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/reference-values-macronutrients.html. These are general adult patterns, not individualized sports/clinical protein requirements. Energy rounds to nearest 10kcal, macro grams to integers; small rounding differences are expected. Applying saves the profile snapshot and updates daily targets. The user must revisit/reapply after profile changes; there is no automatic adaptive metabolism model. Observe complete records, wellbeing and longer-term trends before adjustment. No promise of exact physiology or calibrated uncertainty.

## Goals and supports

18 directions cover loss, gain, strength, body confidence, energy, consistency, home activity, walking, sleep, an event, study, language, work, content creation, reading, budget, routine and custom goals. Each supplies an editable proposed set and a small minimum; it does not claim that all people share these motives.

27 support definitions in five groups, including custom name/quantity/unit, daily/weekdays/MWF/weekend schedule. Users can switch eligible supports between automatic diary progress and manual daily quantities. Manual values use `goalId__supportId`, isolated by goal. Automatic food/movement/steps/water/sleep/protein/strength/mobility/check-in supports use the existing daily data. Protein can follow the user's personal macro target; with no personal target it asks to establish one instead of assigning a hidden norm. Calendar victories remain separate and never require perfect food/macros/support completion. Seven-day support counts use current rules and say so; changing rules does not erase calendar marks.

## Data and implementation handoff

Existing version-1 localStorage and backup format retained. Optional validated fields: `customFoods`, `nutritionPlan`, per-goal `supportRules`, per-day `supportValues`, meal `unit` and `foodRef` with source URL/date/quality/review. External source URLs accept http/https only. Editing official numeric values adds a provenance note. Source numbers survive backup/restore; old backups default to empty optional data.

This is still an owner-private web prototype with local browser storage. Real AI image inference, cloud accounts/sync, native App Store/Play distribution, barcode lookup, HealthKit and Health Connect remain separate integrations. Nutrition calculation here is deterministic and explainable, not a live AI service.

## Verification

`node tests/core.cjs`, `node tests/flows.cjs`, `node tests/sport-coach.cjs`, `node tests/food-personal.cjs` verify source row counts/IDs/conversions, raw vs cooked, missing macros, search/recipes, drink math/volume guards, formula/profile boundaries, applying targets, source persistence, personal products, goal-isolated support values/schedules and legacy/new backups. Browser QA exercised food search → Big Mac half serving (106g/263kcal) → diary; drink builder → oat iced latte +4g sugar ×2 → review/save (600ml/158.8kcal); support add/read quantity12/10 → completion; personal plan23y/170cm/70kg/female/light/loss →2140kcal and107/71/268g macros → applied companion targets. All are fictitious test data, not user prescriptions. Native/device integration QA remains future work.
