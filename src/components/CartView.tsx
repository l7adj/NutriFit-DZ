import React, { useState } from 'react';
import { DEFAULT_MEAL_NAMES, DEFAULT_PRICING } from '../data/seed';
import { AppState, AppTab, Order } from '../types';
import {
  autoDistributeMeals,
  calcCartPrice,
  calcCartTotals,
  calcNutrition,
  cartItemMacros,
  clamp,
  formatArabicDate,
  getBlockedAllergensForDish,
  getBlockedAllergensForFood,
  getMealSlotName,
  getNextDelivery,
  getSelectedZone,
  round0,
  round1,
} from '../utils/nutrition';
import { MealSlotsSummary } from './MealSlotsSummary';
import { apiRequest } from '../services/api';
import { CheckCircle2, Clock, Minus, Plus, Sparkles, Trash2 } from 'lucide-react';

interface CartViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (tab: AppTab) => void;
  onSelectMealSlot: (slotIdx: number) => void;
  onToast: (msg: string, undo?: () => void) => void;
  apiEnabled?: boolean;
  authToken?: string;
}

const STAGE_LABELS: Record<NonNullable<Order['productionStage']>, string> = {
  queued: 'بانتظار التحضير',
  preparing: 'قيد التحضير في المطبخ',
  packed: 'تم الوزن والتعبئة',
  out_for_delivery: 'خرج للتوصيل',
  delivered: 'تم التسليم',
};

export const CartView: React.FC<CartViewProps> = ({
  state,
  onUpdate,
  onNavigate,
  onSelectMealSlot,
  onToast,
  apiEnabled = false,
  authToken,
}) => {
  const [confirmModal, setConfirmModal] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const res = calcNutrition(state);
  const totals = calcCartTotals(state);
  const pricingCfg = state.pricingConfig || DEFAULT_PRICING;
  const dlv = getNextDelivery(pricingCfg.cutoffHour);
  const activeZones = state.zones.filter((z) => z.active);
  const selectedZone = activeZones.find((z) => z.id === state.zoneId) ?? activeZones[0] ?? getSelectedZone(state);
  const zoneOptions = activeZones;
  const pricing = calcCartPrice(totals.price, state.n, selectedZone.fee, pricingCfg);

  if (res.err) {
    return (
      <div className="bg-[#1a1111] border border-[#b86157]/50 rounded-2xl p-4 text-sm text-[#f3f1ec]">
        {res.err}
      </div>
    );
  }

  const removeItem = (uid: string) => {
    const backup = [...state.meals];
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.uid !== uid),
    }));
    onToast('حُذف الصنف من السلة', () => {
      onUpdate((prev) => ({ ...prev, meals: backup }));
    });
  };

  const handleAutoDistribute = () => {
    onUpdate((prev) => ({
      ...prev,
      meals: autoDistributeMeals(prev.meals, prev.n, prev.foods, prev.dishes),
    }));
    onToast('تم توزيع الأصناف تلقائيًا على وجبات اليوم');
  };

  const updateMealName = (slotIdx: number, newName: string) => {
    onUpdate((prev) => {
      const names = [...(prev.mealNames || DEFAULT_MEAL_NAMES)];
      while (names.length < 5) {
        names.push(DEFAULT_MEAL_NAMES[names.length] || `الوجبة ${names.length + 1}`);
      }
      names[slotIdx] = newName;
      return { ...prev, mealNames: names };
    });
  };

  const cancelOrder = async (order: Order) => {
    if (apiEnabled) {
      if (!authToken) { onToast('انتهت جلسة الدخول؛ سجّل الدخول مجدداً.'); return; }
      try {
        await apiRequest('/api/orders/' + order.id,authToken,{method:'DELETE'});
      } catch (error) {
        onToast(error instanceof Error ? error.message : 'تعذر إلغاء الطلب.');
        return;
      }
    }
    onUpdate((prev) => ({
      ...prev,
      ord: prev.ord.map((item) => item.id === order.id ? {...item,status:'X'} : item),
    }));
    onToast('تم إلغاء الطلب.');
  };

  const handlePlaceOrder = async () => {
    if (submitting) return;
    if (!state.name.trim()) {
      onToast('أدخل الاسم أو اللقب في ملفك قبل حفظ الطلب');
      return;
    }
    if (activeZones.length === 0) {
      onToast('لا توجد منطقة خدمة معتمدة بعد؛ لا يمكن حفظ طلب توصيل حتى يحددها المسؤول');
      return;
    }
    if (!selectedZone.active) {
      onToast('اختر منطقة خدمة معتمدة قبل المتابعة');
      return;
    }
    if (state.meals.length === 0) {
      onToast('السلة فارغة؛ أضف وجباتك أولاً');
      return;
    }

    const emptySlot = Array.from({ length: state.n }, (_, slot) => slot).find(
      (slot) => !state.meals.some((item) => clamp(item.slot || 0, 0, state.n - 1) === slot)
    );
    if (emptySlot !== undefined) {
      onToast(`أكمل ${getMealSlotName(state, emptySlot)} قبل حفظ الطلب التجريبي`);
      return;
    }

    for (const m of state.meals) {
      if (m.kind === 'food') {
        const f = state.foods.find((x) => x.id === m.id);
        if (!f) {
          onToast('أحد المكونات لم يعد موجودًا في القائمة؛ احذفه ثم أعد اختياره');
          return;
        }
        if (f.available === false) {
          onToast(`الصنف "${f.name}" لم يعد متوفرًا اليوم`);
          return;
        }
        if (getBlockedAllergensForFood(f, state.al).length > 0) {
          onToast('تحتوي السلة على مكوّن يسبب لك حساسية');
          return;
        }
      } else if (m.kind === 'dish') {
        const d = state.dishes.find((x) => x.id === m.id);
        if (!d) {
          onToast('أحد الأطباق لم يعد موجودًا في القائمة؛ احذفه ثم أعد اختياره');
          return;
        }
        if (d.available === false) {
          onToast(`الطبق "${d.name}" لم يعد متوفرًا اليوم`);
          return;
        }
        if (d.ing.some(([foodId]) => !state.foods.some((food) => food.id === foodId))) {
          onToast('توجد مكونات ناقصة في أحد الأطباق؛ راجع قائمة الطعام');
          return;
        }
        if (d.ing.some(([foodId]) => state.foods.find((food) => food.id === foodId)?.available === false)) {
          onToast('أحد مكونات الطبق غير متوفر اليوم');
          return;
        }
        if (getBlockedAllergensForDish(d, state.foods, state.al).length > 0) {
          onToast('تحتوي السلة على طبق يسبب لك حساسية');
          return;
        }
      } else {
        const ingredients = m.ing || [];
        if (ingredients.length === 0) {
          onToast('توجد وجبة مخصصة بلا مكونات؛ أكملها أو احذفها');
          return;
        }
        for (const [foodId] of ingredients) {
          const food = state.foods.find((x) => x.id === foodId);
          if (!food || food.available === false) {
            onToast('توجد مكونات مخصصة غير متاحة؛ راجع الوجبة');
            return;
          }
          if (getBlockedAllergensForFood(food, state.al).length > 0) {
            onToast('تحتوي إحدى الوجبات المخصصة على مسبب حساسية مسجل لديك');
            return;
          }
        }
      }
    }

    const usedMeals = state.ord
      .filter((o) => o.date === dlv.date && o.status === 'C')
      .reduce((acc, o) => acc + o.n, 0);
    const status: 'C' | 'W' = usedMeals + state.n > state.cap ? 'W' : 'C';

    const items = state.meals.map((m) => {
      const mac = cartItemMacros(m, state.foods, state.dishes);
      const slotIdx = clamp(m.slot || 0, 0, state.n - 1);
      let label = m.name || 'وجبة مخصصة';
      if (m.kind === 'food') {
        label = state.foods.find((x) => x.id === m.id)?.name || 'مكوّن';
      } else if (m.kind === 'dish') {
        label = state.dishes.find((x) => x.id === m.id)?.name || 'طبق';
      }
      return {
        label,
        grams: round0(mac.grams),
        kcal: round0(mac.kcal),
        p: round0(mac.p),
        slot: slotIdx,
        slotName: getMealSlotName(state, slotIdx),
        rawIngredients: mac.rawIngredients,
      };
    });

    const newOrder: Order = {
      id: `NF-${Date.now().toString().slice(-6)}`,
      createdAt: new Date().toISOString(),
      date: dlv.date,
      n: state.n,
      zoneTitle: selectedZone.title,
      zoneFee: selectedZone.fee,
      note: state.orderNote.trim(),
      ingCost: pricing.ing,
      handling: pricing.handling,
      service: pricing.service,
      total: pricing.total,
      kcal: round0(totals.kcal),
      p: round0(totals.p),
      c: round0(totals.c),
      f: round0(totals.f),
      status,
      productionStage: status === 'C' ? 'queued' : undefined,
      items,
    };

    let orderToSave = newOrder;
    if (apiEnabled) {
      if (!authToken) {
        onToast('انتهت جلسة الدخول؛ سجّل الدخول مجدداً.');
        return;
      }
      setSubmitting(true);
      try {
        const response = await apiRequest<{ order: {
          id: string; order_number: string; delivery_date: string; order_status: string;
          total_dzd: number | string; production_stage: Order['productionStage'];
          delivery_fee_dzd: number | string; ingredient_cost_dzd: number | string;
          handling_fee_dzd: number | string; service_fee_dzd: number | string;
          kcal_total: number | string; protein_total: number | string; carbs_total: number | string; fat_total: number | string;
        } }>('/api/orders', authToken, {
          method: 'POST',
          body: JSON.stringify({
            zoneId: selectedZone.id,
            mealCount: state.n,
            note: state.orderNote.trim(),
            items: state.meals.map((item) => ({
              kind: item.kind,
              id: item.id,
              label: item.name,
              grams: item.grams,
              multiplier: item.mult ?? 1,
              ingredients: item.kind === 'custom'
                ? (item.ing ?? []).map(([foodId, grams]) => ({ foodId, grams }))
                : undefined,
              slot: clamp(item.slot || 0, 0, state.n - 1),
              slotName: getMealSlotName(state, clamp(item.slot || 0, 0, state.n - 1)),
            })),
          }),
        });
        orderToSave = {
          ...newOrder,
          id: response.order.id,
          date: String(response.order.delivery_date).slice(0, 10),
          total: Number(response.order.total_dzd),
          zoneFee: Number(response.order.delivery_fee_dzd),
          ingCost: Number(response.order.ingredient_cost_dzd),
          handling: Number(response.order.handling_fee_dzd),
          service: Number(response.order.service_fee_dzd),
          kcal: Number(response.order.kcal_total),
          p: Number(response.order.protein_total),
          c: Number(response.order.carbs_total),
          f: Number(response.order.fat_total),
          status: response.order.order_status === 'confirmed' ? 'C' : 'W',
          productionStage: response.order.production_stage ?? undefined,
        };
      } catch (error) {
        onToast(error instanceof Error ? error.message : 'تعذر إرسال الطلب إلى الخادم.');
        return;
      } finally {
        setSubmitting(false);
      }
    }

    onUpdate((prev) => ({
      ...prev,
      ord: [...prev.ord, orderToSave],
      meals: [],
      orderNote: '',
    }));
    setConfirmModal(orderToSave);
  };

  const cutoffLabel = `${String(dlv.cutoffHour).padStart(2, '0')}:00`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#f3f1ec]">السلة وتأكيد الطلب</h1>
        {state.meals.length > 0 && (
          <button
            type="button"
            onClick={handleAutoDistribute}
            className="touch-press px-3 py-1.5 rounded-xl bg-[#18181c] border border-[#c8a96e]/40 text-xs font-bold text-[#e6d1a3] flex items-center gap-1.5 cursor-pointer hover:bg-[#1c1a15]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            توازن تلقائي
          </button>
        )}
      </div>

      {apiEnabled ? (
        <div className="rounded-xl border border-[#6b9c7e]/35 bg-[#121a15] px-4 py-3 text-[11px] leading-6 text-[#cbe3d3]" role="status">
          <strong className="text-[#6b9c7e]">طلب متصل بالخادم:</strong>{' '}
          يتم حساب الأسعار والقيم الغذائية والتحقق من الطاقة الاستيعابية ومسببات الحساسية على الخادم، والدفع نقداً عند الاستلام.
        </div>
      ) : (
        <div className="rounded-xl border border-[#c8a96e]/25 bg-[#18181c] px-4 py-3 text-[11px] leading-6 text-[#96938a]" role="status">
          <strong className="text-[#e6d1a3]">نسخة معاينة:</strong>{' '}
          يمكنك اختبار توزيع الوجبات والتكلفة وحفظ طلب تجريبي على هذا الجهاز فقط.
          لا يُرسل الطلب إلى مطبخ فعلي ولا يحجز موعد توصيل.
        </div>
      )}

      {state.meals.length === 0 ? (
        <div className="bg-[#111114] border border-[#232329] rounded-2xl p-8 text-center space-y-3">
          <div className="text-sm font-bold text-[#f3f1ec]">سلة وجبات الغد فارغة</div>
          <p className="text-xs text-[#96938a]">
            اختر أطباقًا مختلفة للوجبة الصباحية وبعد التمرين والعشاء من القائمة.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="touch-press px-6 py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
          >
            تصفح الوجبات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Macro Bars + Daily Meal Sections */}
          <div className="lg:col-span-7 space-y-4">
            {/* Purposeful Executive Macro Bars */}
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-2.5">
              {[
                { label: 'سعرات', val: totals.kcal, target: res.kcal, barColor: '#c8a96e', unit: '' },
                { label: 'بروتين', val: totals.p, target: res.fp, barColor: '#e6d1a3', unit: 'غ' },
                { label: 'كارب', val: totals.c, target: res.C, barColor: '#6b9c7e', unit: 'غ' },
                { label: 'دهون', val: totals.f, target: res.F, barColor: '#a98c72', unit: 'غ' },
              ].map((b) => {
                const pct = b.target > 0 ? clamp((b.val / b.target) * 100, 0, 100) : 0;
                return (
                  <div key={b.label} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-[#96938a] font-medium">{b.label}</span>
                    <div className="flex-1 h-1.5 bg-[#18181c] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: b.barColor }}
                      />
                    </div>
                    <span className="w-24 text-left font-bold text-[#f3f1ec] tabular-nums">
                      {round0(b.val)} / {round0(b.target)}{b.unit}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Daily Meals Count Control */}
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-[#f3f1ec]">تقسيم وجبات اليوم</div>
                <div className="text-xs text-[#96938a] mt-0.5">
                  كل وجبة لها أطباقها الخاصة (صباحية، بعد التمرين، عشاء...)
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={state.n <= 1}
                  onClick={() => {
                    const nextN = Math.max(1, state.n - 1);
                    onUpdate((prev) => ({
                      ...prev,
                      n: nextN,
                      activeSlot: Math.min(prev.activeSlot ?? 0, nextN - 1),
                      meals: prev.meals.map((m) => ({
                        ...m,
                        slot: Math.min(m.slot, nextN - 1),
                      })),
                    }));
                  }}
                  className="touch-press w-9 h-9 rounded-xl bg-[#18181c] border border-[#232329] flex items-center justify-center text-[#f3f1ec] disabled:opacity-35 cursor-pointer"
                  aria-label="تقليل وجبة"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-[#e6d1a3] tabular-nums w-8 text-center">
                  {state.n}
                </span>
                <button
                  type="button"
                  disabled={state.n >= 5}
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, n: Math.min(5, prev.n + 1) }))
                  }
                  className="touch-press w-9 h-9 rounded-xl bg-[#18181c] border border-[#232329] flex items-center justify-center text-[#f3f1ec] disabled:opacity-35 cursor-pointer"
                  aria-label="إضافة وجبة"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Grouped by Distinct Daily Meal */}
            <div className="space-y-3">
              {Array.from({ length: state.n }, (_, slotIdx) => {
                const slotMeals = state.meals.filter(
                  (m) => clamp(m.slot || 0, 0, state.n - 1) === slotIdx
                );
                const slotTotals = slotMeals.reduce(
                  (acc, m) => {
                    const mac = cartItemMacros(m, state.foods, state.dishes);
                    acc.kcal += mac.kcal;
                    acc.p += mac.p;
                    acc.price += mac.price;
                    return acc;
                  },
                  { kcal: 0, p: 0, price: 0 }
                );

                return (
                  <div
                    key={slotIdx}
                    className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#232329]">
                      <input
                        type="text"
                        value={getMealSlotName(state, slotIdx)}
                        onChange={(e) => updateMealName(slotIdx, e.target.value)}
                        className="bg-transparent text-sm font-bold text-[#e6d1a3] focus:outline-none focus:border-b focus:border-[#c8a96e] min-w-0 flex-1"
                        aria-label={`اسم الوجبة ${slotIdx + 1}`}
                      />
                      <div className="text-xs text-[#96938a] tabular-nums shrink-0">
                        {round0(slotTotals.kcal)} kcal · <span className="text-[#c8a96e]">P{round0(slotTotals.p)}</span>
                      </div>
                    </div>

                    {slotMeals.length === 0 ? (
                      <div className="flex items-center justify-between py-2 text-xs text-[#66645e]">
                        <span>لا توجد أصناف مخصصة لهذه الوجبة بعد.</span>
                        <button
                          type="button"
                          onClick={() => onSelectMealSlot(slotIdx)}
                          className="touch-press text-[#c8a96e] font-semibold hover:underline cursor-pointer"
                        >
                          + أضف طبقًا
                        </button>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#232329]">
                        {slotMeals.map((m) => {
                          const mac = cartItemMacros(m, state.foods, state.dishes);
                          let name = m.name || 'وجبة مخصصة';
                          let isJuice = false;
                          if (m.kind === 'food') {
                            const f = state.foods.find((x) => x.id === m.id);
                            if (f) {
                              name = f.name;
                              isJuice = f.cat === 'juice';
                            }
                          } else if (m.kind === 'dish') {
                            const d = state.dishes.find((x) => x.id === m.id);
                            if (d) {
                              name = d.name;
                            }
                          }
                          const customBreakdown =
                            m.kind === 'custom' && Array.isArray(m.ing) && m.ing.length > 0
                              ? m.ing
                                  .map(([fId, g]) => {
                                    const fd = state.foods.find((x) => x.id === fId);
                                    if (!fd) return null;
                                    return `${fd.name} (${round0(g)}${fd.cat === 'juice' ? 'مل' : 'غ'})`;
                                  })
                                  .filter(Boolean)
                                  .join(' + ')
                              : '';

                          return (
                            <div
                              key={m.uid}
                              className="py-2.5 flex flex-wrap sm:flex-nowrap items-center gap-2"
                            >
                              <div className="flex-1 min-w-[140px]">
                                <div className="text-xs sm:text-sm font-semibold text-[#f3f1ec]">
                                  {name}
                                </div>
                                {customBreakdown && (
                                  <div className="text-[11px] text-[#96938a] mt-0.5 leading-relaxed">
                                    {customBreakdown}
                                  </div>
                                )}
                                <div className="text-[11px] text-[#96938a] tabular-nums mt-0.5">
                                  {round0(mac.kcal)} kcal ·{' '}
                                  <span className="text-[#c8a96e]">P{round0(mac.p)}</span>{' '}
                                  <span className="text-[#6b9c7e]">C{round0(mac.c)}</span>{' '}
                                  <span className="text-[#a98c72]">F{round0(mac.f)}</span> ·{' '}
                                  <span className="text-[#e6d1a3] font-bold">{round1(mac.price)} دج</span>
                                </div>
                              </div>

                              {m.kind === 'food' ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={m.grams || 0}
                                    onChange={(e) => {
                                      const g = Math.max(0, parseFloat(e.target.value) || 0);
                                      onUpdate((prev) => ({
                                        ...prev,
                                        meals: prev.meals.map((item) =>
                                          item.uid === m.uid ? { ...item, grams: g } : item
                                        ),
                                      }));
                                    }}
                                    className="w-16 bg-[#18181c] border border-[#232329] rounded-lg px-2 py-1 text-center text-xs text-[#f3f1ec] tabular-nums focus:border-[#c8a96e] outline-none"
                                  />
                                  <span className="text-[11px] text-[#66645e]">
                                    {isJuice ? 'مل' : 'غ'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#96938a] px-2 tabular-nums">
                                  {m.kind === 'dish'
                                    ? m.mult === 0.75
                                      ? 'حصة خفيفة'
                                      : m.mult === 1.5
                                        ? 'حصة كبيرة'
                                        : 'حصة قياسية'
                                    : `${round0(mac.grams)}غ`}
                                </span>
                              )}

                              <select
                                value={slotIdx}
                                onChange={(e) => {
                                  const nextSlot = Number(e.target.value);
                                  onUpdate((prev) => ({
                                    ...prev,
                                    meals: prev.meals.map((item) =>
                                      item.uid === m.uid ? { ...item, slot: nextSlot } : item
                                    ),
                                  }));
                                }}
                                className="bg-[#18181c] border border-[#232329] rounded-lg px-2 py-1.5 text-[11px] text-[#f3f1ec] max-w-[135px]"
                              >
                                {Array.from({ length: state.n }, (_, s) => (
                                  <option key={s} value={s}>
                                    {getMealSlotName(state, s)}
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() => removeItem(m.uid)}
                                className="touch-press p-1.5 text-[#96938a] hover:text-[#b86157] rounded-lg cursor-pointer"
                                aria-label="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
              <div className="text-sm font-bold text-[#f3f1ec] mb-3">ملخص توزيع اليوم</div>
              <MealSlotsSummary state={state} onSelectSlot={onSelectMealSlot} />
            </div>
          </div>

          {/* Right Column: Delivery Zone, Note & Transparent Invoice */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-4">
              <div>
                <div className="text-sm font-bold text-[#f3f1ec] mb-2">منطقة التوصيل أو الاستلام</div>
                <div className="space-y-2">
                  {zoneOptions.length === 0 ? (
                    <div className="rounded-xl border border-[#b86157]/40 bg-[#1a1111] p-3 text-xs leading-6 text-[#e6b4aa]">
                      لا توجد حالياً منطقة توصيل أو نقطة استلام معتمدة. يمكنك مواصلة معاينة الوجبات، لكن تأكيد الطلب متوقف حتى اعتماد نطاق الخدمة.
                    </div>
                  ) : zoneOptions.map((z) => {
                    const active = selectedZone.id === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onUpdate((prev) => ({ ...prev, zoneId: z.id }))}
                        className={`touch-press w-full text-right p-3 rounded-xl border cursor-pointer ${
                          active
                            ? 'bg-[#1c1a15] border-[#c8a96e]'
                            : 'bg-[#18181c] border-[#232329] hover:border-[#c8a96e]/40'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-[#f3f1ec]">{z.title}</span>
                          <span className="text-[#c8a96e] tabular-nums">
                            {z.fee === 0 ? 'مجاني' : `${z.fee} دج`}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#96938a] mt-0.5">
                          {z.areas} · {z.hours}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#96938a] mb-1.5">
                  ملاحظة للمطبخ (اختياري)
                </label>
                <input
                  type="text"
                  value={state.orderNote}
                  onChange={(e) =>
                    onUpdate((prev) => ({ ...prev, orderNote: e.target.value }))
                  }
                  placeholder="مثال: قليل الملح، بدون بصل..."
                  className="w-full bg-[#18181c] border border-[#232329] rounded-xl px-3 py-2.5 text-xs text-[#f3f1ec] focus:border-[#c8a96e] outline-none"
                />
              </div>

              <div className="pt-3 border-t border-[#232329] space-y-2 text-xs">
                <div className="text-sm font-bold text-[#f3f1ec] mb-1">تفصيل السعر بشفافية</div>
                <div className="flex justify-between text-[#96938a]">
                  <span>مكونات بسعر السوق</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.ing} دج</span>
                </div>
                <div className="flex justify-between text-[#96938a]">
                  <span>مناولة معلنة ({pricingCfg.handlingPct}%)</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.handling} دج</span>
                </div>
                <div className="flex justify-between text-[#96938a]">
                  <span>
                    أجر الخدمة ({pricingCfg.serviceFeePerMeal} دج × {state.n} وجبات)
                  </span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">{pricing.service} دج</span>
                </div>
                <div className="flex justify-between text-[#96938a]">
                  <span>التوصيل ({selectedZone.title})</span>
                  <span className="font-bold text-[#f3f1ec] tabular-nums">
                    {pricing.delivery === 0 ? 'مجاني' : `${pricing.delivery} دج`}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2.5 border-t border-[#232329]">
                  <span className="text-sm font-bold text-[#f3f1ec]">الإجمالي</span>
                  <span className="text-xl font-bold text-[#e6d1a3] tabular-nums">
                    {pricing.total} دج
                  </span>
                </div>
              </div>

              <div className="bg-[#18181c] border border-[#232329] rounded-xl p-3 text-xs text-[#c8a96e] font-medium">
                ربحنا هو أجر الخدمة فقط. الطعام بسعر السوق.
              </div>

              <div className="text-[11px] text-[#96938a]">
                <span className="text-[#c89a56]">
                  {apiEnabled ? 'موعد التسليم المتوقع:' : 'موعد تجريبي غير محجوز:'}
                </span>{' '}
                {formatArabicDate(dlv.date)}
                {dlv.closedToday && ` (تم تجاوز ${cutoffLabel}، يُرحّل للغد التالي)`}
              </div>

              <button
                type="button"
                onClick={() => void handlePlaceOrder()}
                disabled={activeZones.length === 0 || submitting}
                className="touch-press w-full py-3.5 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] hover:brightness-105 cursor-pointer"
              >
                {submitting ? 'جارٍ إرسال الطلب...' : `تأكيد الطلب (${pricing.total} دج)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Orders History */}
      <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#f3f1ec]">طلباتي</h2>
        {state.ord.length === 0 ? (
          <div className="text-xs text-[#66645e]">لا توجد طلبات مسجّلة بعد.</div>
        ) : (
          <div className="space-y-2">
            {[...state.ord].reverse().map((o) => (
              <div
                key={o.id}
                className="bg-[#18181c] border border-[#232329] rounded-xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#f3f1ec]">
                    {formatArabicDate(o.date)} · <span className="text-[#96938a] tabular-nums">{o.id}</span>
                  </div>
                  <div className="text-[11px] text-[#96938a] tabular-nums mt-0.5">
                    {o.n} وجبات · {o.zoneTitle} · {o.kcal} kcal ·{' '}
                    <b className="text-[#e6d1a3]">{o.total} دج</b>
                  </div>
                  <div
                    className={`text-[11px] font-bold mt-1 flex flex-wrap items-center gap-2 ${
                      o.status === 'C'
                        ? 'text-[#6b9c7e]'
                        : o.status === 'W'
                          ? 'text-[#c89a56]'
                          : 'text-[#b86157]'
                    }`}
                  >
                    <span>
                      {o.status === 'C'
                        ? apiEnabled ? 'مؤكد لدى NutriFit' : 'مؤكد في سجل المعاينة المحلي'
                        : o.status === 'W'
                          ? apiEnabled ? 'قائمة انتظار · بانتظار اعتماد السعة' : 'قائمة انتظار تجريبية'
                          : 'ملغى'}
                    </span>
                    {o.status === 'C' && o.productionStage && (
                      <>
                        <span className="text-[#66645e]" aria-hidden="true">·</span>
                        <span className="text-[#e6d1a3] text-[11px]">
                          {STAGE_LABELS[o.productionStage] ?? o.productionStage}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                {o.status !== 'X' && (!o.productionStage || o.productionStage === 'queued') && (
                  <button
                    type="button"
                    onClick={() => void cancelOrder(o)}
                    className="touch-press px-3 py-1.5 rounded-lg border border-[#3d2321] bg-[#1a1111] text-xs font-bold text-[#b86157] cursor-pointer"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-md bg-[#111114] border border-[#c8a96e]/50 rounded-2xl p-6 text-center space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center">
              {confirmModal.status === 'C' ? (
                <CheckCircle2 className="w-11 h-11 text-[#6b9c7e]" />
              ) : (
                <Clock className="w-11 h-11 text-[#c89a56]" />
              )}
            </div>
            <h3 className="text-lg font-bold text-[#f3f1ec]">
              {apiEnabled
                ? confirmModal.status === 'C' ? 'تم تسجيل طلبك بنجاح' : 'تم تسجيل طلبك في قائمة الانتظار'
                : confirmModal.status === 'C' ? 'تم حفظ طلب المعاينة' : 'تم حفظ طلب المعاينة في قائمة الانتظار'}
            </h3>
            <p className="text-xs text-[#96938a] leading-relaxed">
              {apiEnabled
                ? confirmModal.status === 'C'
                  ? 'تم تسجيل الطلب في قاعدة بيانات الخدمة. سيظهر لفريق التشغيل وفق السعة المعتمدة، وتبقى حالة الدفع نقداً عند الاستلام.'
                  : 'سُجل الطلب في قائمة الانتظار على الخادم. لا يبدأ التحضير إلا بعد تأكيد الإدارة توفر السعة.'
                : confirmModal.status === 'C'
                  ? 'هذا سجل معاينة محفوظ على هذا الجهاز فقط؛ لم يُرسل إلى المطبخ ولم يُنشأ توصيل فعلي.'
                  : 'هذه محاكاة محلية لقائمة الانتظار؛ لا توجد خدمة إرسال أو إشعارات للمطبخ.'}
            </p>
            <div className="bg-[#18181c] border border-[#232329] rounded-xl p-3 text-xs flex justify-between tabular-nums">
              <span className="text-[#96938a]">رقم الطلب: {confirmModal.id}</span>
              <span className="text-[#e6d1a3] font-bold">{confirmModal.total} دج</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmModal(null);
                onNavigate('home');
              }}
              className="touch-press w-full py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
            >
              العودة إلى شاشة اليوم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
