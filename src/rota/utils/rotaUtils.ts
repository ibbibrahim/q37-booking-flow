import type { RotaAssignment, RotaEmployee } from '../types/rota';
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
};

export const getAssignmentDisplay = (
  assignment: RotaAssignment
): AssignmentDisplay | null => {
  if (assignment.isOffDay) return { label: 'OFF', color: 'grey' };
  if (assignment.customLabel)
    return {
      label: assignment.customLabel,
      color: 'purple',
      showTime: !!(assignment.shiftStartTime || assignment.shiftEndTime),
    };
  if (assignment.shiftType === 'morning') return { label: 'Morning', color: 'orange' };
  if (assignment.shiftType === 'evening') return { label: 'Evening', color: 'blue' };
  if (assignment.shiftType === 'night') return { label: 'Night', color: 'indigo' };
  if (assignment.programName)
    return { label: assignment.programName, color: 'purple' };
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
