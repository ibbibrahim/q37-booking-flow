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

// Format date for API (YYYY-MM-DD)
export const formatDateForApi = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Format date for display (16 Mar)
export const formatDateDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** Normalize date string to YYYY-MM-DD (API may return "2026-03-15T00:00:00") */
export const normalizeDateString = (dateStr: string): string => {
  return dateStr.split('T')[0];
};
