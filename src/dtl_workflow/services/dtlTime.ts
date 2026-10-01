// All DTL times are Qatar time (Doha Standard Time, UTC+3, no daylight saving).
export const QATAR_TIME_ZONE = 'Asia/Qatar';
export const QATAR_TIME_LABEL = 'Doha Standard Time (GMT+3)';
const QATAR_OFFSET = '+03:00';
const QATAR_OFFSET_MS = 3 * 60 * 60 * 1000;

const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * Booking times: a value without a zone is a Qatar wall-clock time (that's how older bookings were
 * saved); a value with a zone (Z or offset) is an absolute instant.
 */
export function parseDtlBookingTime(time: string | null | undefined): Date | null {
  if (!time) return null;
  const d = new Date(HAS_ZONE.test(time) ? time : `${time}${QATAR_OFFSET}`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-10-01T12:00" from the datetime-local input → "2026-10-01T12:00:00+03:00" for storage. */
export function qatarInputToIso(local: string): string {
  return `${local.slice(0, 16)}:00${QATAR_OFFSET}`;
}

/** Stored booking time → "YYYY-MM-DDTHH:mm" in Qatar time, for the datetime-local input. */
export function toQatarInputValue(time: string | null | undefined): string {
  const d = parseDtlBookingTime(time);
  return d ? new Date(d.getTime() + QATAR_OFFSET_MS).toISOString().slice(0, 16) : '';
}

/** "1 Oct 2026, 12:00 pm" in Qatar time. */
export function formatQatarDateTime(d: Date | null): string {
  if (!d) return '';
  return d.toLocaleString('en-GB', {
    timeZone: QATAR_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatQatarTimeOnly(d: Date): string {
  return d.toLocaleTimeString('en-GB', { timeZone: QATAR_TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true });
}

export function formatQatarDateOnly(d: Date): string {
  return d.toLocaleDateString('en-GB', { timeZone: QATAR_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDtlBookingTime(time: string | null | undefined): string {
  return formatQatarDateTime(parseDtlBookingTime(time));
}

/** Current moment in Qatar time, for log text. */
export function nowInQatar(): string {
  return formatQatarDateTime(new Date());
}

/**
 * A `Date` object (assumed to represent a Qatar wall-clock moment, e.g. a report range boundary
 * computed from `new Date()`/local getters) → an explicit "+03:00"-tagged ISO string for query
 * params. Using `.toISOString()` instead would convert through UTC and shift the boundary away
 * from what's actually stored (DTL booking times are naive Qatar wall-clock values on the server).
 */
export function dateToQatarIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const datePart = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timePart = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return `${datePart}T${timePart}${QATAR_OFFSET}`;
}
