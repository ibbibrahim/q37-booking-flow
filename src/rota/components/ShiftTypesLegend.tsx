import type { RotaShiftType } from '../types/rota';
import { formatShiftTiming, extractTimingFromLabel } from '../utils/rotaUtils';

function timingForShift(st: RotaShiftType): string {
  return (
    formatShiftTiming(st.startTime, st.endTime) ||
    extractTimingFromLabel(st.label)
  );
}

function swatchColor(color: string): string {
  const c = color.trim();
  return c.startsWith('#') ? c : `#${c}`;
}

export interface ShiftTypesLegendProps {
  shiftTypes: RotaShiftType[];
}

/** Same shift-type legend as PDF / Excel exports */
export function ShiftTypesLegend({ shiftTypes }: ShiftTypesLegendProps) {
  const active = [...shiftTypes]
    .filter((s) => s.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.label.localeCompare(b.label));

  if (active.length === 0) return null;

  return (
    <div className="pb-2 print:pb-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2.5">
        Shift types
      </h3>
      <div className="flex flex-wrap gap-x-4 gap-y-2.5">
        {active.map((st) => {
          const timing = timingForShift(st);
          return (
            <div
              key={st.id}
              className="inline-flex items-center gap-2 min-w-[200px] text-[11px]"
            >
              <span
                className="h-[18px] w-[18px] shrink-0 rounded border border-black/10"
                style={{ backgroundColor: swatchColor(st.color) }}
                aria-hidden
              />
              <span>
                <strong className="font-semibold">{st.label}</strong>
                {timing ? (
                  <span className="text-muted-foreground ml-1.5">{timing}</span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
