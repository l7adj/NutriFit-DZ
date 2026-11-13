import React from 'react';
import { GOALS } from '../data/seed';
import { AppState, CalcResult } from '../types';
import { round0, round1 } from '../utils/nutrition';

interface EquationTableProps {
  state: AppState;
  result: CalcResult;
}

const Tag: React.FC<{ code: 'F' | 'R' | 'O' | 'C'; title: string }> = ({ code, title }) => (
  <span
    title={title}
    className="inline-block text-[10px] leading-none border border-[#c8a96e]/50 text-[#c8a96e] rounded px-1 py-0.5 mr-1.5 align-middle tabular-nums"
  >
    {code}
  </span>
);

export const EquationTable: React.FC<EquationTableProps> = ({ state, result }) => {
  const goalInfo = GOALS[state.goal];
  const sexAdj = state.sex === 'm' ? '+ 5' : '− 161';
  const bmrFormula = result.kat
    ? `370 + 21.6 × ${state.lbm} كغ`
    : `10×${state.w} + 6.25×${state.h} − 5×${state.age} ${sexAdj}`;

  return (
    <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-[#f3f1ec]">تفصيل المعادلات العلمية</h3>
        <span className="text-[11px] text-[#96938a] tabular-nums">
          BMI {round1(result.bmi)}
        </span>
      </div>

      <div className="divide-y divide-[#232329] text-xs sm:text-[13px]">
        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              معدل الأيض في الراحة (RMR · {result.kat ? 'Katch-McArdle' : 'Mifflin-St Jeor'})
              <Tag code="F" title="Mifflin et al., 1990؛ أو Katch-McArdle عند وجود LBM مقاس" />
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums" dir="ltr">
              {bmrFormula}
            </div>
          </div>
          <div className="font-bold text-[#e6d1a3] whitespace-nowrap tabular-nums">
            {round0(result.bmr)} kcal
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              الاحتياج اليومي الكلي (TDEE)
              {state.band === 'S' ? (
                <Tag code="C" title="نطاق خمول منخفض جداً افتراض تشغيلي يحتاج معايرة؛ ليس من نطاقات PAL المرجعية المعتمدة هنا" />
              ) : (
                <>
                  <Tag code="R" title="نطاق مرجعي FAO/WHO/UNU 2004" />
                  <Tag code="O" title="معامل النشاط المحدد داخل النطاق" />
                </>
              )}
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums">
              {round0(result.bmr)} × معامل النشاط {state.pal.toFixed(2)}
            </div>
          </div>
          <div className="font-bold text-[#f3f1ec] whitespace-nowrap tabular-nums">
            {round0(result.tdee)} kcal
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              الهدف اليومي ({goalInfo.label})
              <Tag code="O" title="معامل هدف تشغيلي" />
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums">
              {round0(result.tdee)} × {(1 + state.pct / 100).toFixed(2)} ({state.pct >= 0 ? `+${state.pct}` : state.pct}%)
            </div>
          </div>
          <div className="font-bold text-[#c8a96e] whitespace-nowrap tabular-nums">
            {round0(result.kcal)} kcal
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              البروتين الكلي
              <Tag code="R" title="نطاقات ISSN Position Stand (2017)" /><Tag code="O" title="الاختيار الافتراضي داخل النطاق حسب الهدف" />
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums">
              {result.pg.toFixed(2)} غ/كغ × {result.kat && state.goal === 'cut' ? `${state.lbm} كغ LBM` : `${state.w} كغ`}
            </div>
          </div>
          <div className="font-bold text-[#f3f1ec] whitespace-nowrap tabular-nums">
            {round0(result.P)} غ
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              الدهون الأساسية (25% من الطاقة)
              <Tag code="R" title="النطاق المقبول IOM DRI 2005: 20–35%" /><Tag code="O" title="الاختيار الافتراضي 25%" />
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums">
              ({round0(result.kcal)} × 0.25) ÷ 9
            </div>
          </div>
          <div className="font-bold text-[#f3f1ec] whitespace-nowrap tabular-nums">
            {round0(result.F)} غ
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              الكربوهيدرات (باقي الطاقة بعد البروتين والدهون)
              <Tag code="F" title="باقي الطاقة ÷ 4 kcal لكل غرام كربوهيدرات وفق Atwater" />
            </div>
            <div className="text-[11px] text-[#96938a] mt-0.5 tabular-nums">
              {result.cg.toFixed(1)} غ/كغ من وزن الجسم
            </div>
          </div>
          <div className="font-bold text-[#f3f1ec] whitespace-nowrap tabular-nums">
            {round0(result.C)} غ
          </div>
        </div>

        <div className="py-2.5 flex items-start justify-between gap-3">
          <div>
            <div className="text-[#f3f1ec] font-semibold">
              الألياف الغذائية
              <Tag code="R" title="توصية WHO 2023" />
            </div>
          </div>
          <div className="font-bold text-[#f3f1ec] whitespace-nowrap tabular-nums">
            {result.fiber}+ غ
          </div>
        </div>
      </div>

      {state.sup && (
        <div className="bg-[#18181c] border border-[#232329] rounded-xl p-3 text-xs text-[#96938a]">
          <span className="text-[#f3f1ec] font-semibold">مكمل البروتين: </span>
          {round0(result.sc)} غ ({round0(result.sp)}% — {result.ev})
          <Tag code="C" title="سقف 50% افتراض يحتاج معايرة" />
          <span className="mx-1">·</span>
          المطلوب من الطعام الحقيقي: <b className="text-[#e6d1a3] tabular-nums">{round0(result.fp)} غ</b>
        </div>
      )}

      {result.warn.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {result.warn.map((w, idx) => (
            <div
              key={idx}
              className="bg-[#18181c] border border-[#c8a96e]/40 rounded-xl px-3 py-2 text-xs text-[#e6d1a3]"
            >
              تنبيه علمي: {w}
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-[#66645e] leading-relaxed pt-1.5 border-t border-[#232329]">
        F معادلة منشورة · R نطاق مرجعي (FAO/WHO/UNU, ACSM, WHO) · O قيمة تشغيلية (ISSN, IOM) · C افتراض يحتاج معايرة أسبوعية. هذه الأرقام تقديرية وليست بديلًا عن الطبيب.
      </div>
    </div>
  );
};
