// Tests for the energy module the phone uses. Run: node --test mobile/scripts/energy/
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const { EnergyCalc } = require(path.resolve(here, "../../public/prototype/energy-calc.js"));

const TODAY = "2026-11-04";
const woman = { age: 34, heightCm: 168, weightKg: 72, sex: "female", dailyActivity: "light", todayIso: TODAY };
const man = { age: 29, heightCm: 182, weightKg: 84, sex: "male", dailyActivity: "sitting", todayIso: TODAY };
const strength3 = { sessionsPerWeek: 3, minutesPerSession: 45, kind: "strength" };

function expectClean(result) {
  const problems = EnergyCalc.check(result);
  assert.deepEqual(problems, [], "invariants: " + problems.join("; "));
  return result;
}

test("adult woman, no training, maintain: Mifflin–St Jeor resting and daily factor", () => {
  const r = expectClean(EnergyCalc.estimate({ ...woman, purpose: "maintain" }));
  // 10*72 + 6.25*168 - 5*34 - 161 = 720 + 1050 - 170 - 161 = 1439
  assert.equal(r.resting, 1440);
  assert.equal(r.pal, 1.4);
  assert.equal(r.maintenance, 2010); // 1439 * 1.4 = 2014.6 → 2010
  assert.equal(r.target, r.maintenance);
  assert.equal(r.delta, 0);
  assert.equal(r.trainingPerSession, 0);
  assert.equal(r.confidence, "high");
  assert.equal(r.macros.pPerKg, 1.2);
});

test("man with three strength sessions: training is per session, not inside the factor", () => {
  const r = expectClean(EnergyCalc.estimate({ ...man, purpose: "muscle", training: strength3 }));
  // resting: 840 + 1137.5 - 145 + 5 = 1837.5 → maintenance 1837.5*1.25 = 2296.9 → 2300
  assert.equal(r.maintenance, 2300);
  // (5-1)*3.5*84/200*45 = 264.6 → 265 → per session 270 (rounded to 10)
  assert.equal(r.trainingPerSession, 270);
  assert.equal(r.trainingWeekly, 800);
  assert.ok(r.target > r.maintenance, "muscle adds a small surplus");
  assert.equal(r.macros.pPerKg, 1.8, "sports protein only with ≥2 strength sessions");
  assert.ok(r.explanations.some(line => /лише в той день/.test(line)));
});

test("muscle goal without strength training does not get sports protein automatically", () => {
  const r = expectClean(EnergyCalc.estimate({ ...man, purpose: "muscle", training: { sessionsPerWeek: 0, minutesPerSession: 0, kind: "none" } }));
  assert.equal(r.macros.pPerKg, 1.4);
  assert.ok(r.explanations.some(line => /не «спортивні»/.test(line)));
});

test("high everyday activity raises the daily number", () => {
  const sitting = EnergyCalc.estimate({ ...man, dailyActivity: "sitting" });
  const heavy = EnergyCalc.estimate({ ...man, dailyActivity: "heavy" });
  assert.equal(heavy.pal, 1.9);
  assert.ok(heavy.target > sitting.target + 1000);
});

test("lose: default pace 0.5 kg/week, deficit ≈ 550, deadline only checks realism", () => {
  const r = expectClean(EnergyCalc.estimate({ ...man, purpose: "lose", targetWeightKg: 78, deadline: "2027-03-01" }));
  assert.equal(r.rateKg, 0.5);
  assert.equal(r.delta, -550);
  assert.equal(r.target, r.maintenance - 550);
  assert.equal(r.pace.realistic, true);
  assert.ok(r.pace.estimateWeeks >= 12);
  assert.ok(r.assumptions.some(line => /планове припущення/.test(line)), "7700 is named as an assumption, not a forecast");
});

test("unrealistic deadline never lowers the number", () => {
  const relaxed = EnergyCalc.estimate({ ...woman, purpose: "lose", targetWeightKg: 60 });
  const rushed = expectClean(EnergyCalc.estimate({ ...woman, purpose: "lose", targetWeightKg: 60, deadline: "2026-12-01" }));
  assert.equal(rushed.pace.realistic, false);
  assert.equal(rushed.target, relaxed.target, "same calories with or without the rushed date");
  assert.ok(/змінити строк/.test(rushed.pace.note));
});

test("floor: a small woman keeps 1500 and the pace slows instead", () => {
  const r = expectClean(EnergyCalc.estimate({ age: 45, heightCm: 158, weightKg: 58, sex: "female", dailyActivity: "sitting", purpose: "lose", targetWeightKg: 52, todayIso: TODAY }));
  assert.equal(r.target, 1500);
  assert.equal(r.floored, true);
  assert.ok(r.rateKg < 0.5);
  assert.ok(r.explanations.some(line => /Нижче 1500/.test(line)));
});

test("gain: target weight above current flips a 'lose' label to gain", () => {
  const r = expectClean(EnergyCalc.estimate({ ...man, weightKg: 62, purpose: "lose", targetWeightKg: 68 }));
  assert.equal(r.purpose, "gain");
  assert.ok(r.delta > 0);
});

test("low BMI never gets a deficit", () => {
  const r = expectClean(EnergyCalc.estimate({ ...woman, weightKg: 50, heightCm: 172, purpose: "lose" }));
  assert.equal(r.purpose, "maintain");
  assert.equal(r.delta, 0);
});

test("missing sex: no number, no hidden average", () => {
  const r = expectClean(EnergyCalc.estimate({ ...woman, sex: "" }));
  assert.equal(r.ok, false);
  assert.equal(r.status, "missing");
  assert.deepEqual(r.missing, ["sex"]);
  assert.equal(r.target, null);
});

test("missing height and weight are both named", () => {
  const r = EnergyCalc.estimate({ age: 30, sex: "male" });
  assert.deepEqual(r.missing, ["height", "weight"]);
});

test("care flags: pregnancy, lactation, ED history and minors get no number and no deficit", () => {
  for (const flags of [{ pregnancy: true }, { lactation: true }, { edHistory: true }]) {
    const r = expectClean(EnergyCalc.estimate({ ...woman, purpose: "lose", flags }));
    assert.equal(r.status, "care");
    assert.equal(r.target, null);
  }
  const minor = expectClean(EnergyCalc.estimate({ ...woman, age: 16, purpose: "lose" }));
  assert.equal(minor.status, "care");
  assert.equal(minor.careReason, "вік до 18 років");
});

test("medical flag: number stays at maintenance, confidence low, deficit removed", () => {
  const r = expectClean(EnergyCalc.estimate({ ...woman, purpose: "lose", targetWeightKg: 65, flags: { medical: true } }));
  assert.equal(r.purpose, "maintain");
  assert.equal(r.delta, 0);
  assert.equal(r.confidence, "low");
});

test("weight change recomputes; a new weight gives a different number, history is the caller's job", () => {
  const before = EnergyCalc.estimate({ ...man, purpose: "lose", targetWeightKg: 76 });
  const after = EnergyCalc.estimate({ ...man, weightKg: 81, purpose: "lose", targetWeightKg: 76 });
  assert.ok(after.target < before.target);
  assert.ok(before.target - after.target < 100);
});

test("macros: never negative carbs, fat never under 20 % of energy, AMDR is reported", () => {
  const r = expectClean(EnergyCalc.estimate({ age: 40, heightCm: 160, weightKg: 110, sex: "female", dailyActivity: "sitting", purpose: "lose", todayIso: TODAY }));
  assert.ok(r.macros.c >= 0);
  assert.ok(r.macros.shares.f >= 0.2 - 0.01);
  assert.ok("c" in r.macros.amdr);
});

test("low-carb is a mode separate from the weight purpose and carries a warning", () => {
  const normal = EnergyCalc.estimate({ ...woman, purpose: "maintain" });
  const low = expectClean(EnergyCalc.estimate({ ...woman, purpose: "maintain", eatingMode: "lowcarb" }));
  assert.equal(low.target, normal.target, "mode does not change energy");
  assert.ok(low.macros.c <= 100);
  assert.equal(low.confidence, "mid");
  assert.ok(low.explanations.some(line => /не умова схуднення/.test(line)));
});

test("manual number keeps the macro rules and marks the status", () => {
  const r = EnergyCalc.withManualTarget(EnergyCalc.estimate({ ...woman, purpose: "lose", targetWeightKg: 65 }), 1650);
  expectClean(r);
  assert.equal(r.status, "manual");
  assert.equal(r.target, 1650);
});

test("edges: formula range flags low confidence instead of refusing", () => {
  const old = expectClean(EnergyCalc.estimate({ ...woman, age: 85 }));
  assert.equal(old.confidence, "low");
  const heavy = expectClean(EnergyCalc.estimate({ ...man, weightKg: 190, heightCm: 175 }));
  assert.equal(heavy.confidence, "low");
});

test("bad input: strings, negatives and nonsense do not crash and give no number", () => {
  for (const bad of [{ age: "abc", heightCm: -5, weightKg: "x", sex: "other" }, {}, null, { age: 30, heightCm: 170, weightKg: 70, sex: "male", dailyActivity: "???" }]) {
    const r = EnergyCalc.estimate(bad);
    assert.ok(["missing", "ready"].includes(r.status));
    assert.deepEqual(EnergyCalc.check(r), []);
  }
  const odd = EnergyCalc.estimate({ age: 30, heightCm: 170, weightKg: 70, sex: "male", dailyActivity: "???" });
  assert.ok(odd.assumptions.some(line => /не вказано/.test(line)), "unknown activity is replaced by a named assumption");
});

test("rounding: energy to 10, macros whole grams, units are kg/cm/kcal", () => {
  const r = EnergyCalc.estimate({ ...woman, purpose: "lose", targetWeightKg: 65 });
  assert.equal(r.target % 10, 0);
  assert.equal(r.macros.p, Math.round(r.macros.p));
  assert.equal(r.weightKg, 72);
  assert.equal(r.heightCm, 168);
});
