import { StatusPill } from '@/components/ui/status-pill';
import { PRIORITY_LABELS, PRIORITY_TONES } from '../utils/ticketUtils';
import type { TicketPriority } from '../types/ticket';

export function TicketPriorityBadge({ priority }: { priority: TicketPriority }) {
  const tone = PRIORITY_TONES[priority];
  return (
    <StatusPill tone={tone} ping={priority === 'critical'}>
      {PRIORITY_LABELS[priority]}
    </StatusPill>
  );
}
