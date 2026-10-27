import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  carbVerdict,
  DIETS_BY_ID,
  energyVerdict,
  foodFit,
  lineFromReference,
  scalePer100,
  sumMacros,
} from "./calc.ts";
import { COOKING_FATS, SAUCES } from "./reference.ts";

const sunflower = COOKING_FATS.find((item) => item.id === "ciq-17440");
const olive = COOKING_FATS.find((item) => item.id === "ciq-17270");
const mayo = SAUCES.find((item) => item.id === "ciq-11054");
const kfcMayo = SAUCES.find((item) => item.id === "kfc-206");

describe("cooking additions", () => {
  it("counts sunflower oil by grams", () => {
    assert.ok(sunflower);
    assert.equal(scalePer100(sunflower.kcal, 10), 90);
    const line = lineFromReference(sunflower, 10);
    assert.equal(line.kcal, 90);
    assert.equal(line.fat, 10);
    assert.equal(line.carb, null);
  });

  it("keeps one decimal for olive oil", () => {
    assert.ok(olive);
    assert.equal(scalePer100(olive.kcal, 15), 134.9);
    assert.equal(scalePer100(olive.fat, 15), 15);
  });

  it("counts sauce fat and calories from the chosen reference", () => {
    assert.ok(mayo);
    const line = lineFromReference(mayo, 20);
    assert.equal(line.kcal, 138.4);
    assert.equal(line.fat, 14.9);
    assert.equal(line.kind, "sauce");
  });

  it("does not turn a missing macro into zero", () => {
    assert.ok(kfcMayo);
    const line = lineFromReference(kfcMayo, 10);
    assert.equal(line.protein, null);
    const total = sumMacros([line]);
    assert.equal(total.protein, null);
    assert.equal(total.kcal, 61.6);
  });

  it("rejects an empty or huge amount", () => {
    assert.ok(sunflower);
    assert.throws(() => lineFromReference(sunflower, 0));
    assert.throws(() => lineFromReference(sunflower, 2001));
  });
});

describe("diets", () => {
  it("compares a deficit with the person's own target", () => {
    assert.equal(energyVerdict("deficit", 1800, 2100), "under");
    assert.equal(energyVerdict("deficit", 2100, 2100), "over");
    assert.equal(energyVerdict("deficit", null, 2100), "unknown");
  });

  it("uses a carb cap for keto and low-carb", () => {
    const keto = DIETS_BY_ID.keto;
    assert.equal(carbVerdict(keto, null, 40), "within");
    assert.equal(carbVerdict(keto, null, 50), "within");
    assert.equal(carbVerdict(keto, 30, 40), "over");
    assert.equal(carbVerdict(keto, null, null), "unknown");
  });

  it("does not invent a fit for unlabeled lactose-free food", () => {
    assert.equal(foodFit("lactose_free", "dairy"), "unknown");
    assert.equal(foodFit("carnivore", "meat"), "fits");
    assert.equal(foodFit("carnivore", "fruit"), "avoid");
    assert.equal(foodFit("carnivore", "sauces"), "unknown");
    assert.equal(foodFit("vegan", "dairy"), "avoid");
    assert.equal(foodFit("pescatarian", "fish"), "fits");
    assert.equal(foodFit("pescatarian", "meat"), "avoid");
  });
});
