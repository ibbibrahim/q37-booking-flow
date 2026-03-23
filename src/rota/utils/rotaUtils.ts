import type { RotaAssignment, RotaEmployee, RotaShiftType } from '../types/rota';
import { formatDateForApi, normalizeDateString } from './dateUtils';

/** Format "06:00" to "6am", "14:00" to "2pm". Returns empty string if no times. */
export const formatShiftTiming = (
  startTime?: string,
  endTime?: string
): string => {
  if (!startTime || !endTime) return '';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const h = hours ?? 0;
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    if (h > 12) return `${h - 12}pm`;
    return `${h}am`;
  };

  return `${formatTime(startTime)}-${formatTime(endTime)}`;
};

export type AssignmentDisplay = {
  label: string;
  color: 'grey' | 'orange' | 'blue' | 'indigo' | 'purple';
  showTime?: boolean;
  /** For dynamic shift types - use as background color when set */
  customColor?: string;
};

export const getAssignmentDisplay = (
  assignment: RotaAssignment,
  shiftTypes?: RotaShiftType[]
): AssignmentDisplay | null => {
  if (assignment.isOffDay) return { label: 'OFF', color: 'grey' };
  if (assignment.customLabel)
    return {
      label: assignment.customLabel,
      color: 'purple',
      showTime: !!(assignment.shiftStartTime || assignment.shiftEndTime),
    };
  if (assignment.shiftType && shiftTypes?.length) {
    const match = shiftTypes.find(
      (s) => s.name === assignment.shiftType || s.name.replace(/_/g, '') === assignment.shiftType?.replace(/_/g, '')
    );
    if (match) {
      const label = match.label.includes('(')
        ? match.label.split('(')[0].trim()
        : match.label;
      return {
        label,
        color: 'purple',
        customColor: match.color,
      };
    }
  }
  if (assignment.shiftType === 'morning') return { label: 'Shift A', color: 'orange' };
  if (assignment.shiftType === 'evening') return { label: 'Shift B', color: 'blue' };
  if (assignment.shiftType === 'night') return { label: 'Shift C', color: 'indigo' };
  if (assignment.programName)
    return { label: assignment.programName, color: 'purple' };
  if (assignment.shiftType)
    return {
      label: assignment.shiftType.charAt(0).toUpperCase() + assignment.shiftType.slice(1).replace(/_/g, ' '),
      color: 'purple',
    };
  return null;
};

export const getAssignmentForEmployeeDay = (
  assignments: RotaAssignment[],
  employeeId: number,
  date: Date
): RotaAssignment | undefined => {
  const dateStr = formatDateForApi(date);
  return assignments.find(
    (a) =>
      a.employeeId === employeeId &&
      normalizeDateString(a.shiftDate) === dateStr
  );
};

export const getEmployeeShiftCount = (
  employeeId: number,
  assignments: RotaAssignment[]
): number => {
  return assignments.filter((a) => a.employeeId === employeeId).length;
};

export const getEmployeeById = (
  employees: RotaEmployee[],
  employeeId: number
): RotaEmployee | undefined => {
  return employees.find((e) => e.id === employeeId);
};

export const hasConflictOnDate = (
  assignments: RotaAssignment[],
  employeeId: number,
  date: Date,
  excludeShiftType?: string
): boolean => {
  const dateStr = formatDateForApi(date);
  return assignments.some(
    (a) =>
      a.employeeId === employeeId &&
      normalizeDateString(a.shiftDate) === dateStr &&
      (excludeShiftType ? a.shiftType !== excludeShiftType : true)
  );
};

/** Format week range for display, e.g. "22-28 Mar 2026" or "28 Mar - 3 Apr 2026" */
export const formatWeekRange = (weekStart: Date): string => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const month = weekStart.toLocaleDateString('en-GB', { month: 'short' });
  const year = weekStart.getFullYear();

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${startDay}-${endDay} ${month} ${year}`;
  } else {
    const endMonth = weekEnd.toLocaleDateString('en-GB', { month: 'short' });
    return `${startDay} ${month} - ${endDay} ${endMonth} ${year}`;
  }
};
