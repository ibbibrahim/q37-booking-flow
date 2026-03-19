import { memo } from 'react';
import { EmployeeCell } from './EmployeeCell';
import type { RotaAssignment, RotaEmployee } from '../types/rota';

export interface EmployeeRowProps {
  employee: RotaEmployee;
  weekDates: Date[];
  assignments: RotaAssignment[];
  readOnly?: boolean;
  onAssign: (employeeId: number, date: Date, shiftType: string, isOffDay?: boolean, customLabel?: string) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, empId: number, d: Date) => void;
}

export const EmployeeRow = memo(function EmployeeRow({
  employee,
  weekDates,
  assignments,
  readOnly = false,
  onAssign,
  onRemove,
  onEdit,
}: EmployeeRowProps) {
  return (
    <tr className="print:break-inside-avoid">
      <td className="px-4 py-2 border-r bg-muted/20 font-medium text-sm sticky left-0 bg-background print:bg-muted/30">
        {employee.name}
      </td>
      {weekDates.map((date) => (
        <EmployeeCell
          key={date.toISOString()}
          employee={employee}
          date={date}
          assignments={assignments}
          readOnly={readOnly}
          onAssign={onAssign}
          onRemove={onRemove}
          onEdit={onEdit}
        />
      ))}
    </tr>
  );
});
