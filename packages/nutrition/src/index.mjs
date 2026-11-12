/**
 * Deterministic nutrition primitives.
 * All units are explicit. PAL, goal adjustment and macro coefficients must be
 * supplied by the caller; this module does not silently invent them.
 */

export function calculateMifflinStJeor({ sex, ageYears, weightKg, heightCm }) {
  if (!["male", "female"].includes(sex)) throw new TypeError("sex must be male or female");
  if (!Number.isFinite(ageYears) || ageYears < 18 || ageYears > 100) throw new RangeError("ageYears must be between 18 and 100");
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new RangeError("weightKg must be positive");
  if (!Number.isFinite(heightCm) || heightCm <= 0) throw new RangeError("heightCm must be positive");
  const sexConstant = sex === "male" ? 5 : -161;
  return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + sexConstant;
}

export function calculateEnergyTarget({ rmrKcal, pal, goalAdjustmentKcal = 0 }) {
  if (!Number.isFinite(rmrKcal) || rmrKcal <= 0) throw new RangeError("rmrKcal must be positive");
  if (!Number.isFinite(pal) || pal < 1 || pal > 3) throw new RangeError("pal must be between 1 and 3");
  if (!Number.isFinite(goalAdjustmentKcal)) throw new TypeError("goalAdjustmentKcal must be finite");
  const tdeeKcal = rmrKcal * pal;
  const targetKcal = tdeeKcal + goalAdjustmentKcal;
  if (targetKcal <= 0) throw new RangeError("target energy must be positive");
  return Object.freeze({
    rmrKcal: round2(rmrKcal),
    pal,
    tdeeKcal: round2(tdeeKcal),
    goalAdjustmentKcal,
    targetKcal: round2(targetKcal),
    classification: "O"
  });
}

export function calculateMacroTargets({ targetKcal, weightKg, proteinGPerKg, fatEnergyRatio }) {
  if (!Number.isFinite(targetKcal) || targetKcal <= 0) throw new RangeError("targetKcal must be positive");
  if (!Number.isFinite(weightKg) || weightKg <= 0) throw new RangeError("weightKg must be positive");
  if (!Number.isFinite(proteinGPerKg) || proteinGPerKg <= 0) throw new RangeError("proteinGPerKg must be positive");
  if (!Number.isFinite(fatEnergyRatio) || fatEnergyRatio < 0.2 || fatEnergyRatio > 0.35) {
    throw new RangeError("fatEnergyRatio must be within the adult AMDR range 0.20–0.35");
  }
  const proteinG = weightKg * proteinGPerKg;
  const fatG = (targetKcal * fatEnergyRatio) / 9;
  const carbohydrateKcal = targetKcal - proteinG * 4 - fatG * 9;
  if (carbohydrateKcal < 0) throw new RangeError("protein and fat allocations exceed target energy");
  return Object.freeze({
    proteinG: round1(proteinG),
    fatG: round1(fatG),
    carbohydrateG: round1(carbohydrateKcal / 4),
    proteinRule: "R",
    fatRule: "R",
    carbohydrateRule: "F"
  });
}

function round1(value) { return Math.round((value + Number.EPSILON) * 10) / 10; }
function round2(value) { return Math.round((value + Number.EPSILON) * 100) / 100; }
