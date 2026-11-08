import { StatusPill } from '@/components/ui/status-pill';
import { STATUS_LABELS, STATUS_TONES } from '../utils/ticketUtils';
import type { TicketStatus } from '../types/ticket';

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const tone = STATUS_TONES[status];
  return <StatusPill tone={tone}>{STATUS_LABELS[status]}</StatusPill>;
}
