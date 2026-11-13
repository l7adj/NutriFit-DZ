import React, { useEffect, useState } from 'react';
import { AppState, AppTab } from '../types';
import { algiersNow, calcCartTotals, calcGaps, calcNutrition, formatArabicDate, getNextDelivery, round0 } from '../utils/nutrition';
import { MealSlotsSummary } from './MealSlotsSummary';
import { ArrowLeft, Camera, CheckCircle2, Clock3, Flame, Plus, Scale, ShieldCheck, ShoppingBag, UtensilsCrossed } from 'lucide-react';

interface TodayViewProps {
  state: AppState;
  onNavigate: (tab: AppTab) => void;
  onSelectMealSlot: (slotIdx: number) => void;
  onReopenCalc: () => void;
}

const Metric: React.FC<{label:string; value:number; target:number; unit:string; tone:string}> = ({label,value,target,unit,tone}) => {
  const pct = target > 0 ? Math.min(100, Math.max(0, value / target * 100)) : 0;
  return <div className="min-w-0 rounded-2xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-4">
    <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-[var(--nf-muted)]">{label}</span><span className="text-[10px] text-[var(--nf-dim)]">الهدف {round0(target)}{unit}</span></div>
    <div className="mt-3 flex items-baseline gap-1"><strong className="text-2xl font-semibold tracking-tight text-[var(--nf-ink)] tabular-nums">{round0(value)}</strong><span className="text-xs text-[var(--nf-muted)]">{unit}</span></div>
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--nf-surface-2)]"><div className="h-full rounded-full transition-[width] duration-300" style={{width:`${pct}%`,background:tone}} /></div>
    <div className="mt-2 text-[10px] text-[var(--nf-muted)] tabular-nums">{round0(Math.max(0,target-value))}{unit} متبقية</div>
  </div>;
};

export const TodayView: React.FC<TodayViewProps> = ({ state, onNavigate, onSelectMealSlot, onReopenCalc }) => {
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(id); }, []);
  const res = calcNutrition(state);
  const now = algiersNow();
  const cutoffHour = state.pricingConfig?.cutoffHour ?? 16;
  const dlv = getNextDelivery(cutoffHour);
  const totals = calcCartTotals(state);
  const gaps = calcGaps(state);

  if (res.err) return <section className="rounded-3xl border border-[var(--nf-border)] bg-[var(--nf-surface)] p-6 sm:p-8">
    <div className="text-xs font-semibold text-[var(--nf-muted)]">{formatArabicDate(now.d)}</div>
    <h1 className="mt-3 text-2xl font-semibold text-[var(--nf-ink)]">لنبدأ من بيانات صحيحة</h1>
    <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--nf-muted)]">{res.err}</p>
    <button type="button" onClick={onReopenCalc} className="touch-press mt-6 inline-flex min-h-12 items-center gap-3 rounded-xl bg-[var(--nf-green)] px-5 text-sm font-bold text-white">مراجعة الملف الغذائي <ArrowLeft size={16}/></button>
  </section>;

  const usedCap = state.ord.filter(o => o.date === dlv.date && o.status === 'C').reduce((acc,o) => acc + o.n,0);
  const remainingCap = Math.max(0,state.cap-usedCap);
  const latestOrder = state.ord.length ? state.ord[state.ord.length-1] : null;
  const hoursLeft = Math.floor(dlv.minutesLeft/60);
  const minsLeft = dlv.minutesLeft%60;
  const cutoffLabel = `${String(dlv.cutoffHour).padStart(2,'0')}:00`;
  const completion = res.kcal > 0 ? Math.min(100, totals.kcal/res.kcal*100) : 0;

  return <div className="space-y-6 sm:space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-xs font-medium text-[var(--nf-muted)]">{formatArabicDate(now.d)} <span className="mx-1 text-[var(--nf-dim)]">·</span> توقيت الجزائر</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--nf-ink)] sm:text-4xl">مساحتك الغذائية<span className="text-[var(--nf-sage)]">.</span></h1>
        <p className="mt-2 text-sm text-[var(--nf-muted)]">أهلًا {state.name || 'بك'}، خطتك تبدأ من هنا.</p></div>
      <div className="flex items-center gap-2 rounded-full border border-[var(--nf-border)] bg-[var(--nf-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--nf-muted)]"><ShieldCheck size={14} className="text-[var(--nf-green)]"/> تخطيط مبني على بياناتك</div>
    </div>

    <div className="grid gap-4 lg:grid-cols-[1.45fr_.85fr]">
      <section className="relative isolate overflow-hidden rounded-[26px] bg-[var(--nf-green)] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-24 -z-10 h-64 w-64 rounded-full border border-white/10"/>
        <div className="pointer-events-none absolute -left-4 -top-12 -z-10 h-44 w-44 rounded-full border border-white/10"/>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[10px] font-bold tracking-[.2em] text-white/60">YOUR DAILY NUTRITION</div><h2 className="mt-3 text-xl font-semibold sm:text-2xl">تقدّمك اليومي</h2><p className="mt-1 text-xs leading-6 text-white/65">تتبّع الخطة قبل اعتماد وجبات الغد.</p></div>
          <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white/80">الهدف اليومي</div>
        </div>
        <div className="mt-8 grid items-end gap-5 sm:grid-cols-[1fr_auto]">
          <div><div className="flex items-end gap-2"><strong className="text-5xl font-semibold tracking-tight tabular-nums">{round0(gaps.kcal)}</strong><span className="pb-1 text-sm text-white/70">kcal متبقية</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#d9c5a2] transition-[width] duration-500" style={{width:`${completion}%`}}/></div><div className="mt-2 flex justify-between text-[10px] text-white/65"><span>المخطّط {round0(totals.kcal)} kcal</span><span>الهدف {round0(res.kcal)} kcal</span></div></div>
          <div className="min-w-28 border-r border-white/15 pr-5 text-left"><div className="text-[10px] text-white/60">نسبة التخطيط</div><div className="mt-1 text-3xl font-semibold tabular-nums">{round0(completion)}<span className="text-base">%</span></div></div>
        </div>
      </section>

      <section className="flex flex-col justify-between rounded-[26px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--nf-muted)]">موعد الطلب القادم</span><Clock3 size={17} className="text-[var(--nf-brass)]"/></div>
        <div className="mt-5"><div className="text-xl font-semibold text-[var(--nf-ink)]">{formatArabicDate(dlv.date)}</div><div className="mt-1 text-xs text-[var(--nf-muted)]">التوصيل القادم المتوقع</div></div>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-[var(--nf-border)] pt-4"><div><div className="text-[10px] text-[var(--nf-muted)]">إغلاق استقبال الطلبات · {cutoffLabel}</div><div className="mt-1 text-lg font-semibold tabular-nums text-[var(--nf-ink)]">{dlv.closedToday ? 'انتهت النافذة' : `${hoursLeft}س ${minsLeft}د`}</div></div><div className="text-left"><div className="text-[10px] text-[var(--nf-muted)]">سعة المعاينة</div><div className="mt-1 text-sm font-semibold tabular-nums text-[var(--nf-green)]">{remainingCap} / {state.cap}</div></div></div>
      </section>
    </div>

    <section><div className="mb-3 flex items-end justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--nf-ink)]">مؤشرات التغذية</h2><p className="mt-1 text-xs text-[var(--nf-muted)]">القيم المحسوبة مقابل ما خططت له في وجباتك.</p></div><button type="button" onClick={() => onNavigate('me')} className="text-xs font-bold text-[var(--nf-green)]">تفاصيل الحساب <ArrowLeft size={13} className="mr-1 inline"/></button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3"><Metric label="البروتين" value={totals.p} target={res.fp} unit="غ" tone="#24483d"/><Metric label="الكربوهيدرات" value={totals.c} target={res.C} unit="غ" tone="#87978a"/><Metric label="الدهون" value={totals.f} target={res.F} unit="غ" tone="#b28a56"/></div>
    </section>

    <div className="grid items-start gap-4 lg:grid-cols-[1.05fr_.95fr]">
      <section className="rounded-[26px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-[var(--nf-ink)]">جدول وجباتك</h2><p className="mt-1 text-xs text-[var(--nf-muted)]">وزّع اختياراتك على وجبات اليوم.</p></div><button type="button" onClick={() => onNavigate('cart')} className="text-xs font-bold text-[var(--nf-green)]">مراجعة الخطة</button></div>
        <div className="mt-5"><MealSlotsSummary state={state} onSelectSlot={onSelectMealSlot}/></div>
        <button type="button" onClick={() => onSelectMealSlot(0)} className="touch-press mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--nf-sage)] bg-[var(--nf-green-soft)] text-xs font-bold text-[var(--nf-green)]"><Plus size={15}/> أضف إلى خطة الوجبات</button>
      </section>

      <div className="space-y-4">
        <section className="rounded-[26px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5 sm:p-6">
          <div className="flex items-center gap-2 text-[var(--nf-muted)]"><Flame size={16} className="text-[var(--nf-brass)]"/><span className="text-xs font-bold">الخطوة التالية</span></div>
          {state.meals.length === 0 ? <><h2 className="mt-4 text-lg font-semibold text-[var(--nf-ink)]">ابدأ ببناء وجبتك الأولى</h2><p className="mt-2 text-xs leading-6 text-[var(--nf-muted)]">اختر مكوناتك وحدد أوزانها، وسترى أثر كل تعديل على القيم الغذائية مباشرة.</p><button type="button" onClick={() => onSelectMealSlot(0)} className="touch-press mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--nf-green)] text-xs font-bold text-white">ابدأ تصميم الوجبات <ArrowLeft size={15}/></button></> : gaps.P > 5 || gaps.C > 10 || gaps.F > 5 || gaps.kcal > 80 ? <><h2 className="mt-4 text-lg font-semibold text-[var(--nf-ink)]">أكمل توزيع احتياجك</h2><p className="mt-2 text-xs leading-6 text-[var(--nf-muted)]">المتبقي: {round0(gaps.P)}غ بروتين، {round0(gaps.C)}غ كربوهيدرات، {round0(gaps.F)}غ دهون.</p><button type="button" onClick={() => onNavigate('menu')} className="mt-4 text-xs font-bold text-[var(--nf-green)]">استكشف المكونات <ArrowLeft size={13} className="mr-1 inline"/></button></> : <div className="mt-4 flex items-start gap-3"><CheckCircle2 className="mt-1 text-[var(--nf-ok)]" size={20}/><div><h2 className="font-semibold text-[var(--nf-ink)]">الخطة قريبة من هدفك</h2><p className="mt-1 text-xs leading-6 text-[var(--nf-muted)]">راجع تفاصيل الوجبات قبل تأكيد الطلب.</p></div></div>}
        </section>
        {latestOrder && <section className="rounded-[26px] border border-[var(--nf-border)] bg-[var(--nf-surface)] p-5"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[var(--nf-muted)]">آخر طلب</span><span className="rounded-full bg-[var(--nf-green-soft)] px-2.5 py-1 text-[10px] font-bold text-[var(--nf-green)]">{latestOrder.status==='C'?'مؤكد':latestOrder.status==='W'?'قائمة انتظار':'ملغى'}</span></div><div className="mt-3 flex items-center justify-between gap-3"><div><div className="text-sm font-semibold text-[var(--nf-ink)]">{formatArabicDate(latestOrder.date)}</div><div className="mt-1 text-[11px] text-[var(--nf-muted)]">{latestOrder.n} وجبات</div></div><strong className="text-base tabular-nums text-[var(--nf-ink)]">{latestOrder.total} دج</strong></div></section>}
      </div>
    </div>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--nf-surface-2)] px-4 py-3 text-[10px] text-[var(--nf-muted)]"><span>هذه نسخة معاينة؛ السعة والأسعار والطلبات لا تمثل تشغيلًا تجاريًا مؤكدًا.</span><span className="flex items-center gap-1"><ShieldCheck size={12}/> الحسابات الغذائية منفصلة عن اعتماد الطلب</span></div>
  </div>;
};
