import React, { memo } from 'react';
import { ShiftRow } from './ShiftRow';
import type { RotaDepartment, RotaAssignment, RotaEmployee } from '../types/rota';

export interface DepartmentSectionProps {
  department: RotaDepartment;
  weekDates: Date[];
  assignments: RotaAssignment[];
  employees: RotaEmployee[];
  onDrop: (employeeId: number, date: Date, shiftType: string) => void;
  onRemove: (assignmentId: number) => void;
}

export const DepartmentSection = memo(function DepartmentSection({
  department,
  weekDates,
  assignments,
  employees,
  onDrop,
  onRemove,
}: DepartmentSectionProps) {
  const employeeCount = department.employeeCount ?? employees.length;

  return (
    <>
      <tr>
        <td
          colSpan={8}
          className="bg-muted/30 px-4 py-2 font-semibold">
          {department.name} ({employeeCount} staff)
        </td>
      </tr>

      {(['morning', 'evening', 'night'] as const).map((shiftType) => (
        <ShiftRow
          key={shiftType}
          shiftType={shiftType}
          weekDates={weekDates}
          assignments={assignments.filter((a) => a.shiftType === shiftType)}
          department={department}
          employees={employees}
          onDrop={onDrop}
          onRemove={onRemove}
        />
      ))}
    </>
  );
});
