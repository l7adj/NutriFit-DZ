import React, { useState } from 'react';
import { GOALS, PICKUP_POINTS, QUALITY_CHARTER } from '../data/seed';
import { AppState } from '../types';
import { calcNutrition, round1 } from '../utils/nutrition';
import { EquationTable } from './EquationTable';
import { Calculator, Download, MapPin, ShieldCheck, Trash2 } from 'lucide-react';

interface AccountViewProps {
  state: AppState;
  onReopenCalc: () => void;
  onResetAll: () => void;
  onToast: (msg: string) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  state,
  onReopenCalc,
  onResetAll,
  onToast,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [showBulletin, setShowBulletin] = useState(false);
  const [showCharter, setShowCharter] = useState(false);

  const res = calcNutrition(state);

  const handleExportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nutrifit-dz-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
      onToast('تم تصدير ملف البيانات JSON');
    } catch {
      onToast('تعذر تصدير البيانات');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#f3f1ec]">الحساب والملف الغذائي</h1>

      <div className="rounded-xl border border-[#c8a96e]/25 bg-[#18181c] px-4 py-3 text-[11px] leading-6 text-[#96938a]">
        <strong className="text-[#e6d1a3]">خصوصية البيانات:</strong>{' '}
        يُحفظ هذا الملف حالياً في تخزين المتصفح على هذا الجهاز فقط، بما فيه قياسات الجسم وإجابات بوابة السلامة. لا تستخدم جهازاً مشتركاً، ولا توجد مزامنة سحابية أو حساب محمي في نسخة المعاينة.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Profile + Scientific Calculator Equations */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-base font-bold text-[#f3f1ec]">
                {state.name || 'مشترك NutriFit DZ'}
              </div>
              <div className="text-xs text-[#96938a] mt-1 tabular-nums">
                {state.sex === 'm' ? 'ذكر' : 'أنثى'} · {state.age} سنة · {state.w} كغ · {state.h} سم ·{' '}
                <span className="text-[#c8a96e] font-bold">{GOALS[state.goal].label}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onReopenCalc}
              className="touch-press px-4 py-2 rounded-xl bg-[#18181c] border border-[#c8a96e]/50 text-xs font-bold text-[#e6d1a3] flex items-center gap-1.5 cursor-pointer hover:bg-[#1c1a15]"
            >
              <Calculator className="w-3.5 h-3.5" />
              الحاسبة العلمية
            </button>
          </div>

          {!res.err && <EquationTable state={state} result={res} />}
        </div>

        {/* Right: Pickup Points, Charter, Market Bulletin & Data */}
        <div className="lg:col-span-5 space-y-4">
          {/* Pickup Points */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#f3f1ec]">
              <MapPin className="w-4 h-4 text-[#c8a96e]" />
              <span>نقاط الاستلام والتغطية</span>
            </div>
            <div className="space-y-2">
              {PICKUP_POINTS.map((p) => (
                <div
                  key={p.name}
                  className="bg-[#18181c] border border-[#232329] rounded-xl p-3 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-[#f3f1ec]">{p.name}</div>
                    <div className="text-[11px] text-[#96938a] mt-0.5">
                      {p.area} · {p.hours}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-bold whitespace-nowrap ${
                      p.active ? 'text-[#6b9c7e]' : 'text-[#66645e]'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Charter (10 items) */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-2">
            <button
              type="button"
              onClick={() => setShowCharter((s) => !s)}
              className="touch-press w-full flex items-center justify-between text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#c8a96e]" />
                معايير الجودة المستهدفة (10 بنود)
              </span>
              <span className="text-xs text-[#c8a96e]">{showCharter ? 'إخفاء' : 'عرض'}</span>
            </button>
            {showCharter && (
              <>
                <p className="pt-2 border-t border-[#232329] text-[11px] leading-5 text-[#c89a56]">
                  هذه معايير تشغيل مستهدفة؛ لا يعني ظهورها أن إجراءات المطبخ أو التبريد أو التتبع مطبقة فعلياً في نسخة المعاينة.
                </p>
                <ol className="space-y-1.5 text-xs text-[#96938a]">
                {QUALITY_CHARTER.map((item, idx) => (
                  <li key={idx} className="flex gap-2">
                    <span className="font-bold text-[#c8a96e] w-5 shrink-0 tabular-nums">
                      {idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
                </ol>
              </>
            )}
          </div>

          {/* Weekly Frozen Market Price Bulletin */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-2">
            <button
              type="button"
              onClick={() => setShowBulletin((s) => !s)}
              className="touch-press w-full flex items-center justify-between text-sm font-bold text-[#f3f1ec] cursor-pointer"
            >
              <span>أسعار المكونات التجريبية</span>
              <span className="text-xs text-[#c8a96e]">{showBulletin ? 'إخفاء' : 'عرض الأسعار'}</span>
            </button>
            {showBulletin && (
              <>
                <p className="pt-2 border-t border-[#232329] text-[11px] leading-5 text-[#c89a56]">
                  الأسعار التالية أمثلة مبدئية للواجهة وليست أسعار سوق موثقة أو عروض شراء حالية.
                </p>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#232329]">
                {state.foods.map((f) => (
                  <div
                    key={f.id}
                    className={`py-2 flex items-center justify-between text-xs ${
                      f.available === false ? 'opacity-45' : ''
                    }`}
                  >
                    <span className="text-[#f3f1ec]">
                      {f.name}
                      {f.available === false && (
                        <span className="text-[#b86157] mr-1.5 text-[10px]">(متوقف)</span>
                      )}
                    </span>
                    <span className="text-[#c8a96e] font-bold tabular-nums">
                      {round1(f.price)} دج / 100{f.cat === 'juice' ? 'مل' : 'غ'}
                    </span>
                  </div>
                ))}
                </div>
              </>
            )}
          </div>

          {/* Export JSON & Reset Data */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-2.5">
            <div className="text-sm font-bold text-[#f3f1ec]">إدارة البيانات</div>
            <button
              type="button"
              onClick={handleExportJson}
              className="touch-press w-full py-2.5 rounded-xl bg-[#18181c] border border-[#232329] text-xs font-bold text-[#f3f1ec] flex items-center justify-center gap-2 hover:border-[#c8a96e]/50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#c8a96e]" />
              تصدير بياناتي (JSON)
            </button>

            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="touch-press w-full py-2.5 rounded-xl bg-[#1a1111] border border-[#3d2321] text-xs font-bold text-[#b86157] flex items-center justify-center gap-2 cursor-pointer hover:border-[#b86157]/60"
              >
                <Trash2 className="w-4 h-4" />
                تصفير جميع البيانات
              </button>
            ) : (
              <div className="bg-[#1a1111] border border-[#b86157] rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold text-[#f3f1ec]">
                  هل تؤكد تصفير الحساب والطلبات والسجل والعودة للإعدادات الأولية؟
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmReset(false);
                      onResetAll();
                    }}
                    className="touch-press py-2 rounded-lg bg-[#b86157] text-[#141108] text-xs font-bold cursor-pointer"
                  >
                    نعم، صفّر البيانات
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="touch-press py-2 rounded-lg bg-[#18181c] border border-[#232329] text-xs font-bold text-[#f3f1ec] cursor-pointer"
                  >
                    تراجع
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
