import type { DtlBooking, DtlLogEntry } from '../types/dtl';

export function readDtlLogs(booking: Pick<DtlBooking, 'logs'>): DtlLogEntry[] {
  const logs = Array.isArray(booking.logs) ? booking.logs : [];
  return [...logs].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
}

export function formatDtlTimeShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
