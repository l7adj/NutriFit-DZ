import test from "node:test";
import assert from "node:assert/strict";
import { calculateMifflinStJeor, calculateEnergyTarget, calculateMacroTargets } from "../src/index.mjs";

test("Mifflin-St Jeor male example is deterministic", () => {
  assert.equal(calculateMifflinStJeor({ sex: "male", ageYears: 28, weightKg: 75, heightCm: 175 }), 1708.75);
});

test("Mifflin-St Jeor female example is deterministic", () => {
  assert.equal(calculateMifflinStJeor({ sex: "female", ageYears: 28, weightKg: 75, heightCm: 175 }), 1542.75);
});

test("energy target preserves explicit PAL and goal adjustment", () => {
  const result = calculateEnergyTarget({ rmrKcal: 1708.75, pal: 1.5, goalAdjustmentKcal: -250 });
  assert.equal(result.tdeeKcal, 2563.13);
  assert.equal(result.targetKcal, 2313.13);
  assert.equal(result.classification, "O");
});

test("macro calculation allocates remaining energy to carbohydrate", () => {
  const result = calculateMacroTargets({ targetKcal: 2400, weightKg: 75, proteinGPerKg: 1.6, fatEnergyRatio: 0.25 });
  assert.equal(result.proteinG, 120);
  assert.equal(result.fatG, 66.7);
  assert.equal(result.carbohydrateG, 330);
});

test("invalid PAL is rejected instead of silently defaulted", () => {
  assert.throws(() => calculateEnergyTarget({ rmrKcal: 1700, pal: 0.9 }), /pal/);
});
