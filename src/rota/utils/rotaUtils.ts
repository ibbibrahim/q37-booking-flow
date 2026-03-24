import type { RotaAssignment, RotaEmployee, RotaShiftType } from '../types/rota';
import { formatDateForApi, normalizeDateString } from './dateUtils';

/** Format "06:00" to "6am", "08:30" to "8:30am", "14:00" to "2pm". Minutes included when non-zero. */
export const formatShiftTiming = (
  startTime?: string,
  endTime?: string
): string => {
  if (!startTime || !endTime) return '';

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const h = hours ?? 0;
    const m = minutes ?? 0;
    const minPart = m > 0 ? `:${String(m).padStart(2, '0')}` : '';

    if (h === 0) return `12${minPart}am`;
    if (h === 12) return `12${minPart}pm`;
    if (h > 12) return `${h - 12}${minPart}pm`;
    return `${h}${minPart}am`;
  };

  return `${formatTime(startTime)}-${formatTime(endTime)}`;
};

/** Label before "(...)" in shift type labels */
export const extractShiftLabel = (label: string): string =>
  label.includes('(') ? label.split('(')[0].trim() : label;

/** Text inside first "(...)" in label, if any */
export const extractTimingFromLabel = (label: string): string => {
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
};

export type AssignmentDisplay = {
  label: string;
  color: 'grey' | 'orange' | 'blue' | 'indigo' | 'purple';
  showTime?: boolean;
  /** For dynamic shift types - use as background color when set */
  customColor?: string;
};

function resolveShiftType(
  assignment: RotaAssignment,
  shiftTypes?: RotaShiftType[]
): RotaShiftType | undefined {
  if (assignment.shiftType) return assignment.shiftType;
  if (assignment.shiftTypeId != null && shiftTypes?.length) {
    return shiftTypes.find((s) => s.id === assignment.shiftTypeId);
  }
  return undefined;
}

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

  const st = resolveShiftType(assignment, shiftTypes);
  if (st) {
    const label = extractShiftLabel(st.label);
    return {
      label,
      color: 'purple',
      customColor: st.color,
    };
  }

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

/** True if the employee already has an assignment on this date (optionally excluding one assignment id, e.g. when moving). */
export const hasConflictOnDate = (
  assignments: RotaAssignment[],
  employeeId: number,
  date: Date,
  excludeAssignmentId?: number
): boolean => {
  const dateStr = formatDateForApi(date);
  return assignments.some(
    (a) =>
      a.employeeId === employeeId &&
      normalizeDateString(a.shiftDate) === dateStr &&
      (excludeAssignmentId !== undefined ? a.id !== excludeAssignmentId : true)
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
