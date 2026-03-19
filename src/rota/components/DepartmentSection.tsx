import { memo } from 'react';
import { EmployeeRow } from './EmployeeRow';
import type { RotaDepartment, RotaAssignment, RotaEmployee } from '../types/rota';

export interface DepartmentSectionProps {
  department: RotaDepartment;
  weekDates: Date[];
  assignments: RotaAssignment[];
  employees: RotaEmployee[];
  readOnly?: boolean;
  onAssign: (employeeId: number, date: Date, shiftType: string, isOffDay?: boolean, customLabel?: string) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, employeeId: number, date: Date) => void;
}

export const DepartmentSection = memo(function DepartmentSection({
  department,
  weekDates,
  assignments,
  employees,
  readOnly = false,
  onAssign,
  onRemove,
  onEdit,
}: DepartmentSectionProps) {
  const employeeCount = department.employeeCount ?? employees.length;

  return (
    <>
      <tr>
        <td
          colSpan={8}
          className="bg-muted/30 px-4 py-2 font-semibold"
        >
          {department.name} ({employeeCount} staff)
        </td>
      </tr>

      {[...employees].sort((a, b) => a.name.localeCompare(b.name)).map((employee) => (
        <EmployeeRow
          key={employee.id}
          employee={employee}
          weekDates={weekDates}
          assignments={assignments}
          readOnly={readOnly}
          onAssign={onAssign}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </>
  );
});
