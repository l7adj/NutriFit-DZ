import React, { useMemo, useState } from 'react';
import { ALLERGENS, DEFAULT_PRICING } from '../data/seed';
import {
  AllergenKey,
  AppState,
  DeliveryZone,
  DishItem,
  FoodCategory,
  FoodItem,
  Order,
} from '../types';
import { compressProgressImage } from '../utils/image';
import { CATEGORY_LABELS, getDishImage, getFoodImage } from '../utils/media';
import {
  calcCartPrice,
  dishMacros,
  formatArabicDate,
  getNextDelivery,
  getSelectedZone,
  round0,
} from '../utils/nutrition';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Edit2,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';

interface AdminViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onExitOwner: () => void;
  onToast: (msg: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  state,
  onUpdate,
  onExitOwner,
  onToast,
}) => {
  const [subTab, setSubTab] = useState<'foods' | 'dishes' | 'pricing' | 'orders'>('foods');
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCat, setFoodCat] = useState<'all' | FoodCategory>('all');
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [isNewFood, setIsNewFood] = useState(false);
  const [editingDish, setEditingDish] = useState<DishItem | null>(null);
  const [isNewDish, setIsNewDish] = useState(false);
  const [newIngId, setNewIngId] = useState<string>('');

  const pricingCfg = state.pricingConfig || DEFAULT_PRICING;
  const dlv = getNextDelivery(pricingCfg.cutoffHour);
  const selectedZone = getSelectedZone(state);

  const filteredFoods = useMemo(
    () =>
      state.foods.filter((f) => {
        if (foodCat !== 'all' && f.cat !== foodCat) return false;
        if (foodSearch.trim() && !f.name.includes(foodSearch.trim())) return false;
        return true;
      }),
    [state.foods, foodCat, foodSearch]
  );

  const productionData = useMemo(() => {
    const confirmed = state.ord.filter((o) => o.date === dlv.date && o.status === 'C');
    const waitlisted = state.ord.filter((o) => o.date === dlv.date && o.status === 'W');
    const totalBoxes = confirmed.reduce((s, o) => s + o.n, 0);
    const totalRevenue = confirmed.reduce((s, o) => s + o.total, 0);
    const totalIngCost = confirmed.reduce((s, o) => s + o.ingCost, 0);

    const ingTotals = new Map<string, number>();
    for (const o of confirmed) {
      for (const item of o.items) {
        for (const [fid, g] of item.rawIngredients) {
          ingTotals.set(fid, (ingTotals.get(fid) || 0) + g);
        }
      }
    }

    const shoppingList = Array.from(ingTotals.entries()).map(([fid, grams]) => {
      const f = state.foods.find((x) => x.id === fid);
      return {
        id: fid,
        name: f ? f.name : fid,
        image: getFoodImage(f),
        grams,
        estCost: f ? (f.price * grams) / 100 : 0,
      };
    });

    return {
      confirmed,
      waitlisted,
      totalBoxes,
      totalRevenue,
      totalIngCost,
      shoppingList,
    };
  }, [state.ord, state.foods, dlv.date]);

  const saveFood = () => {
    if (!editingFood || !editingFood.name.trim()) {
      onToast('أدخل اسم المنتج');
      return;
    }
    if (
      editingFood.nutritionDataStatus === 'verified' &&
      (!editingFood.nutritionSource?.trim() || !editingFood.nutritionBasis || editingFood.nutritionBasis === 'unspecified')
    ) {
      onToast('لا يمكن اعتماد القيم قبل إدخال مصدر غذائي وحالة الوزن (نيء/مطبوخ/كما يباع)');
      return;
    }
    onUpdate((prev) => ({
      ...prev,
      foods: isNewFood
        ? [...prev.foods, editingFood]
        : prev.foods.map((f) => (f.id === editingFood.id ? editingFood : f)),
    }));
    setEditingFood(null);
    onToast('تم حفظ المنتج');
  };

  const deleteFood = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      foods: prev.foods.filter((f) => f.id !== id),
      dishes: prev.dishes.filter((d) => d.ing.every(([fid]) => fid !== id)),
      meals: prev.meals.filter((m) => m.id !== id),
    }));
    onToast('تم حذف المنتج');
  };

  const saveDish = () => {
    if (!editingDish || !editingDish.name.trim() || editingDish.ing.length === 0) {
      onToast('أدخل اسم الطبق ومكوّنًا واحدًا على الأقل');
      return;
    }
    onUpdate((prev) => ({
      ...prev,
      dishes: isNewDish
        ? [...prev.dishes, editingDish]
        : prev.dishes.map((d) => (d.id === editingDish.id ? editingDish : d)),
    }));
    setEditingDish(null);
    onToast('تم حفظ الطبق');
  };

  const deleteDish = (id: string) => {
    onUpdate((prev) => ({
      ...prev,
      dishes: prev.dishes.filter((d) => d.id !== id),
      meals: prev.meals.filter((m) => !(m.kind === 'dish' && m.id === id)),
    }));
    onToast('تم حذف الطبق');
  };

  const updateZone = (id: string, patch: Partial<DeliveryZone>) => {
    if (patch.active === true) {
      const zone = state.zones.find((item) => item.id === id);
      const title = patch.title ?? zone?.title ?? '';
      const areas = patch.areas ?? zone?.areas ?? '';
      const hours = patch.hours ?? zone?.hours ?? '';
      if (
        !title.trim() ||
        !areas.trim() ||
        !hours.trim() ||
        areas.includes('غير معتمد') ||
        hours.includes('تجريبي') ||
        hours.includes('يُحدد')
      ) {
        onToast('لا يمكن تفعيل المنطقة قبل إدخال اسمها والأحياء وساعات الخدمة الفعلية');
        return;
      }
    }
    onUpdate((prev) => ({
      ...prev,
      zones: prev.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    }));
  };

  const addZone = () => {
    const nextIdx = state.zones.length + 1;
    const newZone: DeliveryZone = {
      id: `z_${Date.now().toString().slice(-5)}`,
      title: `منطقة جديدة ${nextIdx}`,
      areas: '',
      hours: '',
      fee: 0,
      active: false,
    };
    onUpdate((prev) => ({ ...prev, zones: [...prev.zones, newZone] }));
    onToast('أُضيفت منطقة غير مفعلة؛ أدخل بيانات الخدمة الفعلية قبل تفعيلها');
  };

  const deleteZone = (id: string) => {
    if (state.zones.length <= 1) {
      onToast('يجب الإبقاء على منطقة واحدة على الأقل');
      return;
    }
    onUpdate((prev) => {
      const remaining = prev.zones.filter((z) => z.id !== id);
      return {
        ...prev,
        zones: remaining,
        zoneId: prev.zoneId === id ? remaining[0].id : prev.zoneId,
      };
    });
    onToast('تم حذف المنطقة');
  };

  const handleUploadFoodPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingFood) return;
    try {
      const dataUrl = await compressProgressImage(file);
      setEditingFood({ ...editingFood, imageUrl: dataUrl });
      onToast('تم رفع صورة المنتج');
    } catch {
      onToast('تعذر تحميل الصورة');
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadDishPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingDish) return;
    try {
      const dataUrl = await compressProgressImage(file);
      setEditingDish({ ...editingDish, imageUrl: dataUrl });
      onToast('تم رفع صورة الطبق');
    } catch {
      onToast('تعذر تحميل الصورة');
    } finally {
      e.target.value = '';
    }
  };

  const sampleInvoice = calcCartPrice(1000, 3, selectedZone.fee, pricingCfg);

  return (
    <div className="space-y-5">
      {/* Dedicated Owner Studio Header */}
      <div className="bg-[#111411] border border-[#c9a85c]/45 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-[#c9a85c]">
            لوحة المالك الخاصة · NutriFit DZ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f3f1ec] mt-0.5">
            إدارة الأسعار، الأطعمة، الأطباق والتوصيل
          </h1>
        </div>

        <button
          type="button"
          onClick={onExitOwner}
          className="px-4 py-2.5 rounded-xl bg-[#171a16] border border-[#c9a85c]/50 hover:bg-[#242117] text-xs font-bold text-[#e5cf94] flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <ArrowRight className="w-4 h-4 text-[#c9a85c]" />
          <span>العودة إلى واجهة العميل</span>
        </button>
      </div>

      {/* Owner Section Tabs */}
      <div className="flex gap-1.5 p-1 bg-[#111411] border border-[#252823] rounded-xl overflow-x-auto no-scrollbar">
        {(
          [
            ['foods', `الأطعمة والأسعار (${state.foods.length})`],
            ['dishes', `أطباق الشيف (${state.dishes.length})`],
            ['pricing', 'التوصيل والرسوم'],
            ['orders', `الطلبات والإنتاج (${state.ord.length})`],
          ] as const
        ).map(([k, lbl]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer ${
              subTab === k
                ? 'bg-[#242117] text-[#e5cf94] border border-[#c9a85c]/40'
                : 'text-[#9b988d] hover:text-[#f3f1ec]'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* TAB 1: PRODUCTS, PRICES & AVAILABILITY */}
      {subTab === 'foods' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {(
                [
                  ['all', 'الكل'],
                  ['protein', 'بروتين'],
                  ['carb', 'كارب'],
                  ['fat', 'دهون'],
                  ['veg', 'خضر'],
                  ['juice', 'عصائر'],
                ] as const
              ).map(([c, lbl]) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFoodCat(c)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    foodCat === c
                      ? 'bg-[#242117] border-[#c9a85c] text-[#e5cf94]'
                      : 'bg-[#111411] border-[#252823] text-[#9b988d]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 text-[#6d6b62] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={foodSearch}
                  onChange={(e) => setFoodSearch(e.target.value)}
                  placeholder="بحث عن طعام..."
                  className="w-full bg-[#111411] border border-[#252823] rounded-xl pr-8 pl-3 py-2 text-xs text-[#f3f1ec]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewFood(true);
                  setEditingFood({
                    id: `f_${Date.now()}`,
                    emoji: '',
                    name: '',
                    cat: 'protein',
                    per100: { kcal: 150, p: 20, c: 5, f: 5, fiber: 0 },
                    price: 50,
                    al: [],
                    available: true,
                    nutritionDataStatus: 'unverified',
                    nutritionBasis: 'unspecified',
                    nutritionSource: 'TODO_VERIFY',
                  });
                }}
                className="px-4 py-2 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                إضافة طعام جديد
              </button>
            </div>
          </div>

          <div className="bg-[#111411] border border-[#252823] rounded-2xl divide-y divide-[#222520]">
            {filteredFoods.map((f) => {
              const isAvailable = f.available !== false;
              const unit = f.cat === 'juice' ? '100مل' : '100غ';
              return (
                <div
                  key={f.id}
                  className={`p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs ${
                    !isAvailable ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-[180px]">
                    <img
                      src={getFoodImage(f)}
                      alt={f.name}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-xl object-cover border border-[#252823] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-[#f3f1ec] truncate">{f.name}</div>
                      <div className="text-[11px] text-[#9b988d] tabular-nums mt-0.5">
                        {CATEGORY_LABELS[f.cat]} · {f.per100.kcal} kcal ·{' '}
                        <span className="text-[#d4a24c]">P{f.per100.p}</span>{' '}
                        <span className="text-[#5aa882]">C{f.per100.c}</span>{' '}
                        <span className="text-[#c97a57]">F{f.per100.f}</span>
                      </div>
                      <div className={`mt-1 text-[10px] font-semibold ${f.nutritionDataStatus === 'verified' ? 'text-[#5aa882]' : 'text-[#d4a24c]'}`}>
                        {f.nutritionDataStatus === 'verified' ? 'بيانات موثقة' : 'بيانات غذائية غير موثقة'}
                        {' · '}
                        {f.nutritionBasis === 'raw' ? 'نيء' : f.nutritionBasis === 'cooked' ? 'مطبوخ' : f.nutritionBasis === 'as_sold' ? 'كما يباع' : 'حالة الوزن غير محددة'}
                        {f.nutritionSource && f.nutritionSource !== 'TODO_VERIFY' ? ` · ${f.nutritionSource}` : ''}
                        {f.sourceRecordId ? ` (#${f.sourceRecordId})` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          foods: prev.foods.map((x) =>
                            x.id === f.id ? { ...x, available: !isAvailable } : x
                          ),
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                        isAvailable
                          ? 'bg-[#13211a] border-[#5aa882]/50 text-[#5aa882]'
                          : 'bg-[#1f1412] border-[#c45d51]/50 text-[#c45d51]'
                      }`}
                    >
                      {isAvailable ? 'متوفر' : 'متوقف'}
                    </button>

                    <label className="text-[11px] text-[#9b988d]">دج/{unit}:</label>
                    <input
                      type="number"
                      value={f.price}
                      onChange={(e) => {
                        const price = Math.max(0, parseFloat(e.target.value) || 0);
                        onUpdate((prev) => ({
                          ...prev,
                          foods: prev.foods.map((x) =>
                            x.id === f.id ? { ...x, price } : x
                          ),
                        }));
                      }}
                      className="w-20 bg-[#171a16] border border-[#252823] rounded-lg px-2 py-1.5 text-center tabular-nums font-bold text-[#e5cf94]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewFood(false);
                        setEditingFood(JSON.parse(JSON.stringify(f)));
                      }}
                      className="p-1.5 text-[#9b988d] hover:text-[#e5cf94] cursor-pointer"
                      aria-label="تعديل"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFood(f.id)}
                      className="p-1.5 text-[#c45d51] cursor-pointer"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: READY DISHES */}
      {subTab === 'dishes' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsNewDish(true);
              setNewIngId(state.foods[0]?.id || '');
              setEditingDish({
                id: `d_${Date.now()}`,
                emoji: '',
                name: '',
                ing: [],
                available: true,
              });
            }}
            className="px-4 py-2.5 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إضافة طبق جديد
          </button>

          <div className="bg-[#111411] border border-[#252823] rounded-2xl divide-y divide-[#222520]">
            {state.dishes.map((d) => {
              const mac = dishMacros(d, state.foods, 1);
              const isAvailable = d.available !== false;
              return (
                <div
                  key={d.id}
                  className={`p-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs ${
                    !isAvailable ? 'opacity-55' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={getDishImage(d, state.foods)}
                      alt={d.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover border border-[#252823] shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-[#f3f1ec] truncate">{d.name}</div>
                      <div className="text-[11px] text-[#9b988d] tabular-nums mt-0.5">
                        {round0(mac.kcal)} kcal · {round0(mac.grams)}غ ·{' '}
                        <span className="text-[#d4a24c]">P{round0(mac.p)}</span>{' '}
                        <span className="text-[#5aa882]">C{round0(mac.c)}</span>{' '}
                        <span className="text-[#c97a57]">F{round0(mac.f)}</span> ·{' '}
                        <span className="text-[#e5cf94] font-bold">{round0(mac.price)} دج</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate((prev) => ({
                          ...prev,
                          dishes: prev.dishes.map((x) =>
                            x.id === d.id ? { ...x, available: !isAvailable } : x
                          ),
                        }))
                      }
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                        isAvailable
                          ? 'bg-[#13211a] border-[#5aa882]/50 text-[#5aa882]'
                          : 'bg-[#1f1412] border-[#c45d51]/50 text-[#c45d51]'
                      }`}
                    >
                      {isAvailable ? 'متوفر' : 'متوقف'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNewDish(false);
                        setNewIngId(state.foods[0]?.id || '');
                        setEditingDish(JSON.parse(JSON.stringify(d)));
                      }}
                      className="p-1.5 text-[#9b988d] hover:text-[#e5cf94] cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteDish(d.id)}
                      className="p-1.5 text-[#c45d51] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERY ZONES, PRICING RULES & CAPACITY */}
      {subTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#e5cf94]">
                قواعد التسعير والتشغيل
              </h2>

              <div>
                <label className="block text-xs text-[#9b988d] mb-1">
                  نسبة المناولة المعلنة (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={pricingCfg.handlingPct}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
                    onUpdate((prev) => ({
                      ...prev,
                      pricingConfig: { ...pricingCfg, handlingPct: v },
                    }));
                  }}
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-sm font-bold text-[#f3f1ec] tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9b988d] mb-1">
                  أجر الخدمة لكل وجبة (دج)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2000}
                  step={10}
                  value={pricingCfg.serviceFeePerMeal}
                  onChange={(e) => {
                    const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                    onUpdate((prev) => ({
                      ...prev,
                      pricingConfig: { ...pricingCfg, serviceFeePerMeal: v },
                    }));
                  }}
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-sm font-bold text-[#f3f1ec] tabular-nums"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#9b988d] mb-1">
                    ساعة الإغلاق (08–23)
                  </label>
                  <input
                    type="number"
                    min={8}
                    max={23}
                    value={pricingCfg.cutoffHour}
                    onChange={(e) => {
                      const v = Math.max(8, Math.min(23, parseInt(e.target.value, 10) || 16));
                      onUpdate((prev) => ({
                        ...prev,
                        pricingConfig: { ...pricingCfg, cutoffHour: v },
                      }));
                    }}
                    className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-sm font-bold text-[#f3f1ec] tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#9b988d] mb-1">
                    الطاقة اليومية (علبة)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={state.cap}
                    onChange={(e) =>
                      onUpdate((prev) => ({
                        ...prev,
                        cap: Math.max(1, parseInt(e.target.value, 10) || 1),
                      }))
                    }
                    className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-sm font-bold text-[#e5cf94] tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#111411] border border-[#c9a85c]/40 rounded-2xl p-4 space-y-2 text-xs">
              <div className="font-bold text-[#e5cf94]">
                معاينة حية للفاتورة (مثال: 1000 دج مكونات + 3 وجبات)
              </div>
              <div className="flex justify-between text-[#9b988d]">
                <span>المكونات</span>
                <span className="tabular-nums text-[#f3f1ec]">{sampleInvoice.ing} دج</span>
              </div>
              <div className="flex justify-between text-[#9b988d]">
                <span>مناولة ({pricingCfg.handlingPct}%)</span>
                <span className="tabular-nums text-[#f3f1ec]">{sampleInvoice.handling} دج</span>
              </div>
              <div className="flex justify-between text-[#9b988d]">
                <span>أجر الخدمة ({pricingCfg.serviceFeePerMeal} × 3)</span>
                <span className="tabular-nums text-[#f3f1ec]">{sampleInvoice.service} دج</span>
              </div>
              <div className="flex justify-between text-[#9b988d]">
                <span>التوصيل ({selectedZone.title})</span>
                <span className="tabular-nums text-[#f3f1ec]">{sampleInvoice.delivery} دج</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#222520] font-bold">
                <span className="text-[#f3f1ec]">الإجمالي النهائي</span>
                <span className="text-base text-[#e5cf94] tabular-nums">
                  {sampleInvoice.total} دج
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#f3f1ec] flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#c9a85c]" />
                مناطق التوصيل وأسعارها
              </h2>
              <button
                type="button"
                onClick={addZone}
                className="px-3.5 py-2 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة منطقة
              </button>
            </div>

            <div className="space-y-2.5">
              {state.zones.map((z) => (
                <div
                  key={z.id}
                  className={`bg-[#111411] border border-[#252823] rounded-2xl p-3.5 space-y-2.5 ${
                    !z.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={z.title}
                      onChange={(e) => updateZone(z.id, { title: e.target.value })}
                      className="bg-[#171a16] border border-[#252823] rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#f3f1ec] flex-1 min-w-0"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={z.fee}
                        onChange={(e) =>
                          updateZone(z.id, {
                            fee: Math.max(0, parseInt(e.target.value, 10) || 0),
                          })
                        }
                        className="w-20 bg-[#171a16] border border-[#252823] rounded-lg px-2 py-1.5 text-center text-xs font-bold text-[#e5cf94] tabular-nums"
                      />
                      <span className="text-[11px] text-[#9b988d]">دج</span>
                      <button
                        type="button"
                        onClick={() => updateZone(z.id, { active: !z.active })}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold cursor-pointer ${
                          z.active
                            ? 'bg-[#13211a] border-[#5aa882]/50 text-[#5aa882]'
                            : 'bg-[#1f1412] border-[#c45d51]/50 text-[#c45d51]'
                        }`}
                      >
                        {z.active ? 'نشطة' : 'موقوفة'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteZone(z.id)}
                        className="p-1.5 text-[#c45d51] cursor-pointer"
                        aria-label="حذف المنطقة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={z.areas}
                      onChange={(e) => updateZone(z.id, { areas: e.target.value })}
                      placeholder="الأحياء المشمولة"
                      className="bg-[#171a16] border border-[#252823] rounded-lg px-2.5 py-1.5 text-[11px] text-[#9b988d]"
                    />
                    <input
                      type="text"
                      value={z.hours}
                      onChange={(e) => updateZone(z.id, { hours: e.target.value })}
                      placeholder="ساعات التوصيل"
                      className="bg-[#171a16] border border-[#252823] rounded-lg px-2.5 py-1.5 text-[11px] text-[#9b988d]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ORDERS & PRODUCTION SHOPPING LIST */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#d4a24c]/30 bg-[#241e12]/70 px-4 py-3 text-[11px] leading-6 text-[#d8cba9]">
            <strong className="text-[#e5cf94]">لوحة معاينة محلية:</strong>
            الطلبات والسعة محفوظة على هذا الجهاز فقط. قائمة الشراء تقديرية ولا تُستخدم للتوريد قبل توثيق حالة كل مكوّن وعوامل مردود الطهي.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#111411] border border-[#252823] rounded-2xl p-3.5">
              <div className="text-[11px] text-[#9b988d]">العلب المؤكدة ({formatArabicDate(dlv.date)})</div>
              <div className="text-xl font-bold text-[#5aa882] tabular-nums mt-1">
                {productionData.totalBoxes} / {state.cap}
              </div>
            </div>
            <div className="bg-[#111411] border border-[#252823] rounded-2xl p-3.5">
              <div className="text-[11px] text-[#9b988d]">قائمة الانتظار</div>
              <div className="text-xl font-bold text-[#d4a24c] tabular-nums mt-1">
                {productionData.waitlisted.length} طلب
              </div>
            </div>
            <div className="bg-[#111411] border border-[#252823] rounded-2xl p-3.5">
              <div className="text-[11px] text-[#9b988d]">إجمالي المداخيل</div>
              <div className="text-xl font-bold text-[#e5cf94] tabular-nums mt-1">
                {round0(productionData.totalRevenue)} دج
              </div>
            </div>
            <div className="bg-[#111411] border border-[#252823] rounded-2xl p-3.5">
              <div className="text-[11px] text-[#9b988d]">تكلفة المكونات التقديرية</div>
              <div className="text-xl font-bold text-[#f3f1ec] tabular-nums mt-1">
                {round0(productionData.totalIngCost)} دج
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            <div className="lg:col-span-5 bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#f3f1ec]">
                قائمة الشراء والإنتاج ({formatArabicDate(dlv.date)})
              </h2>
              {productionData.shoppingList.length === 0 ? (
                <div className="text-xs text-[#6d6b62]">
                  لا توجد طلبات مؤكدة لدورة الإنتاج القادمة بعد. لا نشتري غرامًا غير مباع.
                </div>
              ) : (
                <div className="divide-y divide-[#222520] text-xs">
                  {productionData.shoppingList.map((row) => (
                    <div key={row.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="text-[#f3f1ec] font-semibold">{row.name}</span>
                      <span className="text-[#c9a85c] font-bold tabular-nums">
                        {round0(row.grams)} غ · {round0(row.estCost)} دج
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-7 bg-[#111411] border border-[#252823] rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-[#f3f1ec]">إدارة الطلبات ({state.ord.length})</h2>
              {state.ord.length === 0 ? (
                <div className="text-xs text-[#6d6b62]">لا توجد طلبات مسجّلة حتى الآن.</div>
              ) : (
                <div className="space-y-2.5">
                  {[...state.ord].reverse().map((o) => (
                    <div
                      key={o.id}
                      className="bg-[#171a16] border border-[#252823] rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-[#f3f1ec]">
                            {o.id} · {formatArabicDate(o.date)} · {o.n} وجبات
                          </div>
                          <div className="text-[11px] text-[#9b988d] mt-0.5 tabular-nums">
                            {o.zoneTitle} · <b className="text-[#e5cf94]">{o.total} دج</b>
                            {o.note && ` · ملاحظة: ${o.note}`}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold shrink-0 ${
                            o.status === 'C'
                              ? 'text-[#5aa882]'
                              : o.status === 'W'
                                ? 'text-[#d4a24c]'
                                : 'text-[#c45d51]'
                          }`}
                        >
                          {o.status === 'C' ? 'مؤكد' : o.status === 'W' ? 'قائمة انتظار' : 'ملغى'}
                        </span>
                      </div>

                      <div className="text-[11px] text-[#9b988d]">
                        {o.items.map((it) => `${it.label} (${it.grams}غ)`).join(' · ')}
                      </div>

                      {o.status === 'C' && (
                        <div className="rounded-xl border border-[#252823] bg-[#111411] p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-[#c9a85c]">مرحلة التحضير والتسليم</span>
                            <span className="text-[10px] text-[#9b988d]">تحديث تجريبي محلي</span>
                          </div>
                          <select
                            value={o.productionStage || 'queued'}
                            onChange={(e) => {
                              const stage = e.target.value as NonNullable<Order['productionStage']>;
                              onUpdate((prev) => ({
                                ...prev,
                                ord: prev.ord.map((x) =>
                                  x.id === o.id ? { ...x, productionStage: stage } : x
                                ),
                              }));
                              onToast('تم تحديث مرحلة الطلب في المعاينة');
                            }}
                            className="w-full rounded-lg border border-[#252823] bg-[#171a16] px-3 py-2 text-xs text-[#f3f1ec]"
                          >
                            <option value="queued">بانتظار التحضير</option>
                            <option value="preparing">قيد التحضير</option>
                            <option value="packed">تم الوزن والتعبئة</option>
                            <option value="out_for_delivery">خرج للتوصيل</option>
                            <option value="delivered">تم التسليم</option>
                          </select>
                        </div>
                      )}

                      {o.status !== 'X' && (
                        <div className="flex gap-2 pt-1">
                          {o.status === 'W' && (
                            <button
                              type="button"
                              onClick={() => {
                                onUpdate((prev) => ({
                                  ...prev,
                                  ord: prev.ord.map((x) =>
                                    x.id === o.id ? { ...x, status: 'C', productionStage: 'queued' as const } : x
                                  ),
                                }));
                                onToast(`تم تأكيد الطلب ${o.id}`);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-[#13211a] border border-[#5aa882]/50 text-[11px] font-bold text-[#5aa882] flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              تأكيد الإنتاج
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onUpdate((prev) => ({
                                ...prev,
                                ord: prev.ord.map((x) =>
                                  x.id === o.id ? { ...x, status: 'X' } : x
                                ),
                              }));
                              onToast(`تم إلغاء الطلب ${o.id}`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#1f1412] border border-[#4a2b26] text-[11px] font-bold text-[#c45d51] cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EDIT FOOD MODAL */}
      {editingFood && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingFood(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111411] border border-[#c9a85c] rounded-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#f3f1ec]">
                {isNewFood ? 'إضافة طعام جديد' : 'تعديل الطعام'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingFood(null)}
                className="text-[#9b988d] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-[#9b988d]">اسم الطعام (بالعربية)</label>
              <input
                type="text"
                value={editingFood.name}
                onChange={(e) =>
                  setEditingFood({ ...editingFood, name: e.target.value })
                }
                placeholder="مثال: ستيك فيليه بقري"
                className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec] mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[#9b988d]">الاسم بالفرنسية (اختياري)</label>
                <input
                  type="text"
                  value={editingFood.nameFr ?? ''}
                  onChange={(e) =>
                    setEditingFood({ ...editingFood, nameFr: e.target.value })
                  }
                  placeholder="Filet de boeuf"
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec] mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#9b988d]">الاسم بالإنجليزية (اختياري)</label>
                <input
                  type="text"
                  value={editingFood.nameEn ?? ''}
                  onChange={(e) =>
                    setEditingFood({ ...editingFood, nameEn: e.target.value })
                  }
                  placeholder="Beef tenderloin"
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec] mt-1"
                />
              </div>
            </div>

            {/* Optional Custom Photo */}
            <div className="flex items-center gap-3 bg-[#171a16] border border-[#252823] rounded-xl p-2.5">
              <img
                src={getFoodImage(editingFood)}
                alt={editingFood.name || 'صورة الطعام'}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-[#252823] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#f3f1ec]">صورة الطعام</div>
                <div className="text-[10px] text-[#9b988d]">
                  تستخدم صورة الفئة الفاخرة تلقائيًا أو ارفع صورة خاصة
                </div>
              </div>
              <label className="px-2.5 py-1.5 rounded-lg bg-[#242117] border border-[#c9a85c]/40 text-[11px] font-bold text-[#e5cf94] flex items-center gap-1 cursor-pointer shrink-0">
                <Camera className="w-3.5 h-3.5" />
                <span>تغيير</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadFoodPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-[#9b988d]">الفئة</label>
                <select
                  value={editingFood.cat}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      cat: e.target.value as FoodCategory,
                    })
                  }
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec] mt-1"
                >
                  <option value="protein">بروتين</option>
                  <option value="carb">كارب</option>
                  <option value="fat">دهون</option>
                  <option value="veg">خضر</option>
                  <option value="juice">عصائر وسموذي</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#9b988d]">السعر / 100{editingFood.cat === 'juice' ? 'مل' : 'غ'} (دج)</label>
                <input
                  type="number"
                  value={editingFood.price}
                  onChange={(e) =>
                    setEditingFood({
                      ...editingFood,
                      price: Math.max(0, parseFloat(e.target.value) || 0),
                    })
                  }
                  className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 tabular-nums text-xs text-[#e5cf94] font-bold mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  ['kcal', 'kcal'],
                  ['p', 'P'],
                  ['c', 'C'],
                  ['f', 'F'],
                  ['fiber', 'ألياف'],
                ] as const
              ).map(([k, lbl]) => (
                <div key={k}>
                  <label className="text-[10px] text-[#9b988d] block text-center">{lbl}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingFood.per100[k]}
                    onChange={(e) =>
                      setEditingFood({
                        ...editingFood,
                        per100: {
                          ...editingFood.per100,
                          [k]: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-[#171a16] border border-[#252823] rounded-lg px-1.5 py-1.5 text-center tabular-nums text-xs text-[#f3f1ec]"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="text-[11px] text-[#9b988d] block mb-1.5">الحساسيات</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ALLERGENS) as AllergenKey[]).map((ak) => {
                  const active = editingFood.al.includes(ak);
                  return (
                    <button
                      key={ak}
                      type="button"
                      onClick={() =>
                        setEditingFood({
                          ...editingFood,
                          al: active
                            ? editingFood.al.filter((x) => x !== ak)
                            : [...editingFood.al, ak],
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg border text-xs font-bold cursor-pointer ${
                        active
                          ? 'bg-[#242117] border-[#c9a85c] text-[#e5cf94]'
                          : 'bg-[#171a16] border-[#252823] text-[#9b988d]'
                      }`}
                    >
                      {ALLERGENS[ak]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[#252823] bg-[#171a16] p-3 space-y-2.5">
              <div>
                <div className="text-xs font-bold text-[#e5cf94]">توثيق القيم الغذائية</div>
                <p className="mt-1 text-[10px] leading-5 text-[#9b988d]">
                  لا تعتمد أي قيمة قبل تحديد مرجعها وحالة الطعام التي تنطبق عليها.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9b988d]">حالة التوثيق</label>
                  <select
                    value={editingFood.nutritionDataStatus ?? 'unverified'}
                    onChange={(e) => setEditingFood({
                      ...editingFood,
                      nutritionDataStatus: e.target.value as 'verified' | 'unverified',
                    })}
                    className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-2 py-2 text-xs text-[#f3f1ec]"
                  >
                    <option value="unverified">غير موثق</option>
                    <option value="verified">موثق</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#9b988d]">حالة الوزن</label>
                  <select
                    value={editingFood.nutritionBasis ?? 'unspecified'}
                    onChange={(e) => setEditingFood({
                      ...editingFood,
                      nutritionBasis: e.target.value as 'raw' | 'cooked' | 'as_sold' | 'unspecified',
                    })}
                    className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-2 py-2 text-xs text-[#f3f1ec]"
                  >
                    <option value="unspecified">غير محدد</option>
                    <option value="raw">نيء</option>
                    <option value="cooked">مطبوخ</option>
                    <option value="as_sold">كما يباع</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[#9b988d]">المصدر العلمي</label>
                <input
                  value={editingFood.nutritionSource ?? ''}
                  onChange={(e) => setEditingFood({ ...editingFood, nutritionSource: e.target.value })}
                  placeholder="مثال: USDA FoodData Central"
                  className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-3 py-2 text-xs text-[#f3f1ec]"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-[#9b988d]">رقم السجل</label>
                  <input
                    value={editingFood.sourceRecordId ?? ''}
                    onChange={(e) => setEditingFood({ ...editingFood, sourceRecordId: e.target.value })}
                    placeholder="FDC 171077"
                    className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-2.5 py-2 text-xs text-[#f3f1ec] tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9b988d]">القابل للأكل (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editingFood.ediblePortionPct ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Math.max(1, Math.min(100, parseFloat(e.target.value) || 100));
                      setEditingFood({ ...editingFood, ediblePortionPct: val });
                    }}
                    placeholder="100"
                    className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-2.5 py-2 text-xs text-[#f3f1ec] tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#9b988d]">معامل الطهي</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0.1}
                    max={5}
                    value={editingFood.cookingYield ?? ''}
                    onChange={(e) => {
                      const val = e.target.value === '' ? undefined : Math.max(0.1, parseFloat(e.target.value) || 1);
                      setEditingFood({ ...editingFood, cookingYield: val });
                    }}
                    placeholder="0.75"
                    className="mt-1 w-full rounded-lg border border-[#252823] bg-[#111411] px-2.5 py-2 text-xs text-[#f3f1ec] tabular-nums"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={saveFood}
              className="w-full py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
            >
              حفظ الطعام
            </button>
          </div>
        </div>
      )}

      {/* EDIT DISH MODAL */}
      {editingDish && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setEditingDish(null)}
        >
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#111411] border border-[#c9a85c] rounded-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#f3f1ec]">
                {isNewDish ? 'إضافة طبق جديد' : 'تعديل الطبق'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingDish(null)}
                className="text-[#9b988d] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-[11px] text-[#9b988d]">اسم الطبق</label>
              <input
                type="text"
                value={editingDish.name}
                onChange={(e) =>
                  setEditingDish({ ...editingDish, name: e.target.value })
                }
                placeholder="مثال: دجاج مشوي مع أرز بسمتي"
                className="w-full bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec] mt-1"
              />
            </div>

            {/* Optional Dish Photo */}
            <div className="flex items-center gap-3 bg-[#171a16] border border-[#252823] rounded-xl p-2.5">
              <img
                src={getDishImage(editingDish, state.foods)}
                alt={editingDish.name || 'صورة الطبق'}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover border border-[#252823] shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#f3f1ec]">صورة الطبق</div>
                <div className="text-[10px] text-[#9b988d]">
                  صورة تلقائية أو ارفع صورة مخصصة للطبق
                </div>
              </div>
              <label className="px-2.5 py-1.5 rounded-lg bg-[#242117] border border-[#c9a85c]/40 text-[11px] font-bold text-[#e5cf94] flex items-center gap-1 cursor-pointer shrink-0">
                <Camera className="w-3.5 h-3.5" />
                <span>تغيير</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadDishPhoto}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-bold text-[#9b988d]">مكونات الطبق بالغرام</div>
              {editingDish.ing.map(([fid, g], idx) => {
                const f = state.foods.find((x) => x.id === fid);
                if (!f) return null;
                return (
                  <div key={`${fid}_${idx}`} className="flex items-center gap-2 text-xs">
                    <span className="flex-1 text-[#f3f1ec]">{f.name}</span>
                    <input
                      type="number"
                      value={g}
                      onChange={(e) => {
                        const val = Math.max(0, parseFloat(e.target.value) || 0);
                        const next = [...editingDish.ing];
                        next[idx] = [fid, val];
                        setEditingDish({ ...editingDish, ing: next });
                      }}
                      className="w-20 bg-[#171a16] border border-[#252823] rounded-lg px-2 py-1 text-center tabular-nums text-[#f3f1ec]"
                    />
                    <span className="text-[#9b988d]">غ</span>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingDish({
                          ...editingDish,
                          ing: editingDish.ing.filter((_, i) => i !== idx),
                        })
                      }
                      className="text-[#c45d51] px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              <div className="flex gap-2 pt-2">
                <select
                  value={newIngId}
                  onChange={(e) => setNewIngId(e.target.value)}
                  className="flex-1 bg-[#171a16] border border-[#252823] rounded-xl px-3 py-2 text-xs text-[#f3f1ec]"
                >
                  {state.foods.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (!newIngId) return;
                    setEditingDish({
                      ...editingDish,
                      ing: [...editingDish.ing, [newIngId, 100]],
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#171a16] border border-[#c9a85c]/50 text-xs font-bold text-[#e5cf94] cursor-pointer"
                >
                  + أضف
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={saveDish}
              className="w-full py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e5cf94] to-[#c9a85c] cursor-pointer"
            >
              حفظ الطبق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
