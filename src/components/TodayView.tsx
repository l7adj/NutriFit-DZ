import React, { useEffect, useState } from 'react';
import { AppState, AppTab } from '../types';
import {
  algiersNow,
  calcCartTotals,
  calcGaps,
  calcNutrition,
  formatArabicDate,
  getNextDelivery,
  round0,
} from '../utils/nutrition';
import { SvgRing } from './SvgRing';
import { MealSlotsSummary } from './MealSlotsSummary';
import { Camera, Clock, Scale, UtensilsCrossed } from 'lucide-react';

interface TodayViewProps {
  state: AppState;
  onNavigate: (tab: AppTab) => void;
  onSelectMealSlot: (slotIdx: number) => void;
  onReopenCalc: () => void;
}

export const TodayView: React.FC<TodayViewProps> = ({
  state,
  onNavigate,
  onSelectMealSlot,
  onReopenCalc,
}) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const res = calcNutrition(state);
  const now = algiersNow();
  const cutoffHour = state.pricingConfig?.cutoffHour ?? 16;
  const dlv = getNextDelivery(cutoffHour);
  const totals = calcCartTotals(state);
  const gaps = calcGaps(state);

  if (res.err) {
    return (
      <div className="space-y-4">
        <div className="text-xs text-[#96938a]">{formatArabicDate(now.d)}</div>
        <div className="bg-[#1b1212] border border-[#b86157]/45 rounded-2xl p-4 text-sm text-[#f3f1ec]">
          {res.err}
        </div>
        <button
          type="button"
          onClick={onReopenCalc}
          className="touch-press w-full py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
        >
          مراجعة الحاسبة العلمية
        </button>
      </div>
    );
  }

  const usedCap = state.ord
    .filter((o) => o.date === dlv.date && o.status === 'C')
    .reduce((acc, o) => acc + o.n, 0);
  const remainingCap = Math.max(0, state.cap - usedCap);
  const latestOrder = state.ord.length > 0 ? state.ord[state.ord.length - 1] : null;

  const hoursLeft = Math.floor(dlv.minutesLeft / 60);
  const minsLeft = dlv.minutesLeft % 60;
  const cutoffLabel = `${String(dlv.cutoffHour).padStart(2, '0')}:00`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#96938a] border-b border-[#232329] pb-3">
        <span>
          <strong className="text-[#c8a96e]">وضع المعاينة:</strong> الأرقام والسعة والطلبات هنا للتجربة على هذا الجهاز.
        </span>
        <span className="tabular-nums">
          سعة المعاينة للغد: <b className="text-[#e6d1a3]">{remainingCap}</b> / {state.cap} وجبة
        </span>
      </div>

      {/* Greeting & Date */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-xs text-[#96938a]">
            {formatArabicDate(now.d)} · توقيت الجزائر
          </div>
          <h1 className="text-2xl font-bold text-[#f3f1ec] mt-1 text-balance">
            أهلًا {state.name || 'بك'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 space-y-5">
          {/* Next Delivery & Cutoff */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-[#f3f1ec]">
                التوصيل القادم: {formatArabicDate(dlv.date)}
              </div>
              <div className="text-xs text-[#96938a] mt-1">
                نافذة التسليم ونقطة الاستلام تُحددان بعد اعتماد منطقة الخدمة
              </div>
            </div>
            <div className="text-left shrink-0">
              {dlv.closedToday ? (
                <div className="text-xs font-bold text-[#b86157]">
                  انتهت نافذة الطلب ({cutoffLabel})
                </div>
              ) : (
                <div>
                  <div className="text-[11px] text-[#96938a] flex items-center justify-end gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#c8a96e]" />
                    إغلاق ({cutoffLabel})
                  </div>
                  <div className="text-sm font-bold text-[#e6d1a3] tabular-nums">
                    {hoursLeft}س {minsLeft}د
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hero Ring Card */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-6 text-center">
            <div className="text-xs font-medium text-[#96938a] mb-4">
              المتبقي من احتياج اليوم
            </div>
            <SvgRing
              progress={totals.kcal / res.kcal}
              size={196}
              strokeWidth={7}
              color="#c8a96e"
              trackColor="#232329"
            >
              <div className="text-4xl font-bold text-[#e6d1a3] tabular-nums leading-none">
                {round0(gaps.kcal)}
              </div>
              <div className="text-xs text-[#96938a] mt-2 tabular-nums">
                kcal متبقّي
              </div>
            </SvgRing>
            <div className="mt-4 text-xs sm:text-sm text-[#96938a] tabular-nums">
              الهدف اليومي <b className="text-[#f3f1ec]">{round0(res.kcal)}</b> · المخطّط{' '}
              <b className="text-[#c8a96e]">{round0(totals.kcal)} kcal</b>
            </div>

            {/* 3 Disciplined Executive Macro Rings */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-5 border-t border-[#232329]">
              {[
                {
                  label: 'بروتين متبقٍ',
                  planned: totals.p,
                  target: res.fp,
                  rem: gaps.P,
                  ringColor: '#c8a96e',
                },
                {
                  label: 'كارب متبقٍ',
                  planned: totals.c,
                  target: res.C,
                  rem: gaps.C,
                  ringColor: '#6b9c7e',
                },
                {
                  label: 'دهون متبقية',
                  planned: totals.f,
                  target: res.F,
                  rem: gaps.F,
                  ringColor: '#a98c72',
                },
              ].map((m) => (
                <div key={m.label} className="py-2 px-1 flex flex-col items-center">
                  <SvgRing
                    progress={m.target > 0 ? m.planned / m.target : 0}
                    size={68}
                    strokeWidth={5}
                    color={m.ringColor}
                    trackColor="#232329"
                  >
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: m.ringColor }}
                    >
                      {round0(m.rem)}غ
                    </span>
                  </SvgRing>
                  <span className="text-[11px] text-[#96938a] mt-2 font-medium">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('jr')}
              className="touch-press min-h-[48px] bg-[#111114] border border-[#232329] hover:border-[#c8a96e]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer"
            >
              <Scale className="w-4 h-4 text-[#c8a96e]" />
              <span>سجّل وزنك</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="touch-press min-h-[48px] bg-[#111114] border border-[#232329] hover:border-[#c8a96e]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer"
            >
              <UtensilsCrossed className="w-4 h-4 text-[#c8a96e]" />
              <span>وجبات الغد</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('jr')}
              className="touch-press min-h-[48px] bg-[#111114] border border-[#232329] hover:border-[#c8a96e]/50 rounded-xl p-3 flex flex-col items-center gap-1.5 text-xs font-semibold text-[#f3f1ec] cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#c8a96e]" />
              <span>صور التقدم</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">
          {state.meals.length === 0 ? (
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-5 space-y-3">
              <div className="text-sm font-bold text-[#f3f1ec]">لم تخطّط وجبات الغد بعد</div>
              <p className="text-xs text-[#96938a] leading-relaxed">
                كوّن أطباقك مكونًا بمكون للوجبة الصباحية وبعد التمرين والعشاء قبل الساعة {cutoffLabel}.
              </p>
              <button
                type="button"
                onClick={() => onSelectMealSlot(0)}
                className="touch-press w-full min-h-[44px] py-3 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
              >
                ابدأ بالوجبة الأولى
              </button>
            </div>
          ) : gaps.P > 5 || gaps.C > 10 || gaps.F > 5 || gaps.kcal > 80 ? (
            <div className="bg-[#111114] border border-[#c8a96e]/40 rounded-2xl p-5 space-y-2.5">
              <div className="text-sm font-bold text-[#e6d1a3]">ما زال ينقصك لإتمام الهدف</div>
              <p className="text-xs text-[#f3f1ec] leading-relaxed tabular-nums">
                {gaps.P > 5 && <span>بروتين {round0(gaps.P)} غ · </span>}
                {gaps.C > 10 && <span>كارب {round0(gaps.C)} غ · </span>}
                {gaps.F > 5 && <span>دهون {round0(gaps.F)} غ · </span>}
                <span className="text-[#e6d1a3] font-bold">سعرات {round0(gaps.kcal)} kcal</span>
              </p>
              <button
                type="button"
                onClick={() => onNavigate('menu')}
                className="touch-press w-full min-h-[44px] py-2.5 rounded-xl bg-[#18181c] border border-[#232329] hover:border-[#c8a96e]/50 text-xs font-bold text-[#e6d1a3] cursor-pointer"
              >
                أكمل الفجوة من القائمة
              </button>
            </div>
          ) : (
            <div className="bg-[#111114] border border-[#6b9c7e]/45 rounded-2xl p-5">
              <div className="text-sm font-bold text-[#6b9c7e]">
                مخطّط وجباتك متوازن مع احتياجك اليومي
              </div>
              <p className="text-xs text-[#96938a] mt-1">
                يمكنك مراجعة التوزيع وتأكيد الطلب من السلة قبل الساعة {cutoffLabel}.
              </p>
            </div>
          )}

          {/* Daily Meal Distribution */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[#f3f1ec]">توزيع وجبات اليوم</h2>
              <button
                type="button"
                onClick={() => onNavigate('cart')}
                className="text-xs font-bold text-[#c8a96e] hover:underline cursor-pointer"
              >
                فتح السلة
              </button>
            </div>
            <MealSlotsSummary state={state} onSelectSlot={onSelectMealSlot} />
          </div>

          {latestOrder && (
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[#96938a]">آخر طلب محفوظ</div>
                <span
                  className={`text-xs font-bold ${
                    latestOrder.status === 'C'
                      ? 'text-[#6b9c7e]'
                      : latestOrder.status === 'W'
                        ? 'text-[#c89a56]'
                        : 'text-[#b86157]'
                  }`}
                >
                  {latestOrder.status === 'C'
                    ? 'مؤكد'
                    : latestOrder.status === 'W'
                      ? 'قائمة انتظار'
                      : 'ملغى'}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-sm font-bold text-[#f3f1ec]">
                  {formatArabicDate(latestOrder.date)} · {latestOrder.n} وجبات
                </div>
                <div className="text-sm font-bold text-[#e6d1a3] tabular-nums">
                  {latestOrder.total} دج
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
