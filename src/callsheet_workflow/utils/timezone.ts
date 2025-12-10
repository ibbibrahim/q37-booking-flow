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

export const formatQatarDateTime = (utcDateString: string): string => {
  if (!utcDateString) return 'N/A';

  const utcDate = new Date(utcDateString);
  const qatarDate = new Date(utcDate.getTime() + QATAR_TIMEZONE_OFFSET * 60 * 1000);

  return qatarDate.toLocaleString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const formatQatarDate = (utcDateString: string): string => {
  if (!utcDateString) return 'N/A';

  const utcDate = new Date(utcDateString);
  const qatarDate = new Date(utcDate.getTime() + QATAR_TIMEZONE_OFFSET * 60 * 1000);

  return qatarDate.toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getCurrentQatarDateTime = (): string => {
  const now = new Date();
  const qatarNow = new Date(now.getTime() + QATAR_TIMEZONE_OFFSET * 60 * 1000);

  const year = qatarNow.getUTCFullYear();
  const month = String(qatarNow.getUTCMonth() + 1).padStart(2, '0');
  const day = String(qatarNow.getUTCDate()).padStart(2, '0');
  const hours = String(qatarNow.getUTCHours()).padStart(2, '0');
  const minutes = String(qatarNow.getUTCMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};
