import { isValid } from "date-fns";
import { format, parseISO } from "date-fns";



// Display label for status (UI only; underlying value stays e.g. "Completed")
export const getEditingStatusDisplayLabel = (status: string): string => {
  if (status === 'Completed') return 'Assignment Completed';
  if (status === 'Rejected') return 'Cannot Accommodate';
  return status;
};

// Status badge variant
export const getEditingStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Pending':
      return 'secondary';
    case 'Acknowledged':
      return 'default';
    case 'Completed':
      return 'default';
    case 'Cancelled':
      return 'destructive';
    case 'Rejected':
      return 'destructive';
    default:
      return 'outline';
  }
};

// Status badge className for custom colors (yellow, blue, green, red)
export const getEditingStatusBadgeClass = (status: string): string => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Acknowledged':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Completed':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Cancelled':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'Rejected':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
  }
};

// Format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB');
};

// Format datetime
export const formatDateTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return "N/A";

  const d = parseISO(dateTimeString);
  if (!isValid(d)) return "N/A";

  return format(d, "d MMM yyyy, h:mm a");
};


// Parse approximateDuration string (e.g. "1 hour 30 min" or "30 min") to minutes
export const parseApproximateDurationToMinutes = (approximateDuration: string): number => {
  if (!approximateDuration?.trim()) return 60;
  const s = approximateDuration.toLowerCase().trim();
  // Match "X hour Y min" first (e.g. "1 hour 30 min")
  const hourMinMatch = s.match(/(\d+)\s*hour(?:s)?\s+(\d+)\s*min/);
  if (hourMinMatch) {
    return parseInt(hourMinMatch[1], 10) * 60 + parseInt(hourMinMatch[2], 10);
  }
  // Match "X hour(s)" only
  const hourMatch = s.match(/(\d+)\s*hour(?:s)?/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;
  // Match "X min" only
  const minMatch = s.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1], 10);
  return 60;
};

// Format minutes as "1h 45min"
export const formatDurationMinutes = (minutes: number): string => {
  if (!minutes || minutes < 0) return '0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
};

// Calculate end time from start datetime and duration in minutes
export const addMinutesToDatetime = (datetimeStr: string, minutes: number): string => {
  const d = new Date(datetimeStr);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
};

/** Extract HH:mm from datetime string for <input type="time"> (24h format) */
export const parseTime = (datetime?: string | null): string => {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/** Add minutes to start datetime, return HH:mm for <input type="time"> */
export const calculateEndTime = (startDatetime: string, minutes: number): string => {
  const endIso = addMinutesToDatetime(startDatetime, minutes);
  return parseTime(endIso);
};

/** Format TimeSpan "HH:mm:ss" for display e.g. "11:00 AM" */
export const formatTimeSpan = (timeSpan?: string | null): string => {
  if (!timeSpan) return '—';
  const parts = timeSpan.split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/** Format duration between two time strings (HH:mm or HH:mm:ss) as "2h 30m" */
export const formatDurationFromTimes = (start: string, end: string): string => {
  if (!start || !end) return '—';
  const parse = (s: string) => {
    const p = s.split(':');
    return (parseInt(p[0] ?? '0', 10) * 60 + parseInt(p[1] ?? '0', 10)) | 0;
  };
  const mins = parse(end) - parse(start);
  if (mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};
