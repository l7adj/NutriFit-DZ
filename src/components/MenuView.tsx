import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DEFAULT_MEAL_NAMES } from '../data/seed';
import { AppState, AppTab, CartItem, FoodItem } from '../types';
import { CATEGORY_LABELS, getDishImage, getFoodImage } from '../utils/media';
import {
  calcCartTotals,
  calcGaps,
  calcNutrition,
  cartItemMacros,
  clamp,
  foodMacros,
  formatAllergenList,
  getBlockedAllergensForFood,
  getDominantMacro,
  getFoodGramDefaults,
  getMealSlotName,
  round0,
  round1,
  round2,
} from '../utils/nutrition';
import {
  Check,
  Layers,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';

interface MenuViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (msg: string) => void;
  onCartPulse?: () => void;
  pickerRequest?: { slot: number; seq: number } | null;
}

type CategoryFilter = 'all' | 'protein' | 'carb' | 'fat' | 'veg' | 'juice';
type PortionMode = 'standalone' | 'mix';

interface FlyingToken {
  id: number;
  image: string;
  label: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const BASIS_LABELS: Record<string, string> = {
  raw: 'نيء',
  cooked: 'مطبوخ',
  as_sold: 'كما يباع',
  unspecified: 'حالة وزن غير محددة',
};

export const MenuView: React.FC<MenuViewProps> = ({
  state,
  onUpdate,
  onNavigate,
  onToast,
  onCartPulse,
  pickerRequest,
}) => {
  const [activeSlot, setActiveSlot] = useState<number>(() =>
    clamp(pickerRequest ? pickerRequest.slot : state.activeSlot ?? 0, 0, Math.max(0, state.n - 1))
  );
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [selectedFoodId, setSelectedFoodId] = useState<string | null>(null);
  const [grams, setGrams] = useState<number>(150);
  const [portionMode, setPortionMode] = useState<PortionMode>('standalone');
  const [mixTargetUid, setMixTargetUid] = useState<string>('new');
  const [customPlateName, setCustomPlateName] = useState<string>('');
  const [flyingTokens, setFlyingTokens] = useState<FlyingToken[]>([]);
  const drawerImageRef = useRef<HTMLImageElement | null>(null);
  const cardImgRefs = useRef<Record<string, HTMLImageElement | null>>({});

  useEffect(() => {
    if (pickerRequest) {
      const safeSlot = clamp(pickerRequest.slot, 0, Math.max(0, state.n - 1));
      setActiveSlot(safeSlot);
      setCategory('all');
      setSearch('');
      setSelectedFoodId(null);
      setInspectedId(null);
    }
  }, [pickerRequest, state.n]);

  const safeSlot = clamp(activeSlot, 0, Math.max(0, state.n - 1));
  const res = calcNutrition(state);
  const gaps = calcGaps(state);
  const cartTotals = calcCartTotals(state);

  const slotSummaries = useMemo(() => {
    return Array.from({ length: state.n }, (_, idx) => {
      const items = state.meals.filter((m) => clamp(m.slot || 0, 0, state.n - 1) === idx);
      const totals = items.reduce(
        (acc, m) => {
          const mac = cartItemMacros(m, state.foods, state.dishes);
          acc.kcal += mac.kcal;
          acc.p += mac.p;
          acc.c += mac.c;
          acc.f += mac.f;
          acc.price += mac.price;
          acc.grams += mac.grams;
          return acc;
        },
        { kcal: 0, p: 0, c: 0, f: 0, price: 0, grams: 0 }
      );
      return { idx, items, totals };
    });
  }, [state.meals, state.n, state.foods, state.dishes]);

  const activeMeal = slotSummaries[safeSlot] || {
    idx: safeSlot,
    items: [],
    totals: { kcal: 0, p: 0, c: 0, f: 0, price: 0, grams: 0 },
  };

  // Items in the active meal slot eligible for mixing (standalone foods or existing custom mixed plates)
  const mixableSlotItems = useMemo(
    () => activeMeal.items.filter((m) => m.kind === 'food' || m.kind === 'custom'),
    [activeMeal.items]
  );

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.foods.filter((f) => {
      if (category === 'all') {
        if (f.cat === 'juice') return false;
      } else if (f.cat !== category) {
        return false;
      }
      if (!q) return true;
      return (
        f.name.toLowerCase().includes(q) ||
        (f.nameFr?.toLowerCase().includes(q) ?? false) ||
        (f.nameEn?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [state.foods, category, search]);

  const juiceCount = useMemo(
    () => state.foods.filter((f) => f.cat === 'juice').length,
    [state.foods]
  );

  if (res.err) {
    return (
      <div className="bg-[#1b1212] border border-[#b86157]/45 rounded-2xl p-4 text-sm text-[#f3f1ec]">
        {res.err}
      </div>
    );
  }

  const getCartTargetRect = (): DOMRect | null => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('[data-cart-target="true"]'));
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }
    return null;
  };

  const launchFlyToCart = (food: FoodItem, sourceEl?: HTMLElement | null) => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const targetRect = getCartTargetRect();
    const srcEl = sourceEl || drawerImageRef.current || cardImgRefs.current[food.id];
    const sourceRect = srcEl?.getBoundingClientRect();

    if (reduced || !targetRect || !sourceRect) {
      onCartPulse?.();
      return;
    }

    const tokenId = Date.now() + Math.random();
    const token: FlyingToken = {
      id: tokenId,
      image: getFoodImage(food),
      label: food.name,
      startX: sourceRect.left + sourceRect.width / 2 - 28,
      startY: sourceRect.top + sourceRect.height / 2 - 28,
      endX: targetRect.left + targetRect.width / 2 - 28,
      endY: targetRect.top + targetRect.height / 2 - 28,
    };

    setFlyingTokens((prev) => [...prev, token]);
    window.setTimeout(() => {
      onCartPulse?.();
    }, 390);
    window.setTimeout(() => {
      setFlyingTokens((prev) => prev.filter((t) => t.id !== tokenId));
    }, 620);
  };

  const openFoodConfigurator = (food: FoodItem) => {
    const blocked = getBlockedAllergensForFood(food, state.al);
    if (food.available === false) {
      onToast('هذا الصنف غير متوفر في قائمة اليوم');
      return;
    }
    if (blocked.length > 0) {
      onToast(`محجوب بسبب الحساسية: ${formatAllergenList(blocked)}`);
      return;
    }
    const defaults = getFoodGramDefaults(food);
    setSelectedFoodId(food.id);
    setGrams(defaults.def);
    setPortionMode('standalone');
    const existingCustom = mixableSlotItems.find((m) => m.kind === 'custom');
    setMixTargetUid(existingCustom ? existingCustom.uid : mixableSlotItems[0]?.uid || 'new');
    setCustomPlateName('');
  };

  const handleCardTouchOrClick = (food: FoodItem) => {
    const isCoarsePointer = window.matchMedia?.('(hover: none)').matches;
    if (isCoarsePointer && inspectedId !== food.id) {
      setInspectedId(food.id);
      return;
    }
    openFoodConfigurator(food);
  };

  const formatItemTitle = (m: CartItem): string => {
    if (m.kind === 'food') {
      return state.foods.find((x) => x.id === m.id)?.name || 'مكوّن';
    }
    if (m.kind === 'dish') {
      return state.dishes.find((x) => x.id === m.id)?.name || 'طبق';
    }
    return m.name || 'طبق مخصص';
  };

  const buildMixedTitle = (ingredients: [string, number][], explicitName?: string) => {
    if (explicitName && explicitName.trim().length >= 2) return explicitName.trim();
    const names = ingredients
      .map(([fid]) => state.foods.find((f) => f.id === fid)?.name)
      .filter((v): v is string => Boolean(v));
    if (names.length === 0) return 'طبق مخصص';
    if (names.length <= 2) return `طبق مخصص: ${names.join(' + ')}`;
    return `طبق مخصص: ${names[0]} + ${names[1]} (+${names.length - 2})`;
  };

  const commitFoodToMeal = (food: FoodItem, sourceButtonEl?: HTMLElement | null) => {
    if (grams <= 0) return;
    const unit = food.cat === 'juice' ? 'مل' : 'غ';
    const roundedGrams = Math.max(1, Math.round(grams));

    launchFlyToCart(food, drawerImageRef.current || sourceButtonEl);

    if (portionMode === 'standalone') {
      const item: CartItem = {
        uid: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind: 'food',
        id: food.id,
        grams: roundedGrams,
        slot: safeSlot,
      };
      onUpdate((prev) => ({
        ...prev,
        activeSlot: safeSlot,
        meals: [...prev.meals, item],
      }));
      setSelectedFoodId(null);
      setInspectedId(null);
      onToast(`أُضيف ${food.name} (${roundedGrams}${unit}) مستقلاً إلى ${getMealSlotName(state, safeSlot)}`);
      return;
    }

    // Mix mode: either start a new custom plate or merge into an existing standalone food / custom plate
    onUpdate((prev) => {
      const targetItem =
        mixTargetUid !== 'new'
          ? prev.meals.find((m) => m.uid === mixTargetUid && clamp(m.slot || 0, 0, prev.n - 1) === safeSlot)
          : undefined;

      if (!targetItem) {
        const ing: [string, number][] = [[food.id, roundedGrams]];
        const newCustom: CartItem = {
          uid: `mix_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          kind: 'custom',
          id: 'custom_mix',
          name: buildMixedTitle(ing, customPlateName),
          ing,
          slot: safeSlot,
        };
        return {
          ...prev,
          activeSlot: safeSlot,
          meals: [...prev.meals, newCustom],
        };
      }

      const baseIngredients: [string, number][] =
        targetItem.kind === 'food'
          ? [[targetItem.id, Math.max(1, Math.round(targetItem.grams || 100))]]
          : [...(targetItem.ing || [])];

      const existingIdx = baseIngredients.findIndex(([fid]) => fid === food.id);
      if (existingIdx >= 0) {
        baseIngredients[existingIdx] = [
          food.id,
          baseIngredients[existingIdx][1] + roundedGrams,
        ];
      } else {
        baseIngredients.push([food.id, roundedGrams]);
      }

      const nextName =
        customPlateName.trim().length >= 2
          ? customPlateName.trim()
          : buildMixedTitle(baseIngredients);

      const updatedItem: CartItem = {
        uid: targetItem.uid,
        kind: 'custom',
        id: targetItem.kind === 'custom' ? targetItem.id : 'custom_mix',
        name: nextName,
        ing: baseIngredients,
        slot: safeSlot,
      };

      return {
        ...prev,
        activeSlot: safeSlot,
        meals: prev.meals.map((m) => (m.uid === targetItem.uid ? updatedItem : m)),
      };
    });

    setSelectedFoodId(null);
    setInspectedId(null);
    onToast(`تم خلط ${food.name} (${roundedGrams}${unit}) في طبق مخصص داخل ${getMealSlotName(state, safeSlot)}`);
  };

  const updateCartItemGrams = (uid: string, nextGrams: number) => {
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.map((m) =>
        m.uid === uid ? { ...m, grams: Math.max(5, nextGrams) } : m
      ),
    }));
  };

  const removeCartItem = (uid: string) => {
    onUpdate((prev) => ({
      ...prev,
      meals: prev.meals.filter((m) => m.uid !== uid),
    }));
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

  const formatProvenanceShort = (f: FoodItem) => {
    const status = f.nutritionDataStatus === 'verified' ? 'موثق' : 'غير موثق';
    const basis = BASIS_LABELS[f.nutritionBasis || 'unspecified'] || 'غير محدد';
    return `${status} · ${basis}`;
  };

  const selectedFood = selectedFoodId
    ? state.foods.find((f) => f.id === selectedFoodId) || null
    : null;

  const hasUnverifiedFoods = state.foods.some((f) => f.nutritionDataStatus !== 'verified');

  return (
    <div className="space-y-6">
      {/* Flying Parabolic Tokens Layer */}
      <AnimatePresence>
        {flyingTokens.map((token) => {
          const dx = token.endX - token.startX;
          const dy = token.endY - token.startY;
          const arcPeakY = Math.min(0, dy) - 70;
          return (
            <motion.div
              key={token.id}
              style={{
                position: 'fixed',
                left: token.startX,
                top: token.startY,
                width: 56,
                height: 56,
                zIndex: 80,
                pointerEvents: 'none',
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: [0, dx * 0.5, dx],
                y: [0, arcPeakY, dy],
                scale: [1, 1.08, 0.35],
                opacity: [1, 0.95, 0.15],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-xl overflow-hidden border border-[#c8a96e] shadow-[0_8px_30px_rgba(200,169,110,0.45)] bg-[#111114]"
            >
              <img
                src={token.image}
                alt={token.label}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Quiet Provenance Line (no nested boxes) */}
      {hasUnverifiedFoods && (
        <div
          className="border-b border-[#232329] pb-3 text-[11px] leading-6 text-[#96938a]"
          role="note"
        >
          <span className="text-[#c8a96e] font-semibold">ملاحظة الدقة العلمية:</span>{' '}
          الأسعار الظاهرة على البطاقات هي لكل <strong className="text-[#f3f1ec]">100 غ / 100 مل</strong> فقط. الأصناف الموسومة بـ «غير موثق» لم تُربط بعد بسجل مخبري معتمد وتُعرض للمعاينة الأولية.
        </div>
      )}

      {/* Header + Meal Slot Selector */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium text-[#c8a96e]">
              تشكيلة المكونات الدقيقة · تسعير لكل 100 غرام
            </div>
            <h1 className="text-2xl font-bold text-[#f3f1ec] mt-0.5 text-balance">
              اختيار وتكوين الوجبات
            </h1>
          </div>

          {state.n < 5 && (
            <button
              type="button"
              onClick={() => {
                const nextN = state.n + 1;
                onUpdate((prev) => ({ ...prev, n: nextN, activeSlot: nextN - 1 }));
                setActiveSlot(nextN - 1);
                onToast(`تمت إضافة ${getMealSlotName(state, nextN - 1)}`);
              }}
              className="touch-press min-h-[40px] px-4 py-2 rounded-xl bg-[#111114] border border-[#232329] hover:border-[#c8a96e]/50 text-xs font-bold text-[#e6d1a3] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#c8a96e]" />
              <span>إضافة وجبة أخرى</span>
            </button>
          )}
        </div>

        {/* Distinct Meal Slot Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {slotSummaries.map((slot) => {
            const active = slot.idx === safeSlot;
            return (
              <button
                key={slot.idx}
                type="button"
                onClick={() => {
                  setActiveSlot(slot.idx);
                  onUpdate((prev) => ({ ...prev, activeSlot: slot.idx }));
                }}
                className={`touch-press min-h-[44px] px-4 py-2 rounded-xl border text-right shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#18181c] border-[#c8a96e] text-[#f3f1ec]'
                    : 'bg-[#111114] border-[#232329] text-[#96938a] hover:border-[#34343c]'
                }`}
              >
                <div className="text-xs font-bold whitespace-nowrap">
                  0{slot.idx + 1}. {getMealSlotName(state, slot.idx)}
                </div>
                <div className="text-[10px] tabular-nums mt-0.5 text-[#96938a]">
                  {slot.items.length === 0
                    ? 'فارغة'
                    : `${round0(slot.totals.kcal)} kcal · P${round0(slot.totals.p)}غ · ${round0(slot.totals.price)} دج`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Meal Tray Summary (Clean architectural strip) */}
        <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#232329]">
            <div className="min-w-0 flex-1">
              <input
                type="text"
                value={getMealSlotName(state, safeSlot)}
                onChange={(e) => updateMealName(safeSlot, e.target.value)}
                className="w-full bg-transparent text-base font-bold text-[#e6d1a3] focus:outline-none focus:border-b focus:border-[#c8a96e]"
                aria-label={`تعديل اسم ${getMealSlotName(state, safeSlot)}`}
              />
              <div className="text-xs text-[#96938a] tabular-nums mt-1">
                إجمالي هذه الوجبة:{' '}
                <span className="text-[#f3f1ec] font-semibold">{round0(activeMeal.totals.kcal)} kcal</span>
                <span className="mx-1.5 text-[#3b3b42]">·</span>
                <span>P {round0(activeMeal.totals.p)}غ</span>
                <span className="mx-1.5 text-[#3b3b42]">·</span>
                <span>C {round0(activeMeal.totals.c)}غ</span>
                <span className="mx-1.5 text-[#3b3b42]">·</span>
                <span>F {round0(activeMeal.totals.f)}غ</span>
                {activeMeal.totals.price > 0 && (
                  <>
                    <span className="mx-1.5 text-[#3b3b42]">·</span>
                    <span className="text-[#c8a96e] font-bold">{round0(activeMeal.totals.price)} دج</span>
                  </>
                )}
              </div>
            </div>

            {state.n > 1 && activeMeal.items.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  const target = safeSlot;
                  setActiveSlot(Math.max(0, target - 1));
                  onUpdate((prev) => ({
                    ...prev,
                    n: Math.max(1, prev.n - 1),
                    activeSlot: Math.max(0, target - 1),
                    meals: prev.meals.map((m) => ({
                      ...m,
                      slot:
                        m.slot > target
                          ? m.slot - 1
                          : Math.min(m.slot, Math.max(0, prev.n - 2)),
                    })),
                  }));
                }}
                className="min-h-[40px] px-3 text-xs text-[#96938a] hover:text-[#b86157] cursor-pointer"
              >
                حذف الوجبة
              </button>
            )}
          </div>

          {activeMeal.items.length === 0 ? (
            <div className="text-xs text-[#96938a] py-1">
              هذه الوجبة فارغة. مرّر أو المس أي صنف بالأسفل لكشف القيم الغذائية لكل 100غ، ثم حدّد الكمية لوحده أو مخلوطًا داخل طبق مخصص.
            </div>
          ) : (
            <div className="divide-y divide-[#232329]">
              {activeMeal.items.map((m) => {
                const mac = cartItemMacros(m, state.foods, state.dishes);
                const foodObj = m.kind === 'food' ? state.foods.find((x) => x.id === m.id) || null : null;
                const dishObj = m.kind === 'dish' ? state.dishes.find((x) => x.id === m.id) || null : null;
                const img =
                  m.kind === 'food'
                    ? getFoodImage(foodObj)
                    : m.kind === 'dish'
                      ? getDishImage(dishObj, state.foods)
                      : getFoodImage(state.foods.find((f) => f.id === m.ing?.[0]?.[0]));
                const unit = foodObj?.cat === 'juice' ? 'مل' : 'غ';
                const step = foodObj ? getFoodGramDefaults(foodObj).step : 10;

                return (
                  <div key={m.uid} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img
                        src={img}
                        alt={formatItemTitle(m)}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover border border-[#232329] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#f3f1ec] truncate flex items-center gap-1.5">
                          <span>{formatItemTitle(m)}</span>
                          {m.kind === 'custom' && (
                            <span className="text-[10px] font-medium text-[#c8a96e]">· طبق مخلوط</span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#96938a] tabular-nums truncate">
                          {round0(mac.kcal)} kcal · P{round0(mac.p)} C{round0(mac.c)} F{round0(mac.f)} ·{' '}
                          <span className="text-[#c8a96e]">{round0(mac.price)} دج</span>
                        </div>
                        {m.kind === 'custom' && m.ing && m.ing.length > 0 && (
                          <div className="text-[10px] text-[#66645e] truncate mt-0.5 tabular-nums">
                            {m.ing
                              .map(([fid, g]) => {
                                const fn = state.foods.find((f) => f.id === fid)?.name || fid;
                                return `${fn} ${round0(g)}غ`;
                              })
                              .join(' + ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {m.kind === 'food' ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartItemGrams(m.uid, Math.max(step, (m.grams || 0) - step))}
                          className="touch-press w-9 h-9 rounded-lg bg-[#18181c] border border-[#232329] flex items-center justify-center text-[#c8a96e] cursor-pointer"
                          aria-label="إنقاص الكمية"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-12 text-center font-bold text-[#f3f1ec] tabular-nums">
                          {round0(m.grams || 0)}{unit}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartItemGrams(m.uid, (m.grams || 0) + step)}
                          className="touch-press w-9 h-9 rounded-lg bg-[#18181c] border border-[#232329] flex items-center justify-center text-[#c8a96e] cursor-pointer"
                          aria-label="زيادة الكمية"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#96938a] tabular-nums shrink-0">
                        {round0(mac.grams)}غ
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => removeCartItem(m.uid)}
                      className="touch-press min-w-[36px] min-h-[36px] flex items-center justify-center text-[#96938a] hover:text-[#b86157] cursor-pointer shrink-0"
                      aria-label="إزالة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SEARCH + CLEAN CATEGORY SEGMENTED BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex gap-1 p-1 bg-[#111114] border border-[#232329] rounded-xl overflow-x-auto no-scrollbar">
          {(
            [
              ['all', 'الكل'],
              ['protein', 'بروتين'],
              ['carb', 'كاربوهيدرات'],
              ['fat', 'دهون صحية'],
              ['veg', 'خضر'],
              ['juice', `عصائر (${juiceCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={`touch-press min-h-[38px] px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                category === id
                  ? 'bg-[#1f1d18] text-[#e6d1a3] border border-[#c8a96e]/40'
                  : 'text-[#96938a] hover:text-[#f3f1ec] border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#66645e] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المكونات..."
            className="w-full min-h-[42px] bg-[#111114] border border-[#232329] focus:border-[#c8a96e]/60 rounded-xl pr-10 pl-3 py-2 text-xs text-[#f3f1ec] placeholder:text-[#66645e] focus:outline-none"
          />
        </div>
      </div>

      {/* LUXURY PER-100G CARDS GRID WITH FROSTED BLUR REVEAL */}
      {filteredFoods.length === 0 ? (
        <div className="bg-[#111114] border border-[#232329] rounded-2xl p-10 text-center text-xs text-[#96938a]">
          لا توجد مكونات مطابقة لبحثك في هذا التصنيف.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFoods.map((f) => {
            const blocked = getBlockedAllergensForFood(f, state.al);
            const isBlocked = blocked.length > 0;
            const isUnavailable = f.available === false;
            const isJuice = f.cat === 'juice';
            const unit = isJuice ? '100 مل' : '100 غ';
            const imgUrl = getFoodImage(f);
            const isInspected = inspectedId === f.id;
            const dom = getDominantMacro(f);

            return (
              <article
                key={f.id}
                onMouseLeave={() => {
                  if (inspectedId === f.id) setInspectedId(null);
                }}
                className={`group relative bg-[#111114] border border-[#232329] hover:border-[#c8a96e]/55 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col ${
                  isBlocked || isUnavailable ? 'opacity-50' : ''
                }`}
              >
                {/* Media Viewport with Hover/Touch Frosted Blur Nutrition Overlay */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleCardTouchOrClick(f)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openFoodConfigurator(f);
                    }
                  }}
                  aria-label={`${f.name} — ${round1(f.price)} دج لكل ${unit}`}
                  className="relative aspect-[4/3] w-full overflow-hidden bg-[#18181c] cursor-pointer text-right focus:outline-none"
                >
                  <img
                    ref={(el) => {
                      cardImgRefs.current[f.id] = el;
                    }}
                    src={imgUrl}
                    alt={f.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] ${
                      isInspected ? 'scale-[1.04]' : ''
                    }`}
                  />

                  {/* Subtle resting bottom gradient scrim (keeps resting view clean & photographic) */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-[#09090b]/85 via-[#09090b]/15 to-transparent transition-opacity duration-200 ${
                      isInspected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                    }`}
                  />

                  {/* Resting subtle tap/hover cue on bottom-left */}
                  <div
                    className={`absolute bottom-3 left-3 text-[10px] font-medium text-[#e6d1a3]/90 transition-opacity duration-200 ${
                      isInspected ? 'opacity-0' : 'opacity-85 group-hover:opacity-0'
                    }`}
                  >
                    المس لكشف القيم / 100{isJuice ? 'مل' : 'غ'}
                  </div>

                  {/* Frosted Blur Inspection Overlay (Hover on desktop OR Tap on touch) */}
                  <div
                    className={`absolute inset-0 backdrop-blur-md bg-[#09090b]/82 p-4 flex flex-col justify-between transition-all duration-200 ease-out ${
                      isInspected
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-[11px] border-b border-[#2a2a31] pb-2">
                        <span className="font-bold text-[#e6d1a3]">القيمة لكل {unit}</span>
                        <span className="text-[#96938a] truncate">
                          {formatProvenanceShort(f)}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 text-center tabular-nums">
                        <div className="bg-[#18181c]/90 border border-[#28282f] rounded-lg py-1.5 px-1">
                          <div className="text-xs font-bold text-[#f3f1ec]">{round0(f.per100.kcal)}</div>
                          <div className="text-[10px] text-[#96938a]">kcal</div>
                        </div>
                        <div className="bg-[#18181c]/90 border border-[#28282f] rounded-lg py-1.5 px-1">
                          <div className="text-xs font-bold text-[#e6d1a3]">{round1(f.per100.p)}غ</div>
                          <div className="text-[10px] text-[#96938a]">بروتين</div>
                        </div>
                        <div className="bg-[#18181c]/90 border border-[#28282f] rounded-lg py-1.5 px-1">
                          <div className="text-xs font-bold text-[#f3f1ec]">{round1(f.per100.c)}غ</div>
                          <div className="text-[10px] text-[#96938a]">كارب</div>
                        </div>
                        <div className="bg-[#18181c]/90 border border-[#28282f] rounded-lg py-1.5 px-1">
                          <div className="text-xs font-bold text-[#f3f1ec]">{round1(f.per100.f)}غ</div>
                          <div className="text-[10px] text-[#96938a]">دهون</div>
                        </div>
                      </div>

                      <div className="text-[10px] text-[#96938a] flex items-center justify-between tabular-nums">
                        <span>ألياف: {round1(f.per100.fiber)}غ</span>
                        <span className="truncate max-w-[65%]">
                          {f.nutritionSource && f.nutritionSource !== 'TODO_VERIFY'
                            ? f.nutritionSource
                            : 'بانتظار اعتماد المصدر'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openFoodConfigurator(f);
                      }}
                      disabled={isBlocked || isUnavailable}
                      className="touch-press w-full min-h-[42px] py-2 px-4 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] disabled:opacity-40 cursor-pointer"
                    >
                      {isUnavailable
                        ? 'غير متوفر اليوم'
                        : isBlocked
                          ? `محجوب: ${formatAllergenList(blocked)}`
                          : 'تحديد الكمية والدمج'}
                    </button>
                  </div>
                </div>

                {/* Resting Card Footer: Clean Name + Strict Per-100g Price Only */}
                <div className="p-4 flex items-center justify-between gap-3 flex-1">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#96938a] truncate">
                      {CATEGORY_LABELS[f.cat]}
                      <span className="mx-1.5 text-[#3b3b42]">·</span>
                      <span className={f.nutritionDataStatus === 'verified' ? 'text-[#6b9c7e]' : 'text-[#c89a56]'}>
                        {formatProvenanceShort(f)}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#f3f1ec] truncate mt-0.5">
                      {f.name}
                    </h3>
                  </div>

                  <div className="text-left shrink-0 tabular-nums">
                    <div className="text-sm sm:text-base font-bold text-[#e6d1a3]">
                      {round1(f.price)} دج
                    </div>
                    <div className="text-[10px] text-[#96938a]">لكل {unit}</div>
                  </div>
                </div>

                {/* Subtle bottom macro indicator hairline */}
                <div
                  className="h-[2px] w-full opacity-55"
                  style={{ backgroundColor: dom.key === 'P' ? '#c8a96e' : dom.key === 'C' ? '#6b9c7e' : '#a98c72' }}
                />
              </article>
            );
          })}
        </div>
      )}

      {/* SUMMARY BAR TO CART */}
      {state.meals.length > 0 && (
        <div className="bg-[#111114] border border-[#c8a96e]/45 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5 tabular-nums">
            <div className="text-sm font-bold text-[#f3f1ec]">
              إجمالي المخطّط اليومي:{' '}
              <span className="text-[#e6d1a3]">{round0(cartTotals.kcal)} kcal</span>
              <span className="mx-1.5 text-[#3b3b42]">·</span>
              <span className="text-[#c8a96e]">{round0(cartTotals.price)} دج (مكونات)</span>
            </div>
            <div className="text-xs text-[#96938a]">
              المتبقي من الهدف: {round0(gaps.kcal)} kcal · P{round0(gaps.P)}غ · C{round0(gaps.C)}غ · F{round0(gaps.F)}غ
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('cart')}
            className="touch-press min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>مراجعة السلة وتأكيد الطلب</span>
          </button>
        </div>
      )}

      {/* PRECISION QUANTITY & STANDALONE-OR-MIX SLIDE-OVER CONFIGURATOR */}
      <AnimatePresence>
        {selectedFood && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-[#202722]/45 backdrop-blur-sm flex items-end sm:items-center sm:justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFoodId(null);
            }}
          >
            <motion.aside
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              aria-label="تخصيص الكمية والخلط"
              className="w-full max-w-lg h-[94dvh] sm:h-full sm:max-h-full rounded-t-[28px] sm:rounded-none bg-[#fffefb] border border-[#e3dfd4] sm:border-y-0 sm:border-l-0 flex flex-col shadow-2xl overflow-hidden"
            >
              {(() => {
                const isJuice = selectedFood.cat === 'juice';
                const unit = isJuice ? 'مل' : 'غ';
                const gramCfg = getFoodGramDefaults(selectedFood);
                const dom = getDominantMacro(selectedFood);
                const mac = foodMacros(selectedFood, grams);
                const perUnitPrice = selectedFood.price / 100;

                let smartFill: { label: string; grams: number } | null = null;
                if (dom.key === 'P' && selectedFood.per100.p >= 3 && gaps.P > 2) {
                  const g = clamp(
                    Math.round(((gaps.P / selectedFood.per100.p) * 100) / gramCfg.step) *
                      gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `سد فجوة البروتين (${g}${unit})`, grams: g };
                } else if (dom.key === 'C' && selectedFood.per100.c >= 3 && gaps.C > 5) {
                  const g = clamp(
                    Math.round(((gaps.C / selectedFood.per100.c) * 100) / gramCfg.step) *
                      gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `سد فجوة الكارب (${g}${unit})`, grams: g };
                } else if (dom.key === 'F' && selectedFood.per100.f >= 3 && gaps.F > 2) {
                  const g = clamp(
                    Math.round(((gaps.F / selectedFood.per100.f) * 100) / gramCfg.step) *
                      gramCfg.step,
                    gramCfg.min,
                    gramCfg.max
                  );
                  smartFill = { label: `سد فجوة الدهون (${g}${unit})`, grams: g };
                }

                const remKcalAfter = Math.max(0, res.kcal - (cartTotals.kcal + mac.kcal));
                const remPAfter = Math.max(0, res.fp - (cartTotals.p + mac.p));
                const remCAfter = Math.max(0, res.C - (cartTotals.c + mac.c));
                const remFAfter = Math.max(0, res.F - (cartTotals.f + mac.f));

                return (
                  <>
                    {/* Drawer Header */}
                    <div className="p-4 sm:p-5 border-b border-[#e3dfd4] bg-[#fffefb] flex items-center justify-between gap-3 shrink-0">
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-[#c8a96e]">
                          0{safeSlot + 1}. {getMealSlotName(state, safeSlot)}
                        </div>
                        <h2 className="text-base sm:text-lg font-bold text-[#f3f1ec] truncate">
                          {selectedFood.name}
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedFoodId(null)}
                        className="touch-press min-h-[40px] min-w-[40px] rounded-xl bg-[#18181c] border border-[#232329] flex items-center justify-center text-[#96938a] hover:text-[#f3f1ec] cursor-pointer"
                        aria-label="إغلاق"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                      {/* Frosted Editorial Food Banner */}
                      <div className="relative h-40 rounded-2xl overflow-hidden border border-[#232329] bg-[#18181c]">
                        <img
                          ref={drawerImageRef}
                          src={getFoodImage(selectedFood)}
                          alt={selectedFood.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/55 to-transparent" />
                        <div className="absolute bottom-3 right-4 left-4 flex items-end justify-between gap-3">
                          <div>
                            <div className="text-[11px] text-[#c8a96e]">
                              {CATEGORY_LABELS[selectedFood.cat]} · {formatProvenanceShort(selectedFood)}
                            </div>
                            <div className="text-xs text-[#96938a] mt-0.5 tabular-nums">
                              لكل 100{unit}: {round0(selectedFood.per100.kcal)} kcal · P{round1(selectedFood.per100.p)} · C{round1(selectedFood.per100.c)} · F{round1(selectedFood.per100.f)}
                            </div>
                          </div>
                          <div className="text-left shrink-0 tabular-nums">
                            <div className="text-sm font-bold text-[#e6d1a3]">
                              {round1(selectedFood.price)} دج
                            </div>
                            <div className="text-[10px] text-[#96938a]">/ 100{unit}</div>
                          </div>
                        </div>
                      </div>

                      {selectedFood.nutritionDataStatus !== 'verified' && (
                        <div className="text-[11px] leading-5 text-[#c89a56] border-b border-[#232329] pb-3">
                          تنبيه علمي: القيم الغذائية لهذا الصنف في مرحلة المعاينة الأولية ولم تُعتمد بعد بسجل مخبري رسمي.
                        </div>
                      )}

                      {/* Live nutrition and price — pinned above quantity controls */}
                      <div className="sticky top-0 z-20 -mx-1 rounded-2xl border border-[#d9e1d8] bg-[#fffefb]/95 p-4 shadow-[0_8px_24px_rgba(32,39,34,0.08)] backdrop-blur-md space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#f3f1ec]">الأثر الغذائي والتكلفة</span>
                          <span className="text-sm font-bold text-[#e6d1a3] tabular-nums">
                            {round1(mac.price)} دج ({round2(perUnitPrice)}/{unit})
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center bg-[#18181c] rounded-xl py-2.5 px-1 tabular-nums text-xs">
                          <div>
                            <div className="font-bold text-[#e6d1a3]">+{round0(mac.kcal)}</div>
                            <div className="text-[10px] text-[#96938a]">سعرة</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#c8a96e]">+{round1(mac.p)}غ</div>
                            <div className="text-[10px] text-[#96938a]">بروتين</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#6b9c7e]">+{round1(mac.c)}غ</div>
                            <div className="text-[10px] text-[#96938a]">كارب</div>
                          </div>
                          <div>
                            <div className="font-bold text-[#a98c72]">+{round1(mac.f)}غ</div>
                            <div className="text-[10px] text-[#96938a]">دهون</div>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#96938a] tabular-nums flex items-center justify-between pt-1">
                          <span>المتبقي لليوم بعد الإضافة:</span>
                          <b className="text-[#f3f1ec]">
                            {round0(remKcalAfter)} kcal · P{round0(remPAfter)} C{round0(remCAfter)} F{round0(remFAfter)}
                          </b>
                        </div>
                      </div>


                      {/* 1. Precision Quantity Selector */}
                      <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#f3f1ec]">
                            1. تحديد الكمية ({unit})
                          </span>
                          {smartFill && (
                            <button
                              type="button"
                              onClick={() => setGrams(smartFill.grams)}
                              className="touch-press px-3 py-1.5 rounded-lg bg-[#1c1a15] border border-[#c8a96e]/45 text-[11px] font-bold text-[#e6d1a3] cursor-pointer tabular-nums"
                            >
                              {smartFill.label}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center bg-[#18181c] border border-[#232329] rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setGrams((g) => Math.max(0, g - gramCfg.step))}
                            className="touch-press w-14 h-12 text-xl font-bold text-[#c8a96e] hover:bg-[#232329] cursor-pointer"
                            aria-label="إنقاص"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={grams}
                            onChange={(e) => setGrams(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="flex-1 bg-transparent text-center text-2xl font-bold text-[#f3f1ec] tabular-nums focus:outline-none"
                            aria-label="الكمية"
                          />
                          <button
                            type="button"
                            onClick={() => setGrams((g) => g + gramCfg.step)}
                            className="touch-press w-14 h-12 text-xl font-bold text-[#c8a96e] hover:bg-[#232329] cursor-pointer"
                            aria-label="زيادة"
                          >
                            +
                          </button>
                        </div>

                        <div>
                          <input
                            type="range"
                            min={gramCfg.min}
                            max={gramCfg.max}
                            step={gramCfg.step}
                            value={clamp(grams, gramCfg.min, gramCfg.max)}
                            onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
                            className="w-full accent-[#c8a96e] cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-[#66645e] tabular-nums mt-1">
                            <span>{gramCfg.min}{unit}</span>
                            <span>{gramCfg.max}{unit}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {gramCfg.presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setGrams(preset)}
                              className={`touch-press min-h-[40px] py-1.5 rounded-lg border text-xs font-semibold tabular-nums cursor-pointer ${
                                grams === preset
                                  ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                                  : 'bg-[#18181c] border-[#232329] text-[#f3f1ec] hover:border-[#c8a96e]/40'
                              }`}
                            >
                              {preset}{unit}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Standalone vs. Mix With Another Food */}
                      <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 space-y-3">
                        <div className="text-xs font-bold text-[#f3f1ec] flex items-center gap-1.5">
                          <Layers className="w-4 h-4 text-[#c8a96e]" />
                          <span>2. طريقة الإضافة للوجبة</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setPortionMode('standalone')}
                            className={`touch-press min-h-[52px] p-3 rounded-xl border text-right cursor-pointer ${
                              portionMode === 'standalone'
                                ? 'bg-[#1c1a15] border-[#c8a96e] text-[#f3f1ec]'
                                : 'bg-[#18181c] border-[#232329] text-[#96938a]'
                            }`}
                          >
                            <div className="text-xs font-bold text-[#e6d1a3]">صنف مستقل لوحده</div>
                            <div className="text-[10px] mt-0.5">يُقدم منفردًا بالوزن المحدد</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPortionMode('mix')}
                            className={`touch-press min-h-[52px] p-3 rounded-xl border text-right cursor-pointer ${
                              portionMode === 'mix'
                                ? 'bg-[#1c1a15] border-[#c8a96e] text-[#f3f1ec]'
                                : 'bg-[#18181c] border-[#232329] text-[#96938a]'
                            }`}
                          >
                            <div className="text-xs font-bold text-[#e6d1a3]">خلط مع أكلة أخرى</div>
                            <div className="text-[10px] mt-0.5">دمج في طبق واحد مخصص</div>
                          </button>
                        </div>

                        {portionMode === 'mix' && (
                          <div className="space-y-2.5 pt-2 border-t border-[#232329]">
                            <label className="block text-[11px] text-[#96938a]">
                              اختر الطبق أو الصنف للخلط معه في «{getMealSlotName(state, safeSlot)}»
                              <select
                                value={mixTargetUid}
                                onChange={(e) => setMixTargetUid(e.target.value)}
                                className="mt-1.5 w-full min-h-[40px] rounded-xl border border-[#232329] bg-[#18181c] px-3 py-2 text-xs text-[#f3f1ec]"
                              >
                                <option value="new">بدء طبق مخصص جديد بهذه الإضافة</option>
                                {mixableSlotItems.map((item) => {
                                  const m = cartItemMacros(item, state.foods, state.dishes);
                                  return (
                                    <option key={item.uid} value={item.uid}>
                                      الخلط مع: {formatItemTitle(item)} ({round0(m.grams)}غ)
                                    </option>
                                  );
                                })}
                              </select>
                            </label>

                            <label className="block text-[11px] text-[#96938a]">
                              اسم الطبق المخلوط (اختياري)
                              <input
                                type="text"
                                value={customPlateName}
                                onChange={(e) => setCustomPlateName(e.target.value)}
                                placeholder="مثال: دجاج مشوي مع أرز بسمتي"
                                className="mt-1.5 w-full min-h-[40px] rounded-xl border border-[#232329] bg-[#18181c] px-3 py-2 text-xs text-[#f3f1ec] placeholder:text-[#66645e]"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Sticky Bottom Action */}
                    <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-[#e3dfd4] bg-[#fffefb] shrink-0">
                      <button
                        type="button"
                        disabled={grams <= 0}
                        onClick={(e) => commitFoodToMeal(selectedFood, e.currentTarget)}
                        className="touch-press w-full min-h-[48px] py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {portionMode === 'mix'
                            ? `خلط وإرسال للسلة (${round1(mac.price)} دج)`
                            : `إضافة إلى السلة (${round1(mac.price)} دج)`}
                        </span>
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
