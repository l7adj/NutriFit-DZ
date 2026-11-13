import {
  ACTIVITY_BANDS,
  ALLERGENS,
  DEFAULT_MEAL_NAMES,
  DEFAULT_PRICING,
  DEFAULT_ZONES,
  GOALS,
} from '../data/seed';
import {
  ActivityBand,
  AllergenKey,
  AppState,
  CalcResult,
  CartItem,
  DeliveryZone,
  DishItem,
  FoodItem,
  MacroGaps,
  MacroTotals,
  PricingConfig,
  WeightEntry,
} from '../types';

export function round0(v: number): number {
  return Math.round(v || 0);
}

export function round1(v: number): number {
  return Math.round((v || 0) * 10) / 10;
}

export function round2(v: number): number {
  return Math.round((v || 0) * 100) / 100;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function algiersNow(): { d: string; h: number; m: number; s: number } {
  const parts: Record<string, string> = {};
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Algiers',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(new Date())
    .forEach((p) => {
      parts[p.type] = p.value;
    });
  return {
    d: `${parts.year}-${parts.month}-${parts.day}`,
    h: Number(parts.hour),
    m: Number(parts.minute),
    s: Number(parts.second),
  };
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatArabicDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

export function getNextDelivery(cutoffHour = DEFAULT_PRICING.cutoffHour): {
  date: string;
  closedToday: boolean;
  minutesLeft: number;
  secondsLeftInMin: number;
  cutoffHour: number;
} {
  const safeCutoff = clamp(Math.round(cutoffHour || 16), 8, 23);
  const now = algiersNow();
  const closed = now.h >= safeCutoff;
  const minutesLeft = closed ? 0 : (safeCutoff - now.h) * 60 - now.m - 1;
  const secondsLeftInMin = closed ? 0 : 60 - now.s;
  return {
    date: addDays(now.d, closed ? 2 : 1),
    closedToday: closed,
    minutesLeft: Math.max(0, minutesLeft),
    secondsLeftInMin: secondsLeftInMin === 60 ? 0 : secondsLeftInMin,
    cutoffHour: safeCutoff,
  };
}

export function safetyGateError(state: AppState): string {
  if (state.age < 18) {
    return 'العمر أقل من 18 سنة. لا نصدر خطة تغذية آلية للقاصرين، ويلزم إشراف ولي الأمر وأخصائي تغذية.';
  }
  if (state.fl.preg) {
    return 'حالة الحمل أو الرضاعة تتطلب متابعة طبية متخصصة قبل أي خطة تغذية.';
  }
  if (state.fl.kid) {
    return 'وجود مرض كلوي يتطلب مراجعة طبيب أو مختص تغذية علاجية ولا يُناسبه الحساب الآلي.';
  }
  if (state.fl.dia) {
    return 'السكري أو استخدام أدوية خافضة للسكر يتطلب إشرافًا طبيًا مباشرًا.';
  }
  if (state.fl.ed) {
    return 'وجود تاريخ مع اضطرابات الأكل يتطلب مرافقة مختص نفسي وتغذوي قبل اتباع خطة أرقام.';
  }
  return '';
}

export function calcNutrition(state: AppState): CalcResult {
  const gateErr = safetyGateError(state);
  const bmi = state.h > 0 ? state.w / Math.pow(state.h / 100, 2) : 0;

  if (gateErr) {
    return {
      err: gateErr,
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  if (state.age > 100 || state.w < 30 || state.w > 300 || state.h < 120 || state.h > 230) {
    return {
      err: 'يرجى إدخال عمر بين 18 و100 سنة، وزن بين 30 و300 كغ، وطول بين 120 و230 سم.',
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  if (state.goal === 'cut' && bmi < 18.5) {
    return {
      err: 'مؤشر كتلة الجسم أقل من 18.5 (نحافة)، لذا يُحجب هدف خسارة الدهون حفاظًا على سلامتك.',
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  const palRange = ACTIVITY_BANDS[state.band];
  if (state.pal < palRange.min || state.pal > palRange.max) {
    return {
      err: `معامل النشاط ${state.pal.toFixed(2)} خارج نطاق ${palRange.min.toFixed(2)}–${palRange.max.toFixed(2)} للنشاط المحدد.`,
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  if (state.lbm > state.w || state.rel < 0 || state.rel > 100) {
    return {
      err: 'تحقق من قياس الكتلة الخالية من الدهون وموثوقيته؛ يجب ألا تتجاوز LBM وزن الجسم، والموثوقية بين 0 و100%.',
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  if (state.pct < -25 || state.pct > 25) {
    return {
      err: 'نطاق الفائض أو العجز المسموح به هو بين −25% و+25% فقط.',
      kat: false,
      bmi,
      bmr: 0,
      tdee: 0,
      kcal: 0,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  const kat =
    state.lbm > 0 &&
    state.rel >= 70 &&
    state.lbmMethod !== undefined &&
    state.lbmMethod !== 'none';
  const bmr = kat
    ? 370 + 21.6 * state.lbm
    : 10 * state.w + 6.25 * state.h - 5 * state.age + (state.sex === 'm' ? 5 : -161);
  const tdee = bmr * state.pal;
  const kcal = tdee * (1 + state.pct / 100);

  if (kcal < bmr) {
    return {
      err: `السعرات المستهدفة (${round0(kcal)} kcal) أقل من معدل الأيض في الراحة (${round0(bmr)} kcal). خفّف نسبة العجز.`,
      kat,
      bmi,
      bmr,
      tdee,
      kcal,
      P: 0,
      F: 0,
      C: 0,
      fiber: 25,
      pg: 0,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: 0,
      warn: [],
    };
  }

  const warn: string[] = [];
  if (state.lbm > 0 && (!state.lbmMethod || state.lbmMethod === 'none' || state.rel < 70)) {
    warn.push('لم تُستخدم قيمة LBM لعدم توثيق طريقة القياس أو لأن موثوقية القياس أقل من 70%؛ استُخدمت معادلة Mifflin-St Jeor.');
  }
  if (state.pct < -20) {
    warn.push('عجز أكبر من 20%: يُنصح به لفترات قصيرة ومراقبة دقيقة فقط.');
  }

  const P =
    state.goal === 'cut' && kat ? 2.5 * state.lbm : GOALS[state.goal].proteinPerKg * state.w;
  const pg = P / state.w;
  if (pg > 3.1) {
    warn.push('كمية البروتين مرتفعة جدًا؛ تأكد من شرب ماء كافٍ وخلوّ الكلى من أي مشاكل.');
  }

  const F = (0.25 * kcal) / 9;
  const rawC = (kcal - 4 * P - 9 * F) / 4;
  if (rawC < 0) {
    return {
      err: 'مجموع البروتين والدهون يتجاوز السعرات المستهدفة. عدّل الهدف أو الوزن.',
      kat,
      bmi,
      bmr,
      tdee,
      kcal,
      P,
      F,
      C: 0,
      fiber: 25,
      pg,
      cg: 0,
      sc: 0,
      sp: 0,
      ev: '',
      fp: P,
      warn,
    };
  }

  // Carbohydrate is the energy remainder. Never clamp it: doing so would
  // silently increase the prescribed calories beyond the stated energy target.
  const C = rawC;
  const cg = C / state.w;
  if (cg < 3) {
    warn.push('الكارب منخفض نسبيًا لرياضي؛ راقب جودة الأداء أثناء الحصص.');
  } else if (cg > 12) {
    warn.push('الكارب مرتفع جدًا؛ تأكد أن حجم تدريبك الفعلي يبرر هذه الكمية.');
  }

  const sc = state.sup ? Math.min(state.supg, 0.5 * P) : 0;
  // Classify the amount actually credited, while retaining whether the
  // requested supplement amount exceeded the operational 50% ceiling.
  const requestedSp = state.sup && P > 0 ? (state.supg / P) * 100 : 0;
  const sp = P > 0 ? (sc / P) * 100 : 0;
  const ev =
    requestedSp > 50
      ? 'تم تحديده بسقف 50%'
      : sp <= 20
        ? 'مكمل خفيف'
        : sp <= 30
          ? 'توازن مثالي'
          : sp <= 40
            ? 'مقبول'
            : 'مرتفع';
  const fp = Math.max(0, P - sc);

  return {
    err: null,
    kat,
    bmi,
    bmr,
    tdee,
    kcal,
    P,
    F,
    C,
    fiber: 25,
    pg,
    cg,
    sc,
    sp,
    ev,
    fp,
    warn,
  };
}

export function foodMacros(food: FoodItem, grams: number): MacroTotals {
  const q = grams / 100;
  return {
    kcal: food.per100.kcal * q,
    p: food.per100.p * q,
    c: food.per100.c * q,
    f: food.per100.f * q,
    fiber: food.per100.fiber * q,
    price: food.price * q,
  };
}

export function dishMacros(
  dish: DishItem,
  foods: FoodItem[],
  mult = 1
): MacroTotals & { grams: number } {
  const foodMap = new Map(foods.map((f) => [f.id, f]));
  const res = { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, price: 0, grams: 0 };
  for (const [fid, g] of dish.ing) {
    const f = foodMap.get(fid);
    if (!f) continue;
    const totalG = g * mult;
    const m = foodMacros(f, totalG);
    res.kcal += m.kcal;
    res.p += m.p;
    res.c += m.c;
    res.f += m.f;
    res.fiber += m.fiber;
    res.price += m.price;
    res.grams += totalG;
  }
  return res;
}

export function cartItemMacros(
  item: CartItem,
  foods: FoodItem[],
  dishes: DishItem[]
): MacroTotals & { grams: number; rawIngredients: [string, number][] } {
  if (item.kind === 'food') {
    const f = foods.find((x) => x.id === item.id);
    const g = item.grams || 0;
    if (!f) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, price: 0, grams: 0, rawIngredients: [] };
    return { ...foodMacros(f, g), grams: g, rawIngredients: [[f.id, g]] };
  }
  if (item.kind === 'dish') {
    const d = dishes.find((x) => x.id === item.id);
    const mult = item.mult || 1;
    if (!d) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, price: 0, grams: 0, rawIngredients: [] };
    return {
      ...dishMacros(d, foods, mult),
      rawIngredients: d.ing.map(([fid, g]) => [fid, Math.round(g * mult)]),
    };
  }
  const ing = item.ing || [];
  const fakeDish: DishItem = {
    id: item.id,
    emoji: item.emoji || '🍱',
    name: item.name || 'وجبة مخصصة',
    ing,
  };
  return {
    ...dishMacros(fakeDish, foods, 1),
    rawIngredients: ing.map(([fid, g]) => [fid, Math.round(g)]),
  };
}

export function calcCartTotals(state: AppState): MacroTotals {
  return state.meals.reduce<MacroTotals>(
    (acc, m) => {
      const mac = cartItemMacros(m, state.foods, state.dishes);
      acc.kcal += mac.kcal;
      acc.p += mac.p;
      acc.c += mac.c;
      acc.f += mac.f;
      acc.fiber += mac.fiber;
      acc.price += mac.price;
      return acc;
    },
    { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, price: 0 }
  );
}

export function calcGaps(state: AppState): MacroGaps {
  const r = calcNutrition(state);
  if (r.err) return { kcal: 0, P: 0, C: 0, F: 0 };
  const t = calcCartTotals(state);
  return {
    kcal: Math.max(0, r.kcal - t.kcal),
    P: Math.max(0, r.fp - t.p),
    C: Math.max(0, r.C - t.c),
    F: Math.max(0, r.F - t.f),
  };
}

export function calcCartPrice(
  ingRaw: number,
  mealCount: number,
  zoneFee: number,
  config: PricingConfig = DEFAULT_PRICING
) {
  const ing = Math.round(ingRaw);
  const handling = Math.round(ing * ((config.handlingPct ?? 7) / 100));
  const service = Math.round((config.serviceFeePerMeal ?? 200) * mealCount);
  const delivery = Math.round(zoneFee || 0);
  const total = ing + handling + service + delivery;
  return { ing, handling, service, delivery, total };
}

export function getSelectedZone(state: AppState): DeliveryZone {
  const zones = state.zones && state.zones.length > 0 ? state.zones : DEFAULT_ZONES;
  const activeZones = zones.filter((z) => z.active);
  const pool = activeZones.length > 0 ? activeZones : zones;
  return pool.find((z) => z.id === state.zoneId) || pool[0];
}

export function getFoodGramDefaults(food: FoodItem): {
  def: number;
  min: number;
  max: number;
  step: number;
  presets: number[];
} {
  if (food.cat === 'juice') {
    return { def: 250, min: 100, max: 600, step: 10, presets: [200, 250, 330, 500] };
  }
  if (food.per100.f >= 85 || food.id === 'oil') {
    return { def: 10, min: 5, max: 50, step: 5, presets: [5, 10, 15, 20] };
  }
  if (food.id === 'avc') {
    return { def: 75, min: 25, max: 250, step: 5, presets: [50, 75, 100, 150] };
  }
  if (food.cat === 'fat') {
    return { def: 20, min: 5, max: 100, step: 5, presets: [15, 20, 30, 50] };
  }
  if (food.cat === 'veg') {
    return { def: 100, min: 30, max: 400, step: 10, presets: [75, 100, 150, 200] };
  }
  if (food.id === 'brd') {
    return { def: 80, min: 30, max: 300, step: 10, presets: [50, 80, 120, 160] };
  }
  return { def: 150, min: 30, max: 450, step: 10, presets: [100, 150, 200, 250] };
}

export function getDominantMacro(food: FoodItem): {
  key: 'P' | 'C' | 'F';
  label: string;
  shortLabel: string;
  color: string;
  per100Val: number;
} {
  const pKcal = food.per100.p * 4;
  const cKcal = food.per100.c * 4;
  const fKcal = food.per100.f * 9;
  if (pKcal >= cKcal && pKcal >= fKcal) {
    return {
      key: 'P',
      label: 'بروتين',
      shortLabel: 'مصدر بروتين',
      color: '#d4a24c',
      per100Val: food.per100.p,
    };
  }
  if (cKcal >= pKcal && cKcal >= fKcal) {
    return {
      key: 'C',
      label: 'كارب',
      shortLabel: 'مصدر طاقة وكارب',
      color: '#5aa882',
      per100Val: food.per100.c,
    };
  }
  return {
    key: 'F',
    label: 'دهون',
    shortLabel: 'مصدر دهون صحية',
    color: '#c97a57',
    per100Val: food.per100.f,
  };
}

export function getBlockedAllergensForFood(food: FoodItem, userAllergens: AllergenKey[]): AllergenKey[] {
  return food.al.filter((a) => userAllergens.includes(a));
}

export function getBlockedAllergensForDish(
  dish: DishItem,
  foods: FoodItem[],
  userAllergens: AllergenKey[]
): AllergenKey[] {
  const set = new Set<AllergenKey>();
  for (const [fid] of dish.ing) {
    const f = foods.find((x) => x.id === fid);
    if (!f) continue;
    for (const a of getBlockedAllergensForFood(f, userAllergens)) {
      set.add(a);
    }
  }
  return Array.from(set);
}

export function formatAllergenList(keys: AllergenKey[]): string {
  return keys.map((k) => ALLERGENS[k]).join('، ');
}

export function autoDistributeMeals(
  meals: CartItem[],
  mealCount: number,
  foods: FoodItem[],
  dishes: DishItem[]
): CartItem[] {
  if (mealCount <= 1) {
    return meals.map((m) => ({ ...m, slot: 0 }));
  }
  const indexed = meals.map((m, idx) => ({
    idx,
    kcal: cartItemMacros(m, foods, dishes).kcal,
  }));
  indexed.sort((a, b) => b.kcal - a.kcal);
  const slotKcal = Array.from({ length: mealCount }, () => 0);
  const assignedSlot = new Array<number>(meals.length).fill(0);

  for (const item of indexed) {
    let bestSlot = 0;
    for (let s = 1; s < mealCount; s++) {
      if (slotKcal[s] < slotKcal[bestSlot]) bestSlot = s;
    }
    assignedSlot[item.idx] = bestSlot;
    slotKcal[bestSlot] += item.kcal;
  }

  return meals.map((m, i) => ({ ...m, slot: assignedSlot[i] }));
}

export function calcLinearRegression28d(entries: WeightEntry[]): {
  count: number;
  slopeKgPerWeek: number;
  startWeight: number;
  endWeight: number;
} | null {
  const today = algiersNow().d;
  const cutoff = addDays(today, -28);
  const recent = entries
    .filter((e) => e.d >= cutoff)
    .sort((a, b) => (a.d < b.d ? -1 : 1));

  if (recent.length < 4) return null;

  const t0 = new Date(`${recent[0].d}T12:00:00Z`).getTime();
  const points = recent.map((e) => ({
    x: (new Date(`${e.d}T12:00:00Z`).getTime() - t0) / 86400000,
    y: e.w,
  }));

  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) * (p.x - meanX);
  }
  if (den === 0) return null;

  const slopePerDay = num / den;
  return {
    count: n,
    slopeKgPerWeek: round2(slopePerDay * 7),
    startWeight: recent[0].w,
    endWeight: recent[recent.length - 1].w,
  };
}

export function suggestWeeklyCalibration(state: AppState): {
  canSuggest: boolean;
  deltaPct: number;
  rateKgPerWeek: number | null;
  targetRate: number;
  reason: string;
} {
  const reg = calcLinearRegression28d(state.jr);
  const targetRate = GOALS[state.goal].targetRateKgWk;

  if (!reg) {
    return {
      canSuggest: false,
      deltaPct: 0,
      rateKgPerWeek: null,
      targetRate,
      reason: 'نحتاج 4 قياسات وزن على الأقل خلال آخر 28 يومًا لحساب الانحدار الخطي الأسبوعي بدقة.',
    };
  }

  if (state.adh < 80) {
    return {
      canSuggest: false,
      deltaPct: 0,
      rateKgPerWeek: reg.slopeKgPerWeek,
      targetRate,
      reason: `الالتزام الأسبوعي (${state.adh}%) أقل من 80%. لا نقترح تعديل السعرات لأن ثبات الوزن حينها يدل على الالتزام لا على خطأ الحساب.`,
    };
  }

  const diff = reg.slopeKgPerWeek - targetRate;
  if (Math.abs(diff) <= 0.15) {
    return {
      canSuggest: false,
      deltaPct: 0,
      rateKgPerWeek: reg.slopeKgPerWeek,
      targetRate,
      reason: `معدل تغير وزنك (${reg.slopeKgPerWeek > 0 ? '+' : ''}${reg.slopeKgPerWeek} كغ/أسبوع) متطابق تقريبًا مع المستهدف (${targetRate > 0 ? '+' : ''}${targetRate} كغ/أسبوع). لا حاجة لتعديل.`,
    };
  }

  const deltaPct = diff > 0 ? -5 : 5;
  if (state.pct + deltaPct < -25 || state.pct + deltaPct > 25) {
    return {
      canSuggest: false,
      deltaPct: 0,
      rateKgPerWeek: reg.slopeKgPerWeek,
      targetRate,
      reason: 'الاقتراح يتجاوز حدود الأمان (±25%). يُفضّل مراجعة مختص قبل أي خفض أو رفع إضافي.',
    };
  }

  return {
    canSuggest: true,
    deltaPct,
    rateKgPerWeek: reg.slopeKgPerWeek,
    targetRate,
    reason: `معدل التغير خلال 28 يومًا هو ${reg.slopeKgPerWeek > 0 ? '+' : ''}${reg.slopeKgPerWeek} كغ/أسبوع مقارنة بالمستهدف (${targetRate > 0 ? '+' : ''}${targetRate} كغ/أسبوع). نقترح ${deltaPct > 0 ? 'زيادة' : 'خفض'} 5% من السعرات.`,
  };
}

export function bandRangeText(band: ActivityBand): string {
  const b = ACTIVITY_BANDS[band];
  return `${b.min.toFixed(2)}–${b.max.toFixed(2)}`;
}

export function getMealSlotName(state: AppState, index: number): string {
  const custom = state.mealNames?.[index];
  if (custom && custom.trim()) return custom;
  return DEFAULT_MEAL_NAMES[index] || `الوجبة ${index + 1}`;
}
