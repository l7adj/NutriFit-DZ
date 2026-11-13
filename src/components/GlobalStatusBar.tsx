import React from 'react';
import { AppState } from '../types';
import { calcCartTotals, calcNutrition, clamp, round0 } from '../utils/nutrition';

interface GlobalStatusBarProps {
  state: AppState;
}

export const GlobalStatusBar: React.FC<GlobalStatusBarProps> = ({ state }) => {
  const r = calcNutrition(state);
  const t = calcCartTotals(state);

  if (r.err) {
    return (
      <div className="sticky top-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-b border-[#232329] px-3 py-2">
        <div className="max-w-6xl mx-auto text-xs text-[#b86157] font-semibold truncate">
          {r.err}
        </div>
      </div>
    );
  }

  const cells = [
    {
      label: 'السعرات المتبقية',
      shortLabel: 'سعرات',
      remaining: Math.max(0, r.kcal - t.kcal),
      target: r.kcal,
      planned: t.kcal,
      accent: '#e6d1a3',
      unit: 'kcal',
    },
    {
      label: 'بروتين متبقٍ',
      shortLabel: 'بروتين',
      remaining: Math.max(0, r.fp - t.p),
      target: r.fp,
      planned: t.p,
      accent: '#c8a96e',
      unit: 'غ',
    },
    {
      label: 'كارب متبقٍ',
      shortLabel: 'كارب',
      remaining: Math.max(0, r.C - t.c),
      target: r.C,
      planned: t.c,
      accent: '#6b9c7e',
      unit: 'غ',
    },
    {
      label: 'دهون متبقية',
      shortLabel: 'دهون',
      remaining: Math.max(0, r.F - t.f),
      target: r.F,
      planned: t.f,
      accent: '#a98c72',
      unit: 'غ',
    },
  ];

  return (
    <div className="sticky top-0 z-30 bg-[#09090b]/92 backdrop-blur-md border-b border-[#232329] px-3 py-1.5">
      <div className="max-w-6xl mx-auto grid grid-cols-4 divide-x divide-x-reverse divide-[#232329]">
        {cells.map((c) => {
          const pct = c.target > 0 ? clamp((c.planned / c.target) * 100, 0, 100) : 0;
          return (
            <div key={c.label} className="px-2 sm:px-4 py-1 text-center">
              <div className="flex items-baseline justify-center gap-1 tabular-nums">
                <span className="text-sm sm:text-base font-bold text-[#f3f1ec]">
                  {round0(c.remaining)}
                </span>
                <span className="text-[10px] font-medium" style={{ color: c.accent }}>
                  {c.unit}
                </span>
              </div>
              <div className="text-[10px] text-[#96938a] truncate">
                {c.shortLabel}
              </div>
              <div className="h-[2px] bg-[#1d1d22] mt-1 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: c.accent,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
