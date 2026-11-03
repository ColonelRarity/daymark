// Builds the food base for the prototype from the data under mobile/data/food:
//   1. rewrites common-products.js with gender-agreed cooking words and a prep field,
//   2. writes food-packages.js from the package files (Daymark cards + patches),
//   3. validates every card of every source with food-schema.js and finds duplicates,
//   4. runs the live-phrase coverage check,
//   5. writes docs/food-base.md.
// Usage: node mobile/scripts/food-base/build.mjs [--check]   (--check: no files written, exit 1 on errors)
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../../..");
const PROTO = path.join(ROOT, "mobile/public/prototype");
const DATA = path.join(ROOT, "mobile/data/food");
const DOCS = path.join(ROOT, "docs/food-base.md");
const checkOnly = process.argv.includes("--check");

const require = createRequire(import.meta.url);
const readProto = name => fs.readFileSync(path.join(PROTO, name), "utf8");
function parseConst(source, name) {
  const match = source.match(new RegExp("const " + name + "\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);(?:\\n|$)"));
  if (!match) throw new Error("const " + name + " not found");
  return JSON.parse(match[1]);
}

globalThis.FOOD_CATEGORIES = parseConst(readProto("food-catalog.js"), "FOOD_CATEGORIES");
const { FoodSchema } = require(path.join(PROTO, "food-schema.js"));

/* ---------- 1. common products: grammar ---------- */

const genders = JSON.parse(fs.readFileSync(path.join(DATA, "common-genders.json"), "utf8")).genders;
const FORMS = {
  "сире": { m: "сирий", f: "сира", n: "сире", pl: "сирі", prep: "raw" },
  "варене": { m: "варений", f: "варена", n: "варене", pl: "варені", prep: "cooked" },
  "на парі": { m: "на парі", f: "на парі", n: "на парі", pl: "на парі", prep: "cooked" },
  "запечене без олії": { m: "запечений без олії", f: "запечена без олії", n: "запечене без олії", pl: "запечені без олії", prep: "cooked" },
  "гриль без олії": { m: "гриль без олії", f: "гриль без олії", n: "гриль без олії", pl: "гриль без олії", prep: "cooked" },
  "тушковане": { m: "тушкований", f: "тушкована", n: "тушковане", pl: "тушковані", prep: "cooked" },
  "смажене з невеликою кількістю олії": { m: "смажений, трохи олії", f: "смажена, трохи олії", n: "смажене, трохи олії", pl: "смажені, трохи олії", prep: "cooked" },
  "у паніровці": { m: "у паніровці", f: "у паніровці", n: "у паніровці", pl: "у паніровці", prep: "cooked" },
  "суха крупа": { m: "суха крупа", f: "суха крупа", n: "суха крупа", pl: "суха крупа", prep: "dry" },
  "варена на воді": { m: "варений на воді", f: "варена на воді", n: "варене на воді", pl: "варені на воді", prep: "cooked" },
  "каша на молоці": { m: "каша на молоці", f: "каша на молоці", n: "каша на молоці", pl: "каша на молоці", prep: "cooked" },
  "сухі": { m: "сухий", f: "суха", n: "сухе", pl: "сухі", prep: "dry" },
  "суха": { m: "сухий", f: "суха", n: "сухе", pl: "сухі", prep: "dry" },
  "варені без соусу": { m: "варений без соусу", f: "варена без соусу", n: "варене без соусу", pl: "варені без соусу", prep: "cooked" },
  "варена": { m: "варений", f: "варена", n: "варене", pl: "варені", prep: "cooked" },
  "консервована": { m: "консервований", f: "консервована", n: "консервоване", pl: "консервовані", prep: "cooked" },
  "свіже": { m: "свіжий", f: "свіжа", n: "свіже", pl: "свіжі", prep: "raw" }
};

// Any already-agreed form maps back to its rule, so the script is idempotent.
const FORM_BY_VARIANT = {};
for (const [suffix, form] of Object.entries(FORMS)) for (const variant of [suffix, form.m, form.f, form.n, form.pl]) FORM_BY_VARIANT[variant] = FORM_BY_VARIANT[variant] || suffix;

const commonSource = readProto("common-products.js");
const commonProducts = parseConst(commonSource, "COMMON_PRODUCTS");
const grammarChanges = [];
const unknownBases = new Set();
for (const card of commonProducts) {
  const match = card.name.match(/^(.*?), (.*)$/);
  if (!match) { if (card.prep === undefined) { const p = FoodSchema.prep(card); if (p) card.prep = p; } continue; }
  const [, base, written] = match;
  const suffix = FORM_BY_VARIANT[written];
  const form = suffix && FORMS[suffix];
  if (!form) continue;
  const gender = genders[base];
  if (!gender) { unknownBases.add(base); continue; }
  const name = base + ", " + form[gender];
  if (form[gender] !== suffix) grammarChanges.push([base + ", " + suffix, name]); // differs from the old one-form-fits-all suffix
  card.name = name;
  card.originalName = name;
  card.prep = form.prep;
}

/* ---------- 2. packages ---------- */

const packageFiles = fs.readdirSync(path.join(DATA, "packages")).filter(name => name.endsWith(".json")).sort();
const packageCards = [];
const runtimePatches = [];
const buildPatches = [];
for (const file of packageFiles) {
  const pack = JSON.parse(fs.readFileSync(path.join(DATA, "packages", file), "utf8"));
  for (const raw of pack.cards) {
    const card = FoodSchema.normalize(Object.assign({}, raw));
    const source = pack.sources[raw.source] || null;
    if (source) card.source = Object.assign({}, source);
    delete card.fdcId;
    if (raw.fdcId) { card.url = "https://fdc.nal.usda.gov/food-details/" + raw.fdcId + "/nutrients"; card.source = Object.assign({}, card.source, { url: card.url, record: "fdcId " + raw.fdcId }); }
    card.checked = raw.checked || pack.checked;
    card.localized = true;
    card.package = pack.package;
    if (card.quality === "generic-estimate" || card.quality === "common-product") card.brand = card.brand || (card.quality === "generic-estimate" ? "Універсальний довідник страв" : "Звичайний продукт");
    else card.brand = card.brand || (source ? source.name : "Daymark");
    packageCards.push(card);
  }
  for (const patch of pack.patches || []) {
    if (patch.id.startsWith("common-")) buildPatches.push(patch); else runtimePatches.push(patch);
  }
}
for (const patch of buildPatches) {
  const card = commonProducts.find(item => item.id === patch.id);
  if (!card) { console.warn("patch target missing: " + patch.id); continue; }
  if (patch.aliasesAdd) card.aliases = [card.aliases, patch.aliasesAdd].filter(Boolean).join(" ");
  for (const key of ["serving", "servingLabel", "name", "emoji"]) if (patch[key] !== undefined) card[key] = patch[key];
}

/* ---------- 3. validation and duplicates across every source ---------- */

const sources = {
  "common-products.js": commonProducts,
  "food-packages.js": packageCards,
  "generic-dishes.js": parseConst(readProto("generic-dishes.js"), "GENERIC_DISHES"),
  "food-catalog.js": parseConst(readProto("food-catalog.js"), "FOOD_CATALOG"),
  "food-ua-catalog.js": parseConst(readProto("food-ua-catalog.js"), "UA_FOOD_CATALOG")
};
const stapleNames = parseConst(readProto("staple-names.js"), "STAPLE_NAMES");
for (const card of sources["food-catalog.js"]) if (stapleNames[card.id]) { card.name = stapleNames[card.id][0]; card.localized = true; }

const report = { sources: {}, errors: [], warnings: [], duplicates: [] };
const seenIds = new Map();
const seenKeys = new Map();
const cyrillic = /[а-яіїєґ]/i;
for (const [file, cards] of Object.entries(sources)) {
  const stat = { cards: cards.length, fullMacros: 0, kcalOnly: 0, ukrainianName: 0, withSource: 0, withUrl: 0, errors: 0, warnings: 0, quality: {}, category: {} };
  for (const card of cards) {
    const result = FoodSchema.validate(card);
    const hidden = runtimePatches.some(patch => patch.hide && patch.id === card.id);
    if (!result.ok) { stat.errors++; report.errors.push(file + " " + card.id + " " + card.name + ": " + result.errors.join(", ") + (hidden ? " — прихована правкою пакета" : "")); }
    if (result.warnings.length) { stat.warnings++; report.warnings.push(file + " " + card.id + " " + card.name + ": " + result.warnings.join(", ")); }
    if ([card.kcal, card.p, card.f, card.c].every(value => typeof value === "number")) stat.fullMacros++;
    else if (typeof card.kcal === "number") stat.kcalOnly++;
    if (cyrillic.test(card.name)) stat.ukrainianName++;
    if (FoodSchema.sourceOf(card).name) stat.withSource++;
    if (card.url) stat.withUrl++;
    stat.quality[card.quality] = (stat.quality[card.quality] || 0) + 1;
    stat.category[card.category] = (stat.category[card.category] || 0) + 1;
    if (seenIds.has(card.id)) report.errors.push("duplicate id " + card.id + " in " + file + " and " + seenIds.get(card.id));
    seenIds.set(card.id, file);
    const key = FoodSchema.dedupKey(card);
    if (seenKeys.has(key)) report.duplicates.push({ key, a: seenKeys.get(key), b: file + " " + card.id });
    else seenKeys.set(key, file + " " + card.id);
  }
  report.sources[file] = stat;
}

/* ---------- 4. write outputs ---------- */

function jsonLine(value) { return JSON.stringify(value); }

const commonOut = "const COMMON_PRODUCTS=" + jsonLine(commonProducts) + ";\n";
const packagesOut = [
  "/* Generated by mobile/scripts/food-base/build.mjs from mobile/data/food/packages. Do not edit by hand. */",
  "const DAYMARK_FOODS=" + jsonLine(packageCards) + ";",
  "const FOOD_PATCHES=" + jsonLine(runtimePatches.map(({ why, ...rest }) => rest)) + ";",
  "function daymarkFoods(){return DAYMARK_FOODS;}",
  "(function applyFoodPatches(){const byId=new Map();for(const list of [FOOD_CATALOG,typeof GENERIC_DISHES==='undefined'?[]:GENERIC_DISHES,typeof UA_FOOD_CATALOG==='undefined'?[]:UA_FOOD_CATALOG])for(const card of list)byId.set(card.id,card);for(const patch of FOOD_PATCHES){const card=byId.get(patch.id);if(!card)continue;if(patch.hide){for(const list of [FOOD_CATALOG,typeof GENERIC_DISHES==='undefined'?[]:GENERIC_DISHES,typeof UA_FOOD_CATALOG==='undefined'?[]:UA_FOOD_CATALOG]){const at=list.indexOf(card);if(at>=0)list.splice(at,1);}continue;}if(patch.aliasesAdd)card.aliases=[card.aliases,patch.aliasesAdd].filter(Boolean).join(' ');for(const key of ['serving','servingLabel','name','emoji'])if(patch[key]!==undefined)card[key]=patch[key];}})();",
  ""
].join("\n");

if (!checkOnly) {
  fs.writeFileSync(path.join(PROTO, "common-products.js"), commonOut);
  fs.writeFileSync(path.join(PROTO, "food-packages.js"), packagesOut);
}

/* ---------- 5. coverage ---------- */

let coverage = null;
try {
  const out = execFileSync(process.execPath, [path.join(here, "coverage.mjs"), "--json"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  coverage = JSON.parse(out);
} catch (error) {
  console.warn("coverage failed: " + (error.stderr || error.message).toString().slice(0, 400));
}

/* ---------- 6. report ---------- */

const pct = (a, b) => (b ? Math.round(a / b * 1000) / 10 : 0) + " %";
const lines = [];
lines.push("# База продуктів Daymark", "", "_Згенеровано `node mobile/scripts/food-base/build.mjs` " + new Date().toISOString().slice(0, 10) + ". Правити треба джерела в `mobile/data/food`, не цей файл._", "");
lines.push("## Схема картки", "", "Описана в `mobile/public/prototype/food-schema.js` (`FoodSchema`): стабільний `id` з префіксом джерела, українська `name`, `originalName` і `brand`, `aliases`, `category`, `prep` (raw / cooked / dry / dish), `unit` г або мл із `basis` 100 і `serving`, `kcal`/`p`/`f`/`c` на 100 (`null`, коли джерело не знає — не 0), `quality`, похідні `confidence`, `status`, `source` {назва, ліцензія, посилання, версія}, `checked`. `FoodSchema.validate` відкидає картки поза межами (ккал 0–900, БЖВ 0–100, сума ≤ 105 г) і попереджає про розбіжність 4Б+9Ж+4В з ккал понад 20 % (для алкоголю перевірки нема — його енергія поза БЖВ), про нулі замість пропусків і макроси без ккал.", "");
lines.push("## Джерела й ліцензії", "", "| Джерело | Ліцензія | Де в коді |", "|---|---|---|",
  "| Anses · Ciqual 2025 | Licence Ouverte / Etalab 2.0 (атрибуція) | `food-catalog.js`, id `ciq-*` |",
  "| USDA FoodData Central (SR Legacy 2018-04, Foundation 2025-04) | CC0 1.0 | `food-packages.js`, id `usda-*`, посилання на fdcId |",
  "| Open Food Facts | ODbL 1.0 (атрибуція, share-alike) | `off-pack.json` (локальний пак, без мережі), `staple-names.js` етикетки, id `off-*` |",
  "| Меню закладів України (Пузата Хата, Япіко, KFC, McDonald’s, Lviv Croissants) | публічні меню, посилання на сторінку | `food-ua-catalog.js`, `food-catalog.js` |",
  "| Daymark · звичайний продукт / типова рецептура | власні картки, діапазон замість точної цифри | `common-products.js`, `generic-dishes.js`, `food-packages.js` id `dm-*` |",
  "| Людина | свої продукти | `state.customFoods`, id `own-*` |", "");
lines.push("Закриті бази (YAZIO, FatSecret, MyFitnessPal) не копіюються. Новий дамп Open Food Facts не завантажувався.", "");
lines.push("## Стан за джерелами", "", "| Файл | Карток | Повні КБЖВ | Лише ккал | Українська назва | З посиланням | Помилок | Попереджень |", "|---|---:|---:|---:|---:|---:|---:|---:|");
let totals = { cards: 0, fullMacros: 0, ukrainianName: 0, withUrl: 0, errors: 0, warnings: 0 };
for (const [file, s] of Object.entries(report.sources)) {
  lines.push(`| \`${file}\` | ${s.cards} | ${s.fullMacros} (${pct(s.fullMacros, s.cards)}) | ${s.kcalOnly} | ${s.ukrainianName} (${pct(s.ukrainianName, s.cards)}) | ${s.withUrl} (${pct(s.withUrl, s.cards)}) | ${s.errors} | ${s.warnings} |`);
  for (const key of Object.keys(totals)) totals[key] += s[key];
}
lines.push(`| **разом** | ${totals.cards} | ${totals.fullMacros} (${pct(totals.fullMacros, totals.cards)}) | | ${totals.ukrainianName} (${pct(totals.ukrainianName, totals.cards)}) | ${totals.withUrl} (${pct(totals.withUrl, totals.cards)}) | ${totals.errors} | ${totals.warnings} |`, "");
lines.push("## Пакети", "", ...packageFiles.map(file => { const pack = JSON.parse(fs.readFileSync(path.join(DATA, "packages", file), "utf8")); return `- **${pack.package}** (${pack.cards.length} карток, ${(pack.patches || []).length} правок, перевірено ${pack.checked}): ${pack.about}`; }), "");
lines.push("## Граматика звичайних продуктів", "", `Спосіб приготування узгоджено з родом основи за \`mobile/data/food/common-genders.json\`: ${grammarChanges.length} назв змінено` + (grammarChanges.length ? ", наприклад " + grammarChanges.slice(0, 6).map(([a, b]) => `«${a}» → «${b}»`).join(", ") : "") + ".", unknownBases.size ? "Без роду в словнику: " + [...unknownBases].join(", ") : "", "");
lines.push("## Дублікати між джерелами", "", `Однакова назва, бренд-група й одиниця: ${report.duplicates.length}. Не видаляються автоматично — у пошуку перемагає картка з кращим джерелом; список нижче для ручного розбору.`, "");
for (const dup of report.duplicates.slice(0, 60)) lines.push(`- \`${dup.key}\` — ${dup.a} і ${dup.b}`);
if (report.duplicates.length > 60) lines.push(`- … ще ${report.duplicates.length - 60}`);
lines.push("");
lines.push("## Помилки валідації", "", report.errors.length ? report.errors.slice(0, 50).map(e => "- " + e).join("\n") : "Немає.", "");
lines.push("## Попередження валідації", "", report.warnings.length ? `${report.warnings.length} карток. Перші 40:\n\n` + report.warnings.slice(0, 40).map(w => "- " + w).join("\n") : "Немає.", "");
if (coverage) {
  const s = coverage.summary;
  lines.push("## Покриття живими фразами", "", `\`mobile/data/food/phrases-uk.json\`: ${s.phrases} фраз. У перших п’яти результатах: **${s.foundInTop5}** (${pct(s.foundInTop5, s.phrases)}), першим результатом: **${s.foundAsFirst}** (${pct(s.foundAsFirst, s.phrases)}). Час пошуку по ${s.foods} картках: середній ${s.avgMs} мс, максимум ${s.maxMs} мс (Node, без прогріву).`, "");
  lines.push("| Група | У топ-5 | Першим |", "|---|---:|---:|");
  for (const [group, g] of Object.entries(s.byGroup)) lines.push(`| ${group} | ${g.ok}/${g.total} | ${g.top} |`);
  lines.push("");
  lines.push("Не знайдено:", "", ...(s.misses.length ? s.misses.map(m => `- «${m.q}» → ${m.saw.join(" | ") || "—"}`) : ["- немає"]), "");
  lines.push("Знайдено не першим:", "", ...(s.notFirst.length ? s.notFirst.map(r => `- «${r.q}» на місці ${r.at}; першим «${r.first}»`) : ["- немає"]), "");
  lines.push("<details><summary>Топ-5 для кожної фрази (ручна перевірка)</summary>", "");
  for (const row of coverage.rows) lines.push(`- ${row.ok ? (row.top ? "✓" : "~") : "✗"} «${row.q}»: ${row.names.join(" · ")}`);
  lines.push("", "</details>", "");
}
lines.push("## Що лишається", "", "- " + (report.sources["food-catalog.js"].cards - report.sources["food-catalog.js"].ukrainianName) + " карток Ciqual мають лише англійську назву: пакет 2 — українські назви й синоніми для овочів, фруктів, круп, молочного, м’яса, риби.", "- Open Food Facts — лише локальний пак; живий пошук і штрихкод онлайн не підключені, тож кеш і ліміти ще не потрібні.", "- Типові страви `dm-*` і `dish-*` — діапазони, не дані кухні; статус `auto`, доки їх не звірить людина.", "- Фото тарілки лишається сценарієм, не вимірюванням.", "");

if (!checkOnly) fs.writeFileSync(DOCS, lines.join("\n"));

console.log(`common-products: ${commonProducts.length} карток, ${grammarChanges.length} назв виправлено${unknownBases.size ? ", без роду: " + [...unknownBases].join(", ") : ""}`);
console.log(`packages: ${packageCards.length} карток, ${runtimePatches.length} правок під час завантаження, ${buildPatches.length} правок у збірці`);
console.log(`validation: ${report.errors.length} помилок, ${report.warnings.length} попереджень, ${report.duplicates.length} дублікатів`);
if (coverage) console.log(`coverage: ${coverage.summary.foundInTop5}/${coverage.summary.phrases} у топ-5, ${coverage.summary.foundAsFirst} першим, ${coverage.summary.avgMs} мс`);
const unhandled = report.errors.filter(line => !line.includes("прихована"));
if (report.errors.length) console.log(report.errors.slice(0, 20).join("\n"));
if (unhandled.length && checkOnly) process.exit(1);
