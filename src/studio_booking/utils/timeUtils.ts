import { format, differenceInMinutes, parseISO } from 'date-fns';

export const formatTime = (dateTimeString: string): string => {
  return format(parseISO(dateTimeString), 'h:mm a');
};

export const formatDateTime = (dateTimeString: string): string => {
  return format(parseISO(dateTimeString), 'd MMM yyyy, h:mm a');
};

export const calculateDuration = (start: string, end: string): string => {
  const minutes = differenceInMinutes(parseISO(end), parseISO(start));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const getPositionFromTime = (
  timeString: string,
  startHour: number,
  endHour: number
): number => {
  const date = parseISO(timeString);
  const hour = date.getHours();
  const minute = date.getMinutes();
  const totalMinutes = hour * 60 + minute;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const rangeMinutes = endMinutes - startMinutes;

  return ((totalMinutes - startMinutes) / rangeMinutes) * 100;
};

export const getWidthFromDuration = (
  start: string,
  end: string,
  startHour: number,
  endHour: number
): number => {
  const startPos = getPositionFromTime(start, startHour, endHour);
  const endPos = getPositionFromTime(end, startHour, endHour);
  return endPos - startPos;
};
