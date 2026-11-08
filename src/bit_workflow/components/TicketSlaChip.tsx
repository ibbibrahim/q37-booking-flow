import { Clock } from 'lucide-react';
import { pillClass } from '@/lib/tone';
import { slaChip } from '../utils/ticketUtils';
import type { SlaInfo } from '../types/ticket';

export function TicketSlaChip({ sla, now }: { sla: SlaInfo; now: Date }) {
  const { label, tone } = slaChip(sla, now);
  return (
    <span className={`${pillClass(tone)} tabular-nums`}>
      <Clock size={11} className="shrink-0" aria-hidden />
      {label}
    </span>
  );
}
