import React from 'react';
import { AppState } from '../types';
import {
  calcCartTotals,
  cartItemMacros,
  clamp,
  getMealSlotName,
  round0,
} from '../utils/nutrition';

const SLOT_TONES = ['var(--accent)', 'var(--success)', 'var(--accent-strong)', 'var(--fat)', 'var(--ink-secondary)'];

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
        <div className="h-1.5 w-full rounded-full overflow-hidden bg-[var(--bg-subtle)] flex">
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

      <div className="divide-y divide-[var(--border)] bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl px-3">
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
                onSelectSlot ? 'touch-press hover:bg-[var(--bg-subtle)] -mx-1.5 px-1.5 rounded-lg cursor-pointer' : ''
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
                  <span className="text-xs font-bold text-[var(--ink-primary)] truncate">
                    {getMealSlotName(state, idx)}
                  </span>
                  {totalKcal > 0 && (
                    <span className="text-[11px] text-[var(--ink-secondary)] tabular-nums shrink-0">
                      {pct}%
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold tabular-nums shrink-0">
                  <span className="text-[var(--accent-strong)]">{round0(s.kcal)} kcal</span>
                  <span className="text-[var(--ink-tertiary)] mx-1">·</span>
                  <span className="text-[var(--accent)]">P{round0(s.p)}</span>
                  <span className="text-[var(--ink-tertiary)] mx-1">·</span>
                  <span className="text-[var(--success)]">C{round0(s.c)}</span>
                  <span className="text-[var(--ink-tertiary)] mx-1">·</span>
                  <span className="text-[var(--fat)]">F{round0(s.f)}</span>
                </div>
              </div>
              <div className="text-[11px] text-[var(--ink-secondary)] mt-1 leading-relaxed">
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
