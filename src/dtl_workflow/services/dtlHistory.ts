import type { DtlBooking, DtlLogEntry } from '../types/dtl';
import { formatDtlBookingTime } from './dtlTime';

export function readDtlLogs(booking: Pick<DtlBooking, 'logs'>): DtlLogEntry[] {
  const logs = Array.isArray(booking.logs) ? booking.logs : [];
  return [...logs].sort((a, b) => (a.at || '').localeCompare(b.at || ''));
}

/** Booking time formatted in Qatar time. */
export function formatDtlTimeShort(time: string): string {
  return formatDtlBookingTime(time);
}
