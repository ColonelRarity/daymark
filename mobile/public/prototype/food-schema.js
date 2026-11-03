/* The food card. One shape for every source: reference tables, common products, typical
   dishes, venues, labels, Daymark cards and the person's own foods.

   id            stable string; the prefix names the source (ciq-, usda-, common-, dish-, puzata-, off-, dm-, own-)
   name          Ukrainian name as the person reads it
   originalName  name in the source language (same as name for Ukrainian sources)
   brand         brand, venue or source label shown under the name
   aliases       extra search words: other spellings, Russian, English, synonyms
   category      one of FOOD_CATEGORIES
   prep          raw | cooked | dry | dish | null   (сире / готове / сухе / готова страва)
   unit          g | ml;  basis 100;  serving = usual portion in that unit;  servingLabel optional
   kcal p f c    per 100 g or ml; null when the source does not have it — never 0 as a stand-in
   fiber         grams per 100, optional
   quality       reference | common-product | generic-estimate | restaurant | restaurant-estimate
                 | label-community | recipe | user | calculated
   confidence    high | mid | low   (derived from quality unless the card sets it)
   status        checked | auto | draft   (checked = a person looked at the top values)
   source        { name, licence, url, version } (derived from quality/brand/url unless set)
   checked       YYYY-MM-DD when the card was last looked at
   estimateLow/High  kcal range per 100 for estimates;  barcode;  emoji;  localized;  review  */

const FOOD_SOURCES = {
  ciqual: { name: "Anses · Ciqual 2025", licence: "Licence Ouverte / Etalab 2.0", url: "https://ciqual.anses.fr/", version: "2025" },
  usda: { name: "USDA FoodData Central", licence: "CC0 1.0", url: "https://fdc.nal.usda.gov/", version: "SR Legacy 2018-04 · Foundation 2025-04" },
  off: { name: "Open Food Facts", licence: "ODbL 1.0 (атрибуція, share-alike)", url: "https://world.openfoodfacts.org/", version: "" },
  common: { name: "Daymark · звичайний продукт", licence: "власна картка", url: "", version: "" },
  dish: { name: "Daymark · типова рецептура", licence: "власна картка", url: "", version: "" },
  venue: { name: "Меню закладу", licence: "публічні дані закладу", url: "", version: "" },
  recipe: { name: "Рецепт Daymark", licence: "власна картка", url: "", version: "" },
  user: { name: "Мій продукт", licence: "дані людини", url: "", version: "" },
  calculated: { name: "Конструктор напою", licence: "розрахунок", url: "", version: "" }
};

const FOOD_CONFIDENCE = {
  user: ["high", "Мій продукт", "твої цифри"],
  restaurant: ["high", "Дані закладу", "офіційне меню"],
  reference: ["mid", "Довідкова таблиця", "середнє довідкове"],
  "common-product": ["mid", "Середнє для продукту", "±10 %, спосіб приготування важливий"],
  "label-community": ["mid", "Етикетка · Open Food Facts", "внесено спільнотою, звір пачку"],
  recipe: ["mid", "Рецепт Daymark", "сума інгредієнтів"],
  calculated: ["mid", "Розрахунок за складом", "твій склад, довідкові інгредієнти"],
  "generic-estimate": ["low", "Типова рецептура", "діапазон, не дані кухні"],
  "restaurant-estimate": ["low", "Вага закладу · оцінка ккал", "груба оцінка"]
};

const FoodSchema = (() => {
  const CATEGORIES = typeof FOOD_CATEGORIES !== "undefined" ? FOOD_CATEGORIES : {};
  const PREPS = ["raw", "cooked", "dry", "dish"];
  const PREP_WORDS = { raw: "сире", cooked: "готове", dry: "сухе", dish: "готова страва" };
  const QUALITIES = Object.keys(FOOD_CONFIDENCE);

  const num = value => (value === null || value === undefined || value === "" ? null : Number(value));

  function sourceOf(card) {
    if (card.source && card.source.name) return card.source;
    const id = String(card.id || "");
    const url = card.url || "";
    let base;
    if (id.startsWith("ciq-") || /ciqual/i.test(card.brand || "")) base = FOOD_SOURCES.ciqual;
    else if (id.startsWith("usda-") || id.startsWith("dm-")) base = FOOD_SOURCES.usda;
    else if (id.startsWith("off-") || card.quality === "label-community" || /openfoodfacts/.test(url)) base = FOOD_SOURCES.off;
    else if (card.quality === "common-product") base = FOOD_SOURCES.common;
    else if (card.quality === "generic-estimate") base = FOOD_SOURCES.dish;
    else if (card.quality === "restaurant" || card.quality === "restaurant-estimate") base = FOOD_SOURCES.venue;
    else if (card.quality === "recipe") base = FOOD_SOURCES.recipe;
    else if (card.quality === "calculated") base = FOOD_SOURCES.calculated;
    else base = FOOD_SOURCES.user;
    const out = Object.assign({}, base);
    if (base === FOOD_SOURCES.venue && card.brand) out.name = card.brand;
    if (url) out.url = url;
    return out;
  }

  function confidence(card) {
    if (card.confidence && ["high", "mid", "low"].includes(card.confidence)) {
      const row = FOOD_CONFIDENCE[card.quality] || FOOD_CONFIDENCE.reference;
      return { level: card.confidence, label: row[1], note: row[2] };
    }
    const row = FOOD_CONFIDENCE[card.quality] || FOOD_CONFIDENCE.reference;
    const label = card.quality === "reference" && sourceOf(card) === FOOD_SOURCES.ciqual ? "Довідник Ciqual 2025" : card.quality === "reference" && sourceOf(card).name === FOOD_SOURCES.usda.name ? "Довідник USDA" : row[1];
    return { level: row[0], label, note: row[2] };
  }

  function prep(card) {
    if (card.prep && PREPS.includes(card.prep)) return card.prep;
    const dishLike = ["generic-estimate", "restaurant", "restaurant-estimate", "recipe"].includes(card.quality) || card.category === "ready" || card.category === "restaurant";
    if (dishLike) {
      // "Вареники з вишнями" is a dish even though the name contains "варен"; a sweet or a drink from the same table is just a product.
      if (["sweets", "drinks", "alcohol", "other"].includes(card.category) && card.quality !== "recipe") return null;
      return "dish";
    }
    const name = String(card.name || "").toLocaleLowerCase("uk") + " " + String(card.originalName || "").toLowerCase();
    if (/\bсир(е|ий|а|і)\b|\braw\b|свіж(е|ий|а|і)\b/.test(name)) return "raw";
    if (/сух(е|ий|а|і)\b|крупа\b|\bdry\b|\bdried\b/.test(name)) return "dry";
    if (/варен|смажен|запечен|тушкован|гриль|на парі|пашот|відварн|cooked|boiled|fried|baked|roasted|grilled/.test(name)) return "cooked";
    return null;
  }

  function prepWord(card) {
    const value = prep(card);
    return value ? PREP_WORDS[value] : "";
  }

  function status(card) {
    if (card.status && ["checked", "auto", "draft"].includes(card.status)) return card.status;
    if (card.quality === "user") return "checked";
    if (["restaurant-estimate", "generic-estimate"].includes(card.quality)) return "auto";
    return card.checked ? "checked" : "auto";
  }

  /* Validation. Errors mean the card must not be shown; warnings go to the build report. */
  function validate(card) {
    const errors = [], warnings = [];
    if (!card || typeof card !== "object") return { ok: false, errors: ["not an object"], warnings };
    if (typeof card.id !== "string" || !/^[A-Za-z0-9_.:-]{2,80}$/.test(card.id)) errors.push("id");
    if (typeof card.name !== "string" || !card.name.trim() || card.name.length > 160) errors.push("name");
    if (card.unit !== "g" && card.unit !== "ml") errors.push("unit");
    const serving = num(card.serving);
    if (!(serving > 0 && serving <= 5000)) errors.push("serving");
    if (card.category && !CATEGORIES[card.category] && Object.keys(CATEGORIES).length) errors.push("category:" + card.category);
    if (card.prep && !PREPS.includes(card.prep)) errors.push("prep");
    if (card.quality && !QUALITIES.includes(card.quality)) errors.push("quality:" + card.quality);
    const kcal = num(card.kcal), p = num(card.p), f = num(card.f), c = num(card.c);
    if (kcal !== null && !(kcal >= 0 && kcal <= 900)) errors.push("kcal:" + kcal);
    for (const [key, value] of [["p", p], ["f", f], ["c", c]]) if (value !== null && !(value >= 0 && value <= 100)) errors.push(key + ":" + value);
    if (p !== null && f !== null && c !== null && p + f + c > 105) errors.push("macros>100g");
    if (kcal !== null && p !== null && f !== null && c !== null && card.category !== "alcohol") { // alcohol carries energy outside Б/Ж/В, so the check says nothing there
      const atwater = 4 * p + 9 * f + 4 * c;
      const slack = Math.max(30, kcal * 0.2);
      if (Math.abs(atwater - kcal) > slack) warnings.push("atwater " + Math.round(atwater) + " vs " + Math.round(kcal));
      if (kcal > 50 && p === 0 && f === 0 && c === 0) warnings.push("zeros look like missing values");
    }
    if (kcal === null && (p !== null || f !== null || c !== null)) warnings.push("macros without kcal");
    if (card.checked && !/^\d{4}-\d{2}-\d{2}$/.test(card.checked)) warnings.push("checked date");
    if (card.estimateLow !== undefined && card.estimateHigh !== undefined && !(num(card.estimateLow) <= num(card.estimateHigh))) warnings.push("estimate range");
    return { ok: !errors.length, errors, warnings };
  }

  /* Dedup key: same words in the name, same brand group, same unit. */
  function normalizeName(text) {
    return String(text || "").toLocaleLowerCase("uk").replace(/[’ʼ'`]/g, "").replace(/ё/g, "е").replace(/ґ/g, "г").replace(/[^a-zа-яіїє0-9%,. ]+/gi, " ").replace(/\s+/g, " ").trim();
  }
  function dedupKey(card) {
    const brandGroup = ["common-product", "generic-estimate", "reference"].includes(card.quality) ? "" : normalizeName(card.brand);
    return normalizeName(card.name) + "|" + brandGroup + "|" + (card.unit || "g");
  }

  /* Brings any source row to the card shape without inventing values. */
  function normalize(raw) {
    const card = Object.assign({}, raw);
    card.unit = card.unit === "ml" ? "ml" : "g";
    card.basis = 100;
    card.serving = num(card.serving) > 0 ? num(card.serving) : 100;
    for (const key of ["kcal", "p", "f", "c", "fiber"]) if (key in card) card[key] = num(card[key]);
    if (!card.originalName) card.originalName = card.name;
    if (!card.aliases) card.aliases = "";
    if (card.prep === undefined) { const value = prep(card); if (value) card.prep = value; }
    return card;
  }

  return { CATEGORIES, PREPS, PREP_WORDS, SOURCES: FOOD_SOURCES, sourceOf, confidence, prep, prepWord, status, validate, dedupKey, normalizeName, normalize };
})();

if (typeof module !== "undefined" && module.exports) module.exports = { FoodSchema, FOOD_SOURCES, FOOD_CONFIDENCE };
