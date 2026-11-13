import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, DEFAULT_PRICING } from '../src/data/seed.ts';
import {
  calcCartPrice,
  calcNutrition,
  getBlockedAllergensForDish,
  getBlockedAllergensForFood,
} from '../src/utils/nutrition.ts';

test('macro energy remains equal to the daily energy target', () => {
  const state = createInitialState();
  const result = calcNutrition(state);

  assert.equal(result.err, null);
  const macroEnergy = result.P * 4 + result.C * 4 + result.F * 9;
  assert.ok(Math.abs(macroEnergy - result.kcal) < 0.001);
});

test('carbohydrate is not silently clamped to an arbitrary minimum', () => {
  const state = createInitialState();
  state.w = 300;
  state.h = 120;
  state.age = 100;
  state.pal = 1.4;
  state.band = 'L';
  state.goal = 'cut';
  state.pct = -25;

  const result = calcNutrition(state);

  assert.equal(result.err, null);
  assert.ok(result.C > 0);
  assert.ok(result.C < 60);
  const macroEnergy = result.P * 4 + result.C * 4 + result.F * 9;
  assert.ok(Math.abs(macroEnergy - result.kcal) < 0.001);
});

test('health safety gate blocks automatic plans for minors', () => {
  const state = createInitialState();
  state.age = 17;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /أقل من 18/);
});

test('health safety gate blocks cut goal when BMI is below 18.5', () => {
  const state = createInitialState();
  state.w = 50;
  state.h = 175;
  state.goal = 'cut';
  state.pct = -15;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /18\.5/);
});

test('energy target below BMR is rejected cleanly', () => {
  const state = createInitialState();
  state.band = 'S';
  state.pal = 1.2;
  state.goal = 'cut';
  state.pct = -25;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /أقل من معدل الأيض في الراحة/);
});

test('Katch-McArdle is used only when measured lean mass is supplied with sufficient reliability', () => {
  const state = createInitialState();
  state.lbm = 60;
  state.rel = 70;
  state.lbmMethod = 'inbody';

  const result = calcNutrition(state);

  assert.equal(result.kat, true);
  assert.equal(result.bmr, 370 + 21.6 * 60);
});

test('PAL cannot escape its selected activity band', () => {
  const state = createInitialState();
  state.band = 'A';
  state.pal = 2.1;

  const result = calcNutrition(state);

  assert.match(result.err ?? '', /خارج نطاق/);
});

test('unreliable lean-mass measurements fall back to Mifflin with an explicit warning', () => {
  const state = createInitialState();
  state.lbm = 60;
  state.rel = 69;
  state.lbmMethod = 'inbody';

  const result = calcNutrition(state);

  assert.equal(result.err, null);
  assert.equal(result.kat, false);
  assert.ok(result.warn.some((warning) => warning.includes('موثوقية القياس أقل من 70%')));
});

test('supplement protein exceeding 50% is capped at 50% and splits into sc + fp', () => {
  const state = createInitialState();
  state.sup = true;
  state.supg = 120;

  const result = calcNutrition(state);

  assert.equal(result.err, null);
  assert.equal(result.sp, 50);
  assert.equal(result.ev, 'تم تحديده بسقف 50%');
  assert.ok(Math.abs(result.sc + result.fp - result.P) < 0.001);
});

test('transparent pricing calculates market food cost + 7% handling + per-meal fee + delivery fee', () => {
  const invoice = calcCartPrice(1000, 3, 150, DEFAULT_PRICING);

  assert.equal(invoice.ing, 1000);
  assert.equal(invoice.handling, 70);
  assert.equal(invoice.service, 600);
  assert.equal(invoice.delivery, 150);
  assert.equal(invoice.total, 1820);
});

test('allergen blocking detects customer allergens on individual foods and dishes', () => {
  const state = createInitialState();
  const eggFood = state.foods.find((f) => f.al.includes('eggs'));
  assert.ok(eggFood);
  assert.deepEqual(getBlockedAllergensForFood(eggFood, ['eggs']), ['eggs']);

  const dishWithEgg = state.dishes.find((d) =>
    d.ing.some(([fid]) => state.foods.find((f) => f.id === fid)?.al.includes('eggs'))
  );
  if (dishWithEgg) {
    assert.ok(getBlockedAllergensForDish(dishWithEgg, state.foods, ['eggs']).includes('eggs'));
  }
});

test('seed foods remain honestly marked unverified until laboratory or reference table approval', () => {
  const state = createInitialState();
  assert.ok(state.foods.length > 0);
  assert.equal(state.foods.every((f) => f.nutritionDataStatus === 'unverified'), true);
  assert.equal(state.foods.every((f) => f.nutritionBasis === 'unspecified'), true);
});

test('new customer journal starts empty and never displays invented weight history', () => {
  const state = createInitialState();
  assert.deepEqual(state.jr, []);
  assert.deepEqual(state.photos, []);
});

test('seed delivery zones are all inactive until real coverage is approved', () => {
  const state = createInitialState();
  assert.ok(state.zones.length > 0);
  assert.equal(state.zones.some((zone) => zone.active), false);
});

