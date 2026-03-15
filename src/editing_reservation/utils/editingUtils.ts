// Display label for status (UI only; underlying value stays e.g. "Completed")
export const getEditingStatusDisplayLabel = (status: string): string => {
  if (status === 'Completed') return 'Assignment Completed';
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
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400';
  }
};

// Format date
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-GB');
};

// Format datetime
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
