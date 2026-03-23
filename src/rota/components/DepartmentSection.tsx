import { memo, useMemo } from 'react';
import { EmployeeRow } from './EmployeeRow';
import type { RotaDepartment, RotaAssignment, RotaEmployee, RotaShiftType } from '../types/rota';

export interface DepartmentSectionProps {
  department: RotaDepartment;
  weekDates: Date[];
  assignments: RotaAssignment[];
  employees: RotaEmployee[];
  shiftTypes?: RotaShiftType[];
  readOnly?: boolean;
  onAssign: (employeeId: number, date: Date, shiftType: string, isOffDay?: boolean, customLabel?: string) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, employeeId: number, date: Date) => void;
}

type EmployeeGroup = { departmentName: string | null; employees: RotaEmployee[] };

export const DepartmentSection = memo(function DepartmentSection({
  department,
  weekDates,
  assignments,
  employees,
  shiftTypes = [],
  readOnly = false,
  onAssign,
  onRemove,
  onEdit,
}: DepartmentSectionProps) {
  const employeeCount = department.employeeCount ?? employees.length;

  const groupedEmployees = useMemo((): EmployeeGroup[] => {
    if (!department.hasSubDepartments) {
      return [{ departmentName: null, employees: [...employees].sort((a, b) => a.name.localeCompare(b.name)) }];
    }

    const groups = employees.reduce(
      (acc, emp) => {
        const deptName = emp.departmentName || 'Other';
        if (!acc[deptName]) acc[deptName] = [];
        acc[deptName].push(emp);
        return acc;
      },
      {} as Record<string, RotaEmployee[]>
    );

    return Object.entries(groups).map(([departmentName, emps]) => ({
      departmentName,
      employees: emps.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [employees, department.hasSubDepartments]);

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

      {groupedEmployees.flatMap((group) => [
        ...(group.departmentName
          ? [
              <tr key={`header-${group.departmentName}`}>
                <td
                  colSpan={8}
                  className="bg-muted/50 px-4 py-2 font-semibold text-sm border-t border-b"
                >
                  {group.departmentName}
                </td>
              </tr>,
            ]
          : []),
        ...group.employees.map((employee) => (
          <EmployeeRow
            key={employee.id}
            employee={employee}
            weekDates={weekDates}
            assignments={assignments}
            shiftTypes={shiftTypes}
            readOnly={readOnly}
            onAssign={onAssign}
            onRemove={onRemove}
            onEdit={onEdit}
          />
        )),
      ])}
    </>
  );
});
