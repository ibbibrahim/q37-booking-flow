import type { EditingRequest, EditingSession } from '../types/editing';

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Get the Sunday of the week containing the given date.
 */
export function getSundayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns 7 dates: Sunday through Saturday (full week).
 */
export function getWeekDates(weekStartSunday: Date): Date[] {
  const dates: Date[] = [];
  const sun = new Date(weekStartSunday);
  sun.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    dates.push(d);
  }
  return dates;
}

export function getDayLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${days[date.getDay()]} ${date.getDate()}`;
}

export function getWeekLabel(weekDates: Date[]): string {
  if (weekDates.length === 0) return '';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const first = weekDates[0];
  const last = weekDates[weekDates.length - 1];
  return `${months[first.getMonth()]} ${first.getDate()} - ${last.getDate()}, ${first.getFullYear()}`;
}

/**
 * Extract room number from strings like "Room 3", "3", "Edit Room 3".
 */
export function extractRoomNumber(value: string | undefined): number | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/**
 * Format time range from ISO datetime and optional session duration.
 * Uses sessionDurationMinutes when provided; otherwise falls back to 2 hours.
 */
export function formatTimeRange(
  isoDatetime: string,
  sessionDurationMinutes?: number | null
): string {
  const d = new Date(isoDatetime);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  const start = `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  const durationMs =
    sessionDurationMinutes != null && sessionDurationMinutes > 0
      ? sessionDurationMinutes * 60 * 1000
      : 2 * 60 * 60 * 1000;
  const endD = new Date(d.getTime() + durationMs);
  const endHours = endD.getHours();
  const endMinutes = endD.getMinutes();
  const endAmpm = endHours >= 12 ? 'PM' : 'AM';
  const endH = endHours % 12 || 12;
  const end = `${endH}:${endMinutes.toString().padStart(2, '0')} ${endAmpm}`;

  return `${start} - ${end}`;
}

export interface SessionWithRequest {
  session: EditingSession;
  request: EditingRequest;
}

/**
 * Get sessions for a specific cell (room + date).
 */
export function getSessionsForCell(
  requests: EditingRequest[],
  roomNumber: number,
  date: Date
): SessionWithRequest[] {
  const result: SessionWithRequest[] = [];

  for (const request of requests) {
    if (request.status !== 'Completed') continue;

    const sessions = request.editingSessions ?? [];
    for (const session of sessions) {
      if (!session.availableDatetime) continue;

      const sessionDate = new Date(session.availableDatetime);
      if (!isSameDay(sessionDate, date)) continue;

      const room = extractRoomNumber(session.editRoomNumber);
      if (room !== null && room === roomNumber) {
        result.push({ session, request });
      }
    }
  }

  return result;
}

/** Reserved room config: room number -> department label */
export const RESERVED_ROOMS: Record<number, string> = {
  1: 'News',
  2: 'News',
  9: 'Promo',
  10: 'Promo',
  11: 'Color Grading',
};

export function isReservedRoom(roomNumber: number): boolean {
  return roomNumber in RESERVED_ROOMS;
}

/**
 * Get the maximum room number from all sessions in completed requests.
 */
export function getMaxRoomFromRequests(requests: EditingRequest[]): number {
  let max = 11;
  for (const request of requests) {
    if (request.status !== 'Completed') continue;
    for (const session of request.editingSessions ?? []) {
      const room = extractRoomNumber(session.editRoomNumber);
      if (room !== null && room > max) max = room;
    }
  }
  return max;
}
