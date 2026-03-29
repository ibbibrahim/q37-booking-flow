import { format, differenceInMinutes, parseISO } from 'date-fns';

import { isValid } from "date-fns";

export const formatTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return "N/A";

  const d = parseISO(dateTimeString);
  if (!isValid(d)) return "N/A";

  return format(d, "h:mm a");
};

export const formatDateTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return "N/A";

  const d = parseISO(dateTimeString);
  if (!isValid(d)) return "N/A";

  return format(d, "d MMM yyyy, h:mm a");
};

/** Booking workflow: show stored datetime using literal YYYY-MM-DDTHH:mm from the string (no timezone conversion). */
export const formatBookingStoredDateTime = (dateTimeString?: string | null): string => {
  if (!dateTimeString) return "N/A";

  const m = dateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) {
    const [, y, mo, day, h, min] = m;
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = months[Number(mo) - 1];
    const hNum = Number(h);
    const minNum = Number(min);
    const ampm = hNum >= 12 ? "PM" : "AM";
    let h12 = hNum % 12;
    if (h12 === 0) h12 = 12;
    const mm = String(minNum).padStart(2, "0");
    return `${Number(day)} ${month} ${y}, ${h12}:${mm} ${ampm}`;
  }

  const d = parseISO(dateTimeString);
  if (!isValid(d)) return "N/A";
  return format(d, "d MMM yyyy, h:mm a");
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
