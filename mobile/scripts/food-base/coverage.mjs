// Runs the live Ukrainian phrases through the diary search and reports what the person
// would see in the first five results. Usage: node mobile/scripts/food-base/coverage.mjs [--verbose]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPrototypeFoods } from "./load-prototype-foods.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const phrasesFile = path.resolve(here, "../../data/food/phrases-uk.json");
const verbose = process.argv.includes("--verbose");
const asJson = process.argv.includes("--json");

const { phrases } = JSON.parse(fs.readFileSync(phrasesFile, "utf8"));
const proto = loadPrototypeFoods();
const foods = proto.allFoods();

const rows = [];
let hits = 0, topHits = 0, totalMs = 0, maxMs = 0;
for (const phrase of phrases) {
  const started = performance.now();
  const result = proto.search(phrase.q, 5);
  const ms = performance.now() - started;
  totalMs += ms; maxMs = Math.max(maxMs, ms);
  const expect = new RegExp(phrase.expect, "i");
  const names = result.list.map(food => food.name);
  const index = names.findIndex(name => expect.test(name));
  if (index >= 0) hits++;
  if (index === 0) topHits++;
  rows.push({ q: phrase.q, group: phrase.group, ok: index >= 0, top: index === 0, index, ms: Math.round(ms * 10) / 10, total: result.total, fuzzy: result.fuzzy, names, qualities: result.list.map(food => food.quality) });
}

const byGroup = {};
for (const row of rows) {
  const g = byGroup[row.group] || (byGroup[row.group] = { total: 0, ok: 0, top: 0 });
  g.total++; if (row.ok) g.ok++; if (row.top) g.top++;
}

const summary = {
  foods: foods.length,
  phrases: phrases.length,
  foundInTop5: hits,
  foundAsFirst: topHits,
  avgMs: Math.round(totalMs / phrases.length * 10) / 10,
  maxMs: Math.round(maxMs * 10) / 10,
  byGroup,
  misses: rows.filter(row => !row.ok).map(row => ({ q: row.q, saw: row.names.slice(0, 3) })),
  notFirst: rows.filter(row => row.ok && !row.top).map(row => ({ q: row.q, at: row.index + 1, first: row.names[0] }))
};

if (asJson) {
  console.log(JSON.stringify({ summary, rows }, null, 2));
} else {
  console.log(`Карток: ${summary.foods}. Фраз: ${summary.phrases}. У топ-5: ${hits} (${Math.round(hits / phrases.length * 100)} %). Першим: ${topHits} (${Math.round(topHits / phrases.length * 100)} %). Середній час: ${summary.avgMs} мс, максимум ${summary.maxMs} мс.`);
  console.log("");
  for (const [group, g] of Object.entries(byGroup)) console.log(`  ${group.padEnd(12)} ${g.ok}/${g.total} у топ-5, ${g.top} першим`);
  console.log("\nНе знайдено:");
  for (const miss of summary.misses) console.log(`  «${miss.q}» → ${miss.saw.join(" | ") || "—"}`);
  console.log("\nЗнайдено, але не першим:");
  for (const row of summary.notFirst) console.log(`  «${row.q}» на місці ${row.at}; першим «${row.first}»`);
  if (verbose) {
    console.log("\nТоп-5 для кожної фрази:");
    for (const row of rows) console.log(`  ${row.ok ? (row.top ? "✓" : "~") : "✗"} «${row.q}» (${row.total}, ${row.ms} мс): ${row.names.join(" | ")}`);
  }
}
