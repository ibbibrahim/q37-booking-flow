// Get Sunday of current week (our week starts Sunday)
export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday is 0
  return new Date(d.setDate(diff));
};

// Get array of 7 dates starting from Sunday (Sun-Sat)
export const getWeekDates = (weekStart: Date): Date[] => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });
};

// Check if date is Friday (off day)
export const isFriday = (date: Date): boolean => date.getDay() === 5;

// Format date for API (YYYY-MM-DD) - use local date to avoid timezone mismatch with API
export const formatDateForApi = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Format date for display (16 Mar)
export const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** Normalize date string to YYYY-MM-DD (API may return "2026-03-15T00:00:00") */
export const normalizeDateString = (dateStr: string): string => {
  return dateStr.split('T')[0];
};

/** Parse YYYY-MM-DD or ISO string as local date (avoids timezone shift) */
export const parseLocalDate = (dateStr: string): Date => {
  const s = normalizeDateString(dateStr);
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};
