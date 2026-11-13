import React from 'react';
import { ACTIVITY_BANDS, ALLERGENS, GOALS } from '../data/seed';
import { ActivityBand, AllergenKey, AppState, GoalType, SafetyFlags } from '../types';
import { bandRangeText, calcNutrition, round0, round2, safetyGateError } from '../utils/nutrition';
import { EquationTable } from './EquationTable';
import { SvgRing } from './SvgRing';
import { AlertTriangle, ArrowRight, Check, ShieldAlert } from 'lucide-react';

interface CalculatorWizardProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onFinish: () => void;
}

const Stepper: React.FC<{
  label: string;
  value: number;
  unit: string;
  step: number;
  min?: number;
  max?: number;
  onChange: (val: number) => void;
}> = ({ label, value, unit, step, min = 0, max = 500, onChange }) => (
  <div className="mt-3">
    <label className="block text-xs font-semibold text-[#96938a] mb-1.5">{label}</label>
    <div className="flex items-center bg-[#18181c] border border-[#232329] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, round2(value - step)))}
        className="touch-press w-14 h-12 flex items-center justify-center text-xl font-bold text-[#c8a96e] hover:bg-[#1c1a15] cursor-pointer"
        aria-label={`إنقاص ${label}`}
      >
        −
      </button>
      <div className="flex-1 text-center py-1">
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            onChange(Number.isNaN(v) ? 0 : Math.min(max, v));
          }}
          className="w-full bg-transparent border-0 text-center font-num text-xl font-bold text-[#f3f1ec] focus:outline-none tabular-nums"
        />
        <span className="block text-[10px] text-[#66645e] -mt-1">{unit}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, round2(value + step)))}
        className="touch-press w-14 h-12 flex items-center justify-center text-xl font-bold text-[#c8a96e] hover:bg-[#1c1a15] cursor-pointer"
        aria-label={`زيادة ${label}`}
      >
        +
      </button>
    </div>
  </div>
);

export const CalculatorWizard: React.FC<CalculatorWizardProps> = ({
  state,
  onUpdate,
  onFinish,
}) => {
  const step = state.ob;
  const gateErr = safetyGateError(state);
  const res = calcNutrition(state);

  const setStep = (n: number) => onUpdate((prev) => ({ ...prev, ob: n }));

  const toggleFlag = (key: keyof SafetyFlags) =>
    onUpdate((prev) => ({
      ...prev,
      fl: { ...prev.fl, [key]: !prev.fl[key] },
    }));

  const toggleAllergen = (key: AllergenKey) =>
    onUpdate((prev) => {
      const exists = prev.al.includes(key);
      const nextAl = exists ? prev.al.filter((a) => a !== key) : [...prev.al, key];
      return { ...prev, al: nextAl };
    });

  const bmi = state.h > 0 ? state.w / Math.pow(state.h / 100, 2) : 0;

  if (step === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <div className="text-center space-y-3 mb-8">
          <div className="text-xs font-semibold text-[#c8a96e] tracking-wide">
            الجزائر · معاينة تفاعلية
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#f3f1ec] text-balance">
            NutriFit DZ
          </h1>
          <p className="text-base sm:text-lg text-[#e6d1a3] font-semibold max-w-md mx-auto text-balance">
            يحسب احتياجك بالغرام، يطبخ وجباتك، ويوصلها لبابك صباحًا.
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-[#c8a96e]/25 bg-[#18181c] px-4 py-3 text-[11px] leading-6 text-[#96938a]">
          <strong className="text-[#e6d1a3]">نسخة معاينة:</strong>{' '}
          هذه الواجهة تختبر رحلة العميل والحسابات محلياً. لم تُربط بعد بخدمة طلبات أو مطبخ أو توصيل مباشر.
        </div>

        <div className="bg-[#111114] border border-[#232329] rounded-2xl p-5 space-y-4 mb-6">
          <div className="text-sm font-bold text-[#f3f1ec]">الرحلة الكاملة في نظام واحد</div>
          <div className="space-y-3 text-sm text-[#96938a] leading-relaxed">
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#c8a96e] tabular-nums">01</span>
              <span>حاسبة علمية شفافة بالمعادلات المنشورة مع بوابة سلامة طبية.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#c8a96e] tabular-nums">02</span>
              <span>تختار وجباتك ومكوناتك بالغرام، وتوزعها على يومك كما تشاء.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#c8a96e] tabular-nums">03</span>
              <span>تُحدّد نافذة التحضير والتوصيل في ملف التشغيل بعد اعتماد المنطقة والطاقة اليومية.</span>
            </div>
            <div className="flex gap-3">
              <span className="font-num font-bold text-[#c8a96e] tabular-nums">04</span>
              <span>هيكل تكلفة قابل للتفصيل: مكونات + مناولة + خدمة + توصيل، وتُعتمد الأسعار الفعلية من الإدارة.</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="touch-press w-full py-3.5 px-6 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] hover:brightness-105 cursor-pointer"
          >
            ابدأ الحاسبة العلمية
          </button>
        </div>

        <p className="text-center text-[11px] text-[#66645e] mt-5">
          أداة تغذية رياضية محسوبة، وليست بديلًا عن الاستشارة الطبية المتخصصة.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-16">
      <div className="flex items-center gap-1.5 mb-6" aria-label="تقدم الخطوات">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-colors ${
              i <= step ? 'bg-[#c8a96e]' : 'bg-[#232329]'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#f3f1ec]">أولًا: بوابة السلامة</h2>
            <p className="text-xs text-[#96938a] mt-1">
              سلامتك أولوية قصوى قبل أي حسابات. لا نصدر خططًا آلية في الحالات الخاصة.
            </p>
          </div>

          <div className="rounded-xl border border-[#c8a96e]/25 bg-[#18181c] px-3 py-2.5 text-[11px] leading-5 text-[#96938a]">
            <strong className="text-[#e6d1a3]">تنبيه الخصوصية:</strong>{' '}
            بيانات القياسات وإجابات السلامة تُحفظ محلياً في هذا المتصفح فقط. لا توجد مزامنة أو حساب محمي في نسخة المعاينة؛ تجنب إدخال بيانات حساسة على جهاز مشترك.
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <label className="block text-xs font-semibold text-[#96938a] mb-1.5">
              الاسم أو اللقب (يُطبع على العلبة)
            </label>
            <input
              type="text"
              value={state.name}
              onChange={(e) => onUpdate((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-[#18181c] border border-[#232329] rounded-xl px-3 py-2.5 text-sm text-[#f3f1ec] focus:border-[#c8a96e] outline-none"
              placeholder="مثال: أمين بن علي"
            />
            <Stepper
              label="العمر"
              value={state.age}
              unit="سنة"
              step={1}
              min={18}
              max={100}
              onChange={(age) => onUpdate((prev) => ({ ...prev, age }))}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#96938a]">هل ينطبق عليك أي مما يلي؟</div>
            {(
              [
                ['preg', 'حمل أو رضاعة طبيعية'],
                ['kid', 'مرض كلوي معروف'],
                ['dia', 'داء السكري أو أدوية خافضة للسكر'],
                ['ed', 'تاريخ مع اضطرابات الأكل'],
              ] as [keyof SafetyFlags, string][]
            ).map(([key, label]) => {
              const active = state.fl[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleFlag(key)}
                  className={`touch-press w-full flex items-center justify-between px-4 py-3 rounded-xl border text-right text-sm font-semibold cursor-pointer ${
                    active
                      ? 'bg-[#1a1111] border-[#b86157] text-[#f3f1ec]'
                      : 'bg-[#111114] border-[#232329] text-[#f3f1ec] hover:border-[#c8a96e]/40'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                      active ? 'bg-[#b86157] border-[#b86157] text-[#141108]' : 'border-[#66645e]'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5" />}
                  </span>
                </button>
              );
            })}
          </div>

          {gateErr && (
            <div className="bg-[#1a1111] border border-[#b86157]/60 rounded-2xl p-4 flex gap-3 items-start text-xs text-[#f3f1ec]">
              <ShieldAlert className="w-5 h-5 text-[#b86157] shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-[#b86157] mb-1">حجب آلي للسلامة</div>
                {gateErr}
              </div>
            </div>
          )}
          {!state.name.trim() && (
            <p className="text-[11px] text-[#c89a56]">أدخل الاسم أو اللقب الذي سيظهر على ملفك قبل المتابعة.</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="touch-press px-4 py-3 rounded-xl bg-[#18181c] border border-[#232329] text-sm font-bold text-[#f3f1ec] flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </button>
            <button
              type="button"
              disabled={Boolean(gateErr) || !state.name.trim()}
              onClick={() => setStep(2)}
              className="touch-press flex-1 py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] disabled:opacity-40 cursor-pointer"
            >
              التالي: قياسات الجسم
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f3f1ec]">قياسات الجسم</h2>
          <div className="rounded-xl border border-[#c8a96e]/25 bg-[#18181c] px-3 py-2.5 text-[11px] leading-5 text-[#96938a]">
            القيم الظاهرة مبدئياً أمثلة للمعاينة فقط. أدخل قياساتك الحقيقية قبل اعتماد أي نتيجة.
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['m', 'ذكر'],
                ['f', 'أنثى'],
              ] as const
            ).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => onUpdate((prev) => ({ ...prev, sex: val }))}
                className={`touch-press py-3 rounded-xl border text-sm font-bold cursor-pointer ${
                  state.sex === val
                    ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                    : 'bg-[#111114] border-[#232329] text-[#96938a]'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <Stepper
              label="الطول"
              value={state.h}
              unit="سم"
              step={1}
              min={120}
              max={230}
              onChange={(h) => onUpdate((prev) => ({ ...prev, h }))}
            />
            <Stepper
              label="الوزن الحالي"
              value={state.w}
              unit="كغ"
              step={0.5}
              min={30}
              max={300}
              onChange={(w) => onUpdate((prev) => ({ ...prev, w }))}
            />
            <Stepper
              label="الوزن المستهدف (للجورنال)"
              value={state.targetWeight}
              unit="كغ"
              step={0.5}
              min={35}
              max={250}
              onChange={(targetWeight) => onUpdate((prev) => ({ ...prev, targetWeight }))}
            />
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <div className="text-sm font-bold text-[#c8a96e]">
              الكتلة الخالية من الدهون LBM (اختياري)
            </div>
            <p className="text-xs text-[#96938a] mt-1">
              أدخله فقط إذا كان لديك قياس موثوق مثل DEXA أو InBody بنسبة موثوقية 70% فأكثر لتفعيل معادلة Katch-McArdle.
            </p>
            <Stepper
              label="LBM"
              value={state.lbm}
              unit="كغ (اتركه 0 إن لم يتوفر)"
              step={0.5}
              min={0}
              max={150}
              onChange={(lbm) => onUpdate((prev) => ({ ...prev, lbm }))}
            />
            {state.lbm > 0 && (
              <>
                <div className="mt-2">
                  <label className="text-xs text-[#96938a]">طريقة قياس LBM</label>
                  <select
                    value={state.lbmMethod ?? 'none'}
                    onChange={(e) => onUpdate((prev) => ({
                      ...prev,
                      lbmMethod: e.target.value as 'none' | 'dexa' | 'inbody' | 'other',
                    }))}
                    className="mt-1 w-full rounded-xl border border-[#232329] bg-[#18181c] px-3 py-2.5 text-xs text-[#f3f1ec]"
                  >
                    <option value="none">لم أحدد / غير موثق</option>
                    <option value="dexa">DEXA</option>
                    <option value="inbody">InBody</option>
                    <option value="other">قياس آخر موثق</option>
                  </select>
                </div>
                <Stepper
                  label="موثوقية القياس"
                  value={state.rel}
                  unit="%"
                  step={5}
                  min={0}
                  max={100}
                  onChange={(rel) => onUpdate((prev) => ({ ...prev, rel }))}
                />
                {(!state.lbmMethod || state.lbmMethod === 'none' || state.rel < 70) && (
                  <p className="text-[10px] leading-5 text-[#c89a56] mt-1">
                    ستُستخدم معادلة Mifflin حتى توثّق طريقة قياس LBM وتكون موثوقيتها 70% فأكثر.
                  </p>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="touch-press px-4 py-3 rounded-xl bg-[#18181c] border border-[#232329] text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="touch-press flex-1 py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
            >
              التالي: مستوى النشاط
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#f3f1ec]">مستوى النشاط (4 نطاقات)</h2>
            <p className="text-xs text-[#96938a] mt-1">
              اختر النطاق الأقرب لأسبوعك ثم اضبط المعامل بدقة وفق مرجع FAO/WHO/UNU 2004.
            </p>
          </div>

          <div className="space-y-2">
            {(Object.keys(ACTIVITY_BANDS) as ActivityBand[]).map((key) => {
              const band = ACTIVITY_BANDS[key];
              const active = state.band === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, band: key, pal: band.def }))
                  }
                  className={`touch-press w-full text-right p-3.5 rounded-xl border cursor-pointer ${
                    active
                      ? 'bg-[#1c1a15] border-[#c8a96e]'
                      : 'bg-[#111114] border-[#232329] hover:border-[#c8a96e]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f3f1ec]">{band.label}</span>
                    <span className="font-num text-xs font-bold text-[#c8a96e] tabular-nums">
                      {bandRangeText(key)}
                    </span>
                  </div>
                  <div className="text-xs text-[#96938a] mt-1">{band.desc}</div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#96938a] font-semibold">ضبط دقيق للمعامل</span>
              <span className="font-num text-base font-bold text-[#e6d1a3] tabular-nums">
                {state.pal.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={ACTIVITY_BANDS[state.band].min}
              max={ACTIVITY_BANDS[state.band].max}
              step={0.01}
              value={state.pal}
              onChange={(e) =>
                onUpdate((prev) => ({ ...prev, pal: parseFloat(e.target.value) }))
              }
              className="w-full accent-[#c8a96e] cursor-pointer"
            />
            <div className="flex justify-between font-num text-[10px] text-[#66645e] mt-1 tabular-nums">
              <span>{ACTIVITY_BANDS[state.band].min.toFixed(2)}</span>
              <span>{ACTIVITY_BANDS[state.band].max.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="touch-press px-4 py-3 rounded-xl bg-[#18181c] border border-[#232329] text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="touch-press flex-1 py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
            >
              التالي: الهدف والحساسيات
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[#f3f1ec]">الهدف والحساسيات</h2>

          <div className="space-y-2">
            {(Object.keys(GOALS) as GoalType[]).map((key) => {
              const g = GOALS[key];
              const blockedByBmi = key === 'cut' && bmi < 18.5;
              const active = state.goal === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={blockedByBmi}
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, goal: key, pct: g.pct }))
                  }
                  className={`touch-press w-full text-right p-3.5 rounded-xl border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? 'bg-[#1c1a15] border-[#c8a96e]'
                      : 'bg-[#111114] border-[#232329] hover:border-[#c8a96e]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#f3f1ec]">{g.label}</span>
                    <span className="font-num text-xs font-bold text-[#c8a96e] tabular-nums">
                      {g.multLabel} · {g.proteinPerKg}غ/كغ
                    </span>
                  </div>
                  <div className="text-xs text-[#96938a] mt-1">
                    {blockedByBmi ? 'محجوب لأن BMI أقل من 18.5' : g.desc}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <Stepper
              label="تعديل نسبة الفائض أو العجز (حد الأمان ±25%)"
              value={state.pct}
              unit="%"
              step={1}
              min={-25}
              max={25}
              onChange={(pct) => onUpdate((prev) => ({ ...prev, pct }))}
            />
          </div>

          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="text-xs font-bold text-[#c8a96e]">الحساسيات الغذائية</div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(ALLERGENS) as AllergenKey[]).map((k) => {
                const on = state.al.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggleAllergen(k)}
                    className={`touch-press px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                      on
                        ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                        : 'bg-[#18181c] border-[#232329] text-[#96938a]'
                    }`}
                  >
                    {on ? `✓ ${ALLERGENS[k]}` : ALLERGENS[k]}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-[#232329]">
              <div className="text-xs font-bold text-[#c8a96e] mb-2">
                مكمل البروتين (اختياري)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate((prev) => ({ ...prev, sup: false }))}
                  className={`touch-press py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    !state.sup
                      ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                      : 'bg-[#18181c] border-[#232329] text-[#96938a]'
                  }`}
                >
                  لا أستخدم مكملًا
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate((prev) => ({ ...prev, sup: true }))}
                  className={`touch-press py-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                    state.sup
                      ? 'bg-[#1c1a15] border-[#c8a96e] text-[#e6d1a3]'
                      : 'bg-[#18181c] border-[#232329] text-[#96938a]'
                  }`}
                >
                  أستخدم مكمل بروتين
                </button>
              </div>
              {state.sup && (
                <Stepper
                  label="كمية البروتين الصافي من المكمل يوميًا"
                  value={state.supg}
                  unit="غ / يوم (يُخصم من حاجة الطعام)"
                  step={5}
                  min={0}
                  max={150}
                  onChange={(supg) => onUpdate((prev) => ({ ...prev, supg }))}
                />
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="touch-press px-4 py-3 rounded-xl bg-[#18181c] border border-[#232329] text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              رجوع
            </button>
            <button
              type="button"
              onClick={() => setStep(5)}
              className="touch-press flex-1 py-3 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
            >
              احسب احتياجي العلمي
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4">
          {res.err ? (
            <div className="bg-[#1a1111] border border-[#b86157] rounded-2xl p-4 flex gap-3 text-sm text-[#f3f1ec]">
              <AlertTriangle className="w-5 h-5 text-[#b86157] shrink-0" />
              <div>{res.err}</div>
            </div>
          ) : (
            <>
              <div className="text-center py-2">
                <div className="text-xs font-semibold text-[#96938a] mb-2">احتياجك اليومي المستهدف</div>
                <SvgRing progress={1} size={184} strokeWidth={8} color="#c8a96e" trackColor="#232329">
                  <div className="text-4xl font-bold text-[#e6d1a3] tabular-nums">
                    {round0(res.kcal)}
                  </div>
                  <div className="text-xs text-[#96938a]">kcal / يوم</div>
                </SvgRing>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#111114] border border-[#232329] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.P)} غ
                  </div>
                  <div className="text-[11px] text-[#96938a]">بروتين</div>
                </div>
                <div className="bg-[#111114] border border-[#232329] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.C)} غ
                  </div>
                  <div className="text-[11px] text-[#96938a]">كارب</div>
                </div>
                <div className="bg-[#111114] border border-[#232329] rounded-2xl p-3 text-center">
                  <div className="text-xl font-bold text-[#f3f1ec] tabular-nums">
                    {round0(res.F)} غ
                  </div>
                  <div className="text-[11px] text-[#96938a]">دهون</div>
                </div>
              </div>

              <EquationTable state={state} result={res} />
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="touch-press px-4 py-3 rounded-xl bg-[#18181c] border border-[#232329] text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              تعديل
            </button>
            <button
              type="button"
              disabled={Boolean(res.err)}
              onClick={onFinish}
              className="touch-press flex-1 py-3.5 rounded-xl font-bold text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] disabled:opacity-40 cursor-pointer"
            >
              ادخل إلى التطبيق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
