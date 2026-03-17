import type { RotaAssignment, RotaEmployee } from '../types/rota';
import { formatDateForApi, normalizeDateString } from './dateUtils';

export const getAssignmentsForCell = (
  assignments: RotaAssignment[],
  date: Date,
  shiftType: string
): RotaAssignment[] => {
  const dateStr = formatDateForApi(date);
  return assignments.filter(
    (a) =>
      normalizeDateString(a.shiftDate) === dateStr && a.shiftType === shiftType
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
