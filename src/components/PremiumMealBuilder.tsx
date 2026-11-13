import React, { useEffect, useMemo, useState } from 'react';
import { AppState, AppTab, CartItem, FoodItem } from '../types';
import { CATEGORY_LABELS, getFoodImage } from '../utils/media';
import {
  calcCartTotals, calcGaps, calcNutrition, cartItemMacros, clamp,
  foodMacros, formatAllergenList, getBlockedAllergensForFood,
  getFoodGramDefaults, getMealSlotName, round0, round1,
} from '../utils/nutrition';
import { ArrowLeft, Check, Minus, Plus, Search, ShoppingBag, Trash2, X } from 'lucide-react';

interface Props {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onNavigate: (tab: AppTab) => void;
  onToast: (msg: string) => void;
  onCartPulse?: () => void;
  pickerRequest?: { slot: number; seq: number } | null;
}
type Category = 'all' | 'protein' | 'carb' | 'fat' | 'veg';

const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'الكل' }, { id: 'protein', label: 'مصادر البروتين' },
  { id: 'carb', label: 'مصادر الطاقة' }, { id: 'fat', label: 'الدهون' },
  { id: 'veg', label: 'الخضروات' },
];

export const PremiumMealBuilder: React.FC<Props> = ({
  state, onUpdate, onNavigate, onToast, onCartPulse, pickerRequest,
}) => {
  const [slot, setSlot] = useState(() => clamp(pickerRequest?.slot ?? state.activeSlot ?? 0, 0, Math.max(0, state.n - 1)));
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [grams, setGrams] = useState(150);
  const [plateUid, setPlateUid] = useState('new');

  useEffect(() => {
    if (!pickerRequest) return;
    const next = clamp(pickerRequest.slot, 0, Math.max(0, state.n - 1));
    setSlot(next); setSelectedId(null); setQuery(''); setCategory('all');
  }, [pickerRequest?.seq, state.n]);

  const nutrition = calcNutrition(state);
  const totals = calcCartTotals(state);
  const gaps = calcGaps(state);
  const activeItems = state.meals.filter(item => clamp(item.slot || 0, 0, state.n - 1) === slot);
  const selected = selectedId ? state.foods.find(food => food.id === selectedId) ?? null : null;
  const filtered = useMemo(() => state.foods.filter(food => {
    if (food.cat === 'juice' || (category !== 'all' && food.cat !== category)) return false;
    const needle = query.trim().toLocaleLowerCase();
    return !needle || [food.name, food.nameFr, food.nameEn].some(value => value?.toLocaleLowerCase().includes(needle));
  }), [state.foods, category, query]);

  if (nutrition.err) return <section className="rounded-3xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 text-sm leading-7 text-[var(--nf-bad)]">{nutrition.err}</section>;

  const choose = (food: FoodItem) => {
    const blocked = getBlockedAllergensForFood(food, state.al);
    if (food.available === false) { onToast('هذا المكوّن غير متاح حاليًا.'); return; }
    if (blocked.length) { onToast('مكوّن محجوب بسبب الحساسية: ' + formatAllergenList(blocked)); return; }
    setSelectedId(food.id);
    setGrams(getFoodGramDefaults(food).def);
    setPlateUid(activeItems.find(item => item.kind === 'custom')?.uid ?? 'new');
  };

  const addIngredient = () => {
    if (!selected || grams <= 0) return;
    const amount = Math.round(grams);
    onUpdate(prev => {
      const target = plateUid === 'new'
        ? undefined
        : prev.meals.find(item => item.uid === plateUid && item.kind === 'custom' && item.slot === slot);
      if (target) {
        const ingredients = [...(target.ing ?? [])];
        const index = ingredients.findIndex(([id]) => id === selected.id);
        if (index >= 0) ingredients[index] = [selected.id, ingredients[index][1] + amount];
        else ingredients.push([selected.id, amount]);
        return { ...prev, activeSlot: slot, meals: prev.meals.map(item => item.uid === target.uid
          ? { ...item, name: 'طبق مخصص', ing: ingredients } : item) };
      }
      const item: CartItem = {
        uid: 'plate_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        kind: 'custom', id: 'custom_mix', name: 'طبق مخصص',
        ing: [[selected.id, amount]], slot,
      };
      return { ...prev, activeSlot: slot, meals: [...prev.meals, item] };
    });
    onCartPulse?.();
    onToast('أُضيف المكوّن إلى ' + getMealSlotName(state, slot));
    setSelectedId(null);
  };

  const removeItem = (uid: string) => onUpdate(prev => ({ ...prev, meals: prev.meals.filter(item => item.uid !== uid) }));
  const addSlot = () => {
    if (state.n >= 5) return;
    onUpdate(prev => ({ ...prev, n: prev.n + 1, activeSlot: prev.n }));
    setSlot(state.n);
  };

  return <div className="space-y-6 pb-4">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[10px] font-bold tracking-[.18em] text-[var(--nf-brass)]">THE MEAL STUDIO · BUILD YOUR DAY</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--nf-ink)] sm:text-4xl">صمّم وجبات يومك</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--nf-muted)]">ابدأ باختيار الوجبة، ثم أضف المكونات وحدد وزن كل مكوّن. سترى أثر اختياراتك على خطتك قبل إضافتها.</p>
      </div>
      <button type="button" onClick={() => onNavigate('cart')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)] px-4 text-xs font-bold text-[var(--nf-green)]">
        <ShoppingBag size={16}/> مراجعة الخطة <span className="rounded-full bg-[var(--nf-green-soft)] px-2 py-1 tabular-nums">{state.meals.length}</span>
      </button>
    </header>

    <section className="rounded-[26px] bg-[var(--nf-green)] p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="text-[10px] font-semibold tracking-[.16em] text-white/60">YOUR DAILY TARGET</div><div className="mt-1 text-sm font-semibold">ملخص خطتك الغذائية</div></div>
        <div className="text-left"><div className="text-[10px] text-white/60">الطاقة المخططة</div><div className="text-2xl font-semibold tabular-nums">{round0(totals.kcal)} <span className="text-xs font-normal">/ {round0(nutrition.kcal)} kcal</span></div></div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#d9c5a2] transition-[width] duration-300" style={{width: `${Math.min(100, totals.kcal / Math.max(1, nutrition.kcal) * 100)}%`}}/></div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['بروتين', totals.p, nutrition.fp, 'غ'], ['كربوهيدرات', totals.c, nutrition.C, 'غ'], ['دهون', totals.f, nutrition.F, 'غ'], ['المتبقي', gaps.kcal, 0, 'kcal']].map(([label, value, target, unit]) =>
          <div key={String(label)} className="rounded-xl border border-white/15 bg-white/5 p-3">
            <div className="text-[10px] text-white/60">{label}</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{round0(Number(value))}<span className="mr-1 text-[10px] font-normal">{unit}</span></div>
            {Number(target) > 0 && <div className="text-[9px] text-white/55">الهدف {round0(Number(target))}</div>}
          </div>)}
      </div>
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--nf-ink)]">1. اختر الوجبة</h2><p className="mt-1 text-xs text-[var(--nf-muted)]">يمكنك التنقل بين الوجبات وإكمال كل واحدة على حدة.</p></div>
        {state.n < 5 && <button type="button" onClick={addSlot} className="min-h-10 rounded-xl border border-[var(--nf-border)] px-3 text-xs font-bold text-[var(--nf-green)]"><Plus size={14} className="ml-1 inline"/> وجبة جديدة</button>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({length: state.n}, (_, index) => {
          const items = state.meals.filter(item => item.slot === index);
          const selectedSlot = slot === index;
          const macros = items.reduce((sum, item) => { const m = cartItemMacros(item, state.foods, state.dishes); return {kcal:sum.kcal+m.kcal, p:sum.p+m.p}; }, {kcal:0,p:0});
          return <button key={index} type="button" onClick={() => {setSlot(index); onUpdate(prev => ({...prev, activeSlot:index}));}} className={`touch-press rounded-2xl border p-3 text-right transition-all ${selectedSlot ? 'border-[var(--nf-green)] bg-[var(--nf-green-soft)] shadow-sm' : 'border-[var(--nf-border)] bg-[var(--nf-surface)]'}`}>
            <div className="flex items-center justify-between"><span className="text-[10px] text-[var(--nf-muted)]">0{index+1}</span>{items.length > 0 && <Check size={14} className="text-[var(--nf-green)]"/>}</div>
            <div className="mt-2 text-sm font-semibold text-[var(--nf-ink)]">{getMealSlotName(state,index)}</div>
            <div className="mt-1 text-[10px] text-[var(--nf-muted)] tabular-nums">{round0(macros.kcal)} kcal · P {round0(macros.p)}غ</div>
          </button>;
        })}
      </div>
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--nf-ink)]">2. اختر المكونات</h2><p className="mt-1 text-xs text-[var(--nf-muted)]">القيم المعروضة لكل 100 غرام، ما لم يُذكر غير ذلك.</p></div>
          <div className="relative w-full sm:w-64"><Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--nf-muted)]"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن مكوّن..." className="min-h-11 w-full rounded-xl border border-[var(--nf-border)] bg-[var(--nf-surface)] pr-9 pl-3 text-xs outline-none focus:border-[var(--nf-green)]"/></div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(item => <button key={item.id} type="button" onClick={()=>setCategory(item.id)} className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-semibold ${category===item.id?'border-[var(--nf-green)] bg-[var(--nf-green)] text-white':'border-[var(--nf-border)] bg-[var(--nf-surface)] text-[var(--nf-muted)]'}`}>{item.label}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(food => {
            const blocked = getBlockedAllergensForFood(food, state.al);
            const unavailable = food.available === false;
            return <article key={food.id} className="group overflow-hidden rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] transition-all hover:-translate-y-0.5 hover:shadow-lg">
              <button type="button" disabled={unavailable || blocked.length>0} onClick={()=>choose(food)} className="w-full text-right disabled:cursor-not-allowed disabled:opacity-50">
                <div className="relative aspect-[16/9] overflow-hidden bg-[var(--nf-surface-2)]"><img src={getFoodImage(food)} alt={food.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/><span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[var(--nf-ink)]">{CATEGORY_LABELS[food.cat]}</span></div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2"><div><h3 className="text-sm font-semibold text-[var(--nf-ink)]">{food.name}</h3><p className="mt-1 text-[10px] text-[var(--nf-muted)]">{food.nutritionDataStatus==='verified'?'بيانات غذائية موثقة':'بيانات قيد التحقق'} · {food.nutritionBasis==='raw'?'وزن نيء':food.nutritionBasis==='cooked'?'وزن مطبوخ':'أساس الوزن غير محدد'}</p></div><div className="text-left text-sm font-bold text-[var(--nf-green)] tabular-nums">{round1(food.price)} <span className="text-[10px] font-normal">دج</span><div className="text-[9px] font-normal text-[var(--nf-muted)]">/ 100غ</div></div></div>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 border-t border-[var(--nf-border)] pt-3 text-center tabular-nums"><div><b className="block text-xs">{round0(food.per100.kcal)}</b><span className="text-[9px] text-[var(--nf-muted)]">kcal</span></div><div><b className="block text-xs">{round1(food.per100.p)}غ</b><span className="text-[9px] text-[var(--nf-muted)]">بروتين</span></div><div><b className="block text-xs">{round1(food.per100.c)}غ</b><span className="text-[9px] text-[var(--nf-muted)]">كارب</span></div><div><b className="block text-xs">{round1(food.per100.f)}غ</b><span className="text-[9px] text-[var(--nf-muted)]">دهون</span></div></div>
                  {blocked.length>0 && <p className="mt-2 text-[10px] text-[var(--nf-bad)]">محجوب بسبب الحساسية: {formatAllergenList(blocked)}</p>}
                </div>
              </button>
            </article>;
          })}
        </div>
        {filtered.length===0 && <div className="rounded-2xl border border-dashed border-[var(--nf-border)] p-8 text-center text-sm text-[var(--nf-muted)]">لا توجد نتائج. جرّب كلمة بحث أخرى أو تصنيفًا مختلفًا.</div>}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-5">
        <section className="rounded-[24px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4 sm:p-5">
          <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold text-[var(--nf-ink)]">3. تكوين {getMealSlotName(state,slot)}</h2><p className="mt-1 text-[10px] text-[var(--nf-muted)]">المكونات التي أضفتها إلى هذه الوجبة.</p></div><span className="rounded-full bg-[var(--nf-green-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--nf-green)]">{activeItems.length} عنصر</span></div>
          <div className="mt-4 divide-y divide-[var(--nf-border)]">
            {activeItems.map(item => { const m=cartItemMacros(item,state.foods,state.dishes); return <div key={item.uid} className="flex items-center justify-between gap-2 py-3"><div className="min-w-0"><div className="truncate text-xs font-semibold text-[var(--nf-ink)]">{item.name || state.foods.find(food=>food.id===item.id)?.name || 'طبق مخصص'}</div><div className="mt-1 text-[10px] text-[var(--nf-muted)] tabular-nums">{round0(m.grams)}غ · {round0(m.kcal)} kcal · P{round1(m.p)}غ · {round1(m.price)} دج</div>{item.kind==='custom' && <div className="mt-1 text-[9px] text-[var(--nf-muted)]">{(item.ing??[]).map(([id,g])=>`${state.foods.find(food=>food.id===id)?.name??id} ${g}غ`).join(' · ')}</div>}</div><button type="button" onClick={()=>removeItem(item.uid)} aria-label="حذف العنصر" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--nf-muted)] hover:bg-red-50 hover:text-[var(--nf-bad)]"><Trash2 size={15}/></button></div>;})}
          </div>
          {activeItems.length===0 && <p className="py-5 text-center text-xs leading-6 text-[var(--nf-muted)]">هذه الوجبة فارغة. اختر مكوّنًا من القائمة لإضافته.</p>}
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--nf-border)] pt-4 text-xs"><div><span className="text-[var(--nf-muted)]">الطاقة</span><b className="mt-1 block tabular-nums">{round0(activeItems.reduce((s,i)=>s+cartItemMacros(i,state.foods,state.dishes).kcal,0))} kcal</b></div><div><span className="text-[var(--nf-muted)]">التكلفة</span><b className="mt-1 block tabular-nums">{round0(activeItems.reduce((s,i)=>s+cartItemMacros(i,state.foods,state.dishes).price,0))} دج</b></div></div>
          <button type="button" onClick={()=>onNavigate('cart')} disabled={state.meals.length===0} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nf-green)] px-4 text-xs font-bold text-white disabled:opacity-40"><ShoppingBag size={15}/> مراجعة السلة والخطة <ArrowLeft size={15}/></button>
        </section>
        <section className="rounded-[24px] border border-[var(--nf-border)] bg-[var(--nf-surface-2)] p-4 text-xs leading-6 text-[var(--nf-muted)]"><b className="text-[var(--nf-ink)]">منهجية الوزن</b><p className="mt-1">انتبه إلى أساس الوزن: نيء أو مطبوخ أو كما يباع. لا تقارن قيمًا غذائية محسوبة على أساسين مختلفين.</p></section>
      </aside>
    </div>

    {selected && (() => { const cfg=getFoodGramDefaults(selected); const m=foodMacros(selected,grams); return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" onClick={e=>{if(e.target===e.currentTarget)setSelectedId(null);}}>
      <section role="dialog" aria-modal="true" aria-label={`تحديد كمية ${selected.name}`} className="w-full max-w-xl overflow-hidden rounded-t-[28px] bg-[var(--nf-surface)] shadow-2xl sm:rounded-[28px]">
        <header className="flex items-center justify-between border-b border-[var(--nf-border)] p-4"><div><div className="text-[10px] text-[var(--nf-muted)]">{getMealSlotName(state,slot)} · {CATEGORY_LABELS[selected.cat]}</div><h2 className="mt-1 text-lg font-semibold text-[var(--nf-ink)]">{selected.name}</h2></div><button type="button" onClick={()=>setSelectedId(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nf-surface-2)]" aria-label="إغلاق"><X size={17}/></button></header>
        <div className="p-5"><div className="grid grid-cols-4 gap-2 rounded-2xl bg-[var(--nf-green-soft)] p-3 text-center tabular-nums">{[['السعرات',round0(m.kcal),'kcal'],['البروتين',round1(m.p),'غ'],['الكارب',round1(m.c),'غ'],['الدهون',round1(m.f),'غ']].map(([label,value,unit])=><div key={String(label)}><div className="text-[9px] text-[var(--nf-muted)]">{label}</div><b className="mt-1 block text-sm text-[var(--nf-ink)]">{value}<span className="mr-0.5 text-[9px] font-normal">{unit}</span></b></div>)}</div>
          <div className="mt-5 flex items-center justify-between"><span className="text-sm font-semibold text-[var(--nf-ink)]">الكمية</span><span className="text-xs text-[var(--nf-muted)]">خطوة {cfg.step} غ</span></div>
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-[var(--nf-border)] p-2"><button type="button" onClick={()=>setGrams(g=>Math.max(cfg.min,g-cfg.step))} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nf-surface-2)]"><Minus size={17}/></button><div className="text-center"><div className="text-3xl font-semibold tabular-nums text-[var(--nf-ink)]">{grams}</div><div className="text-[10px] text-[var(--nf-muted)]">غرام</div></div><button type="button" onClick={()=>setGrams(g=>Math.min(cfg.max,g+cfg.step))} className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nf-surface-2)]"><Plus size={17}/></button></div>
          <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={clamp(grams,cfg.min,cfg.max)} onChange={e=>setGrams(Number(e.target.value))} className="mt-4 w-full accent-[var(--nf-green)]"/>
          <div className="mt-4 flex items-center justify-between text-xs"><span className="text-[var(--nf-muted)]">تكلفة هذه الكمية</span><b className="text-base tabular-nums text-[var(--nf-green)]">{round1(m.price)} دج</b></div>
          <div className="mt-4"><div className="mb-2 text-xs font-semibold text-[var(--nf-ink)]">أضف إلى</div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setPlateUid('new')} className={`min-h-11 rounded-xl border text-xs font-semibold ${plateUid==='new'?'border-[var(--nf-green)] bg-[var(--nf-green-soft)] text-[var(--nf-green)]':'border-[var(--nf-border)]'}`}>طبق جديد</button>{activeItems.filter(item=>item.kind==='custom').map(item=><button key={item.uid} type="button" onClick={()=>setPlateUid(item.uid)} className={`min-h-11 rounded-xl border px-2 text-xs font-semibold ${plateUid===item.uid?'border-[var(--nf-green)] bg-[var(--nf-green-soft)] text-[var(--nf-green)]':'border-[var(--nf-border)]'}`}>الطبق الحالي</button>)}</div></div>
        </div>
        <footer className="border-t border-[var(--nf-border)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" onClick={addIngredient} className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nf-green)] px-4 text-sm font-bold text-white"><Check size={17}/> أضف المكوّن · {round1(m.price)} دج</button></footer>
      </section>
    </div>;})()}
  </div>;
};
