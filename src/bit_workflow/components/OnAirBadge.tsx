import { Radio } from 'lucide-react';

export function OnAirBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
      <Radio size={11} aria-hidden />
      On-air
    </span>
  );
}
