// Qatar timezone is UTC+3
const QATAR_TIMEZONE_OFFSET = 3 * 60;

export const utcToQatarTime = (utcDateString: string): string => {
  if (!utcDateString) return '';

  const utcDate = new Date(utcDateString);
  const qatarDate = new Date(utcDate.getTime() + QATAR_TIMEZONE_OFFSET * 60 * 1000);

  const year = qatarDate.getUTCFullYear();
  const month = String(qatarDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(qatarDate.getUTCDate()).padStart(2, '0');
  const hours = String(qatarDate.getUTCHours()).padStart(2, '0');
  const minutes = String(qatarDate.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const qatarTimeToUTC = (qatarDateString: string): string => {
  if (!qatarDateString) return '';

  const qatarDate = new Date(qatarDateString);
  const utcDate = new Date(qatarDate.getTime() - QATAR_TIMEZONE_OFFSET * 60 * 1000);

  return utcDate.toISOString();
};

export const formatQatarDateTime = (dateString: string): string => {
  if (!dateString) return 'N/A';

  // Just format the date string as-is, no timezone conversion
  const date = new Date(dateString);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const formatQatarDate = (dateString: string): string => {
  if (!dateString) return 'N/A';

  // Just format the date string as-is, no timezone conversion
  const date = new Date(dateString);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate();

  return `${day} ${month} ${year}`;
};

export const getCurrentQatarDateTime = (): string => {
  // Get current date/time in Qatar (just use local time, assuming user is in Qatar)
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
