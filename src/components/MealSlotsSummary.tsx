import React from 'react';
import { AppState } from '../types';
import {
  calcCartTotals,
  cartItemMacros,
  clamp,
  getMealSlotName,
  round0,
} from '../utils/nutrition';

const SLOT_TONES = ['#c8a96e', '#6b9c7e', '#e6d1a3', '#a98c72', '#96938a'];

interface MealSlotsSummaryProps {
  state: AppState;
  onSelectSlot?: (slotIdx: number) => void;
}

export const MealSlotsSummary: React.FC<MealSlotsSummaryProps> = ({ state, onSelectSlot }) => {
  const totalKcal = calcCartTotals(state).kcal;

  const slots = Array.from({ length: state.n }, () => ({
    kcal: 0,
    p: 0,
    c: 0,
    f: 0,
    labels: [] as string[],
  }));

  for (const m of state.meals) {
    const idx = clamp(m.slot || 0, 0, state.n - 1);
    const mac = cartItemMacros(m, state.foods, state.dishes);
    slots[idx].kcal += mac.kcal;
    slots[idx].p += mac.p;
    slots[idx].c += mac.c;
    slots[idx].f += mac.f;

    if (m.kind === 'food') {
      const f = state.foods.find((x) => x.id === m.id);
      if (f) slots[idx].labels.push(`${f.name} (${round0(m.grams || 0)}${f.cat === 'juice' ? 'مل' : 'غ'})`);
    } else if (m.kind === 'dish') {
      const d = state.dishes.find((x) => x.id === m.id);
      if (d) {
        const multLabel = m.mult && m.mult !== 1 ? ` ×${m.mult}` : '';
        slots[idx].labels.push(`${d.name}${multLabel}`);
      }
    } else {
      slots[idx].labels.push(m.name || 'وجبة مخصصة');
    }
  }

  return (
    <div className="space-y-3">
      {totalKcal > 0 && (
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-[#18181c] flex">
          {slots.map((s, idx) => {
            const pct = (s.kcal / totalKcal) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={idx}
                className="h-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: SLOT_TONES[idx % SLOT_TONES.length],
                }}
              />
            );
          })}
        </div>
      )}

      <div className="divide-y divide-[#232329] bg-[#18181c] border border-[#232329] rounded-xl px-3">
        {slots.map((s, idx) => {
          const pct = totalKcal > 0 ? round0((s.kcal / totalKcal) * 100) : 0;
          const tone = SLOT_TONES[idx % SLOT_TONES.length];
          const Wrapper = onSelectSlot ? 'button' : 'div';
          return (
            <Wrapper
              key={idx}
              {...(onSelectSlot
                ? {
                    type: 'button' as const,
                    onClick: () => onSelectSlot(idx),
                  }
                : {})}
              className={`w-full text-right py-3 block ${
                onSelectSlot ? 'touch-press hover:bg-[#1e1e24] -mx-1.5 px-1.5 rounded-lg cursor-pointer' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[11px] font-bold tabular-nums shrink-0"
                    style={{ color: tone }}
                  >
                    0{idx + 1}.
                  </span>
                  <span className="text-xs font-bold text-[#f3f1ec] truncate">
                    {getMealSlotName(state, idx)}
                  </span>
                  {totalKcal > 0 && (
                    <span className="text-[11px] text-[#96938a] tabular-nums shrink-0">
                      {pct}%
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold tabular-nums shrink-0">
                  <span className="text-[#e6d1a3]">{round0(s.kcal)} kcal</span>
                  <span className="text-[#66645e] mx-1">·</span>
                  <span className="text-[#c8a96e]">P{round0(s.p)}</span>
                  <span className="text-[#66645e] mx-1">·</span>
                  <span className="text-[#6b9c7e]">C{round0(s.c)}</span>
                  <span className="text-[#66645e] mx-1">·</span>
                  <span className="text-[#a98c72]">F{round0(s.f)}</span>
                </div>
              </div>
              <div className="text-[11px] text-[#96938a] mt-1 leading-relaxed">
                {s.labels.length > 0
                  ? s.labels.join(' · ')
                  : onSelectSlot
                    ? 'اضغط لبناء هذه الوجبة'
                    : 'لم يُضف صنف لهذه الوجبة بعد'}
              </div>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
};
