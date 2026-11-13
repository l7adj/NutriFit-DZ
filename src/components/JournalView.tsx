import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { compressProgressImage } from '../utils/image';
import {
  addDays,
  algiersNow,
  formatArabicDate,
  round1,
  suggestWeeklyCalibration,
} from '../utils/nutrition';
import { Camera, Check, Trash2, TrendingDown, TrendingUp } from 'lucide-react';

interface JournalViewProps {
  state: AppState;
  onUpdate: (updater: (prev: AppState) => AppState) => void;
  onToast: (msg: string) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({
  state,
  onUpdate,
  onToast,
}) => {
  const [weightInput, setWeightInput] = useState<string>(String(state.w));
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [uploading, setUploading] = useState(false);

  const today = algiersNow().d;

  const sortedAll = useMemo(
    () => [...state.jr].sort((a, b) => (a.d < b.d ? -1 : 1)),
    [state.jr]
  );

  const chartEntries = useMemo(() => {
    if (state.chartRange === 'all') return sortedAll;
    const days = state.chartRange === '1m' ? 30 : 90;
    const cutoff = addDays(today, -days);
    return sortedAll.filter((e) => e.d >= cutoff);
  }, [sortedAll, state.chartRange, today]);

  const calibration = useMemo(() => suggestWeeklyCalibration(state), [state]);

  const handleSaveWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val < 30 || val > 300) {
      onToast('أدخل وزنًا صحيحًا بين 30 و300 كغ');
      return;
    }
    onUpdate((prev) => {
      const filtered = prev.jr.filter((e) => e.d !== today);
      return {
        ...prev,
        w: val,
        jr: [...filtered, { d: today, w: round1(val) }],
      };
    });
    onToast('تم تسجيل وزن اليوم');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressProgressImage(file);
      const newPhoto = {
        id: `ph_${Date.now()}`,
        date: today,
        weight: state.w,
        dataUrl,
      };
      onUpdate((prev) => ({
        ...prev,
        photos: [newPhoto, ...prev.photos],
      }));
      onToast('تم حفظ صورة التقدم (مضغوطة 900px)');
    } catch {
      onToast('تعذر معالجة الصورة');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const firstWeight = sortedAll.length > 0 ? sortedAll[0].w : state.w;
  const currentWeight = sortedAll.length > 0 ? sortedAll[sortedAll.length - 1].w : state.w;
  const deltaStart = round1(currentWeight - firstWeight);

  // SVG Chart Geometry
  const chartW = 540;
  const chartH = 180;
  const padX = 22;
  const padY = 18;
  const allVals = [...chartEntries.map((e) => e.w), state.targetWeight];
  const minW = allVals.length ? Math.min(...allVals) - 0.8 : 75;
  const maxW = allVals.length ? Math.max(...allVals) + 0.8 : 85;
  const span = Math.max(1, maxW - minW);

  const getY = (w: number) =>
    chartH - padY - ((w - minW) / span) * (chartH - padY * 2);
  const getX = (i: number, len: number) =>
    len <= 1 ? chartW / 2 : padX + (i / (len - 1)) * (chartW - padX * 2);

  const pointsStr = chartEntries
    .map((e, i) => `${getX(i, chartEntries.length)},${getY(e.w)}`)
    .join(' ');
  const targetY = getY(state.targetWeight);

  const photoA = state.photos.find((p) => p.id === compareIds[0]);
  const photoB = state.photos.find((p) => p.id === compareIds[1]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-[#f3f1ec]">الجورنال وتطور الجسم</h1>
        <div className="flex items-center gap-2 text-xs text-[#96938a]">
          <span>الوزن المستهدف:</span>
          <input
            type="number"
            step="0.5"
            value={state.targetWeight}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (v >= 35 && v <= 250) {
                onUpdate((prev) => ({ ...prev, targetWeight: v }));
              }
            }}
            className="w-16 bg-[#111114] border border-[#232329] rounded-lg px-2 py-1 text-center font-num font-bold text-[#c8a96e] tabular-nums focus:border-[#c8a96e] outline-none"
          />
          <span>كغ</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Weight Logger + SVG Chart + History */}
        <div className="lg:col-span-7 space-y-4">
          {/* Log Today's Weight */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
            <label className="block text-xs font-bold text-[#96938a] mb-2">
              تسجيل وزن اليوم ({formatArabicDate(today)})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                className="flex-1 bg-[#18181c] border border-[#232329] rounded-xl px-3.5 py-2.5 font-num text-base font-bold text-[#f3f1ec] tabular-nums focus:border-[#c8a96e] outline-none"
                placeholder={String(state.w)}
              />
              <button
                type="button"
                onClick={handleSaveWeight}
                className="touch-press px-6 py-2.5 rounded-xl font-bold text-sm text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
              >
                حفظ
              </button>
            </div>
          </div>

          {/* Current Stats + SVG Weight Chart */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-[#96938a]">الوزن الحالي</div>
                <div className="font-num text-3xl sm:text-4xl font-bold text-[#f3f1ec] tabular-nums mt-0.5">
                  {currentWeight} <span className="text-sm font-normal text-[#96938a]">كغ</span>
                </div>
              </div>
              <div className="text-left">
                <div className="text-xs text-[#96938a]">الفرق منذ البداية</div>
                <div
                  className={`font-num text-base font-bold flex items-center justify-end gap-1 mt-0.5 tabular-nums ${
                    deltaStart <= 0 ? 'text-[#6b9c7e]' : 'text-[#c89a56]'
                  }`}
                >
                  {deltaStart <= 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  {deltaStart > 0 ? `+${deltaStart}` : deltaStart} كغ
                </div>
              </div>
            </div>

            {/* Range Switcher */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-1 p-1 bg-[#18181c] border border-[#232329] rounded-xl">
                {(
                  [
                    ['1m', 'شهر'],
                    ['3m', '3 أشهر'],
                    ['all', 'الكل'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onUpdate((prev) => ({ ...prev, chartRange: key }))}
                    className={`touch-press px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                      state.chartRange === key
                        ? 'bg-[#1c1a15] text-[#e6d1a3]'
                        : 'text-[#96938a] hover:text-[#f3f1ec]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {hoverIdx !== null && chartEntries[hoverIdx] && (
                <div className="font-num text-xs text-[#e6d1a3] font-bold tabular-nums">
                  {formatArabicDate(chartEntries[hoverIdx].d)}: {chartEntries[hoverIdx].w} كغ
                </div>
              )}
            </div>

            {/* SVG Line Chart with Target Line */}
            {chartEntries.length > 0 ? (
              <div className="w-full overflow-hidden" dir="ltr">
                <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto block">
                  <defs>
                    <linearGradient id="nfWeightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c8a96e" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#c8a96e" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Target Weight Line */}
                  <line
                    x1={padX}
                    y1={targetY}
                    x2={chartW - padX}
                    y2={targetY}
                    stroke="#6b9c7e"
                    strokeWidth="1.5"
                    strokeDasharray="5 5"
                  />
                  <text
                    x={chartW - padX}
                    y={targetY - 6}
                    textAnchor="end"
                    fill="#6b9c7e"
                    fontSize="11"
                  >
                    هدف {state.targetWeight} كغ
                  </text>

                  {/* Area + Polyline */}
                  {chartEntries.length > 1 && (
                    <>
                      <polygon
                        fill="url(#nfWeightGrad)"
                        points={`${getX(0, chartEntries.length)},${chartH - padY} ${pointsStr} ${getX(
                          chartEntries.length - 1,
                          chartEntries.length
                        )},${chartH - padY}`}
                      />
                      <polyline
                        fill="none"
                        stroke="#c8a96e"
                        strokeWidth="2.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        points={pointsStr}
                      />
                    </>
                  )}

                  {/* Data Points */}
                  {chartEntries.map((e, i) => {
                    const cx = getX(i, chartEntries.length);
                    const cy = getY(e.w);
                    const active = hoverIdx === i;
                    return (
                      <g
                        key={e.d}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoverIdx(i)}
                        onClick={() => setHoverIdx(i)}
                      >
                        <circle cx={cx} cy={cy} r={14} fill="transparent" />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={active ? 5 : 3.2}
                          fill={active ? '#e6d1a3' : '#c8a96e'}
                          stroke="#09090b"
                          strokeWidth="1.5"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>
            ) : (
              <div className="text-xs text-[#66645e] py-6 text-center">
                سجّل قياسين على الأقل لعرض المنحنى البياني.
              </div>
            )}
          </div>

          {/* Recent Measurements Table */}
          {sortedAll.length > 0 && (
            <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5">
              <h2 className="text-sm font-bold text-[#f3f1ec] mb-2">سجل القياسات</h2>
              <div className="divide-y divide-[#232329] max-h-60 overflow-y-auto">
                {[...sortedAll].reverse().map((e) => (
                  <div
                    key={e.d}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <span className="text-[#96938a]">{formatArabicDate(e.d)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-num font-bold text-[#f3f1ec] tabular-nums">
                        {e.w} كغ
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdate((prev) => ({
                            ...prev,
                            jr: prev.jr.filter((x) => x.d !== e.d),
                          }))
                        }
                        className="touch-press text-[#66645e] hover:text-[#b86157] cursor-pointer"
                        aria-label="حذف القياس"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Smart Weekly Calibration + Progress Photos */}
        <div className="lg:col-span-5 space-y-4">
          {/* Weekly Adherence + Smart Linear Regression Calibration */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#c8a96e]">
                المعايرة الأسبوعية الذكية (انحدار 28 يومًا)
              </h2>
              <span className="font-num text-[10px] border border-[#c8a96e]/50 text-[#c8a96e] rounded px-1.5 py-0.5 tabular-nums">
                C
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#96938a]">نسبة الالتزام الأسبوعي بالخطة</span>
                <span className="font-num font-bold text-[#e6d1a3] tabular-nums">
                  {state.adh}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={state.adh}
                onChange={(e) =>
                  onUpdate((prev) => ({ ...prev, adh: Number(e.target.value) }))
                }
                className="w-full accent-[#c8a96e] cursor-pointer"
              />
              <div className="text-[11px] text-[#66645e] mt-1">
                لا يُقترح أي تغيير في السعرات إذا كان الالتزام أقل من 80%.
              </div>
            </div>

            {calibration.rateKgPerWeek !== null && (
              <div className="bg-[#18181c] border border-[#232329] rounded-xl p-3 flex justify-between text-xs font-num tabular-nums">
                <span className="text-[#96938a]">المعدل المحسوب (28 يومًا):</span>
                <span className="font-bold text-[#f3f1ec]">
                  {calibration.rateKgPerWeek > 0 ? '+' : ''}
                  {calibration.rateKgPerWeek} كغ / أسبوع
                </span>
              </div>
            )}

            <p className="text-xs text-[#f3f1ec] leading-relaxed bg-[#18181c] border border-[#232329] rounded-xl p-3">
              {calibration.reason}
            </p>

            {calibration.canSuggest && state.calDismissedDate !== today && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onUpdate((prev) => ({
                      ...prev,
                      pct: prev.pct + calibration.deltaPct,
                      cal: [
                        ...prev.cal,
                        {
                          d: today,
                          deltaPct: calibration.deltaPct,
                          rateKgPerWeek: calibration.rateKgPerWeek || 0,
                        },
                      ],
                    }));
                    onToast(`تم اعتماد تعديل ${calibration.deltaPct > 0 ? '+' : ''}${calibration.deltaPct}%`);
                  }}
                  className="touch-press py-2.5 rounded-xl font-bold text-xs text-[#141108] bg-gradient-to-l from-[#e6d1a3] to-[#c8a96e] cursor-pointer"
                >
                  اعتماد ({calibration.deltaPct > 0 ? '+5%' : '−5%'})
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate((prev) => ({ ...prev, calDismissedDate: today }))
                  }
                  className="touch-press py-2.5 rounded-xl font-bold text-xs text-[#96938a] bg-[#18181c] border border-[#232329] cursor-pointer"
                >
                  تجاهل اليوم
                </button>
              </div>
            )}
          </div>

          {/* Progress Photos (900px, JPEG 0.72) */}
          <div className="bg-[#111114] border border-[#232329] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[#f3f1ec]">صور التقدم</h2>
                <div className="text-[11px] text-[#96938a]">
                  ضغط تلقائي محلي (900px · JPEG 0.72)
                </div>
              </div>
              <label className="touch-press px-3.5 py-2 rounded-xl bg-[#18181c] border border-[#c8a96e]/50 text-xs font-bold text-[#e6d1a3] flex items-center gap-1.5 cursor-pointer hover:bg-[#1c1a15]">
                <Camera className="w-3.5 h-3.5" />
                <span>{uploading ? 'جاري الضغط...' : 'رفع صورة'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {state.photos.length === 0 ? (
              <div className="text-xs text-[#66645e] bg-[#18181c] border border-[#232329] rounded-xl p-4 text-center">
                لم تُرفع صور تقدم بعد. ارفع صورتين على الأقل للمقارنة قبل/بعد مع فرق الوزن.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {state.photos.map((ph) => {
                    const selIdx = compareIds.indexOf(ph.id);
                    return (
                      <div
                        key={ph.id}
                        className={`relative rounded-xl overflow-hidden border bg-[#18181c] ${
                          selIdx >= 0 ? 'border-[#c8a96e]' : 'border-[#232329]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (compareIds[0] === ph.id) {
                              setCompareIds([null, compareIds[1]]);
                            } else if (compareIds[1] === ph.id) {
                              setCompareIds([compareIds[0], null]);
                            } else if (!compareIds[0]) {
                              setCompareIds([ph.id, compareIds[1]]);
                            } else {
                              setCompareIds([compareIds[0], ph.id]);
                            }
                          }}
                          className="w-full block text-right cursor-pointer"
                        >
                          <img
                            src={ph.dataUrl}
                            alt={`صورة تقدم ${ph.date}`}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[3/4] object-cover"
                          />
                          <div className="p-1.5 text-[10px] font-num text-[#f3f1ec] flex justify-between tabular-nums">
                            <span>{ph.date.slice(5)}</span>
                            <span className="text-[#c8a96e] font-bold">{ph.weight}كغ</span>
                          </div>
                        </button>
                        {selIdx >= 0 && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-[#c8a96e] text-[#141108] flex items-center justify-center text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            onUpdate((prev) => ({
                              ...prev,
                              photos: prev.photos.filter((x) => x.id !== ph.id),
                            }));
                            setCompareIds([
                              compareIds[0] === ph.id ? null : compareIds[0],
                              compareIds[1] === ph.id ? null : compareIds[1],
                            ]);
                          }}
                          className="touch-press absolute top-1.5 left-1.5 p-1 rounded-md bg-black/75 text-[#b86157] cursor-pointer"
                          aria-label="حذف الصورة"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Before / After Comparison */}
                {photoA && photoB && (
                  <div className="bg-[#18181c] border border-[#c8a96e]/50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#c8a96e]">مقارنة قبل / بعد</span>
                      <span className="font-num text-[#e6d1a3] tabular-nums">
                        الفرق: {round1(photoB.weight - photoA.weight) > 0 ? '+' : ''}
                        {round1(photoB.weight - photoA.weight)} كغ
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[photoA, photoB].map((p, idx) => (
                        <div key={p.id} className="space-y-1">
                          <img
                            src={p.dataUrl}
                            alt={idx === 0 ? 'قبل' : 'بعد'}
                            referrerPolicy="no-referrer"
                            className="w-full aspect-[3/4] object-cover rounded-lg"
                          />
                          <div className="text-[11px] text-center font-num text-[#96938a] tabular-nums">
                            {p.date} · <b className="text-[#f3f1ec]">{p.weight} كغ</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
