import { memo, useMemo } from 'react';
import { EmployeeRow } from './EmployeeRow';
import type {
  RotaDepartment,
  RotaAssignment,
  RotaEmployee,
  RotaShiftType,
  RotaAssignPayload,
} from '../types/rota';

export interface DepartmentSectionProps {
  department: RotaDepartment;
  weekDates: Date[];
  assignments: RotaAssignment[];
  employees: RotaEmployee[];
  shiftTypes?: RotaShiftType[];
  readOnly?: boolean;
  onAssign: (employeeId: number, date: Date, payload: RotaAssignPayload) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, employeeId: number, date: Date) => void;
}

type EmployeeGroup = { departmentName: string | null; employees: RotaEmployee[] };

/** Rotating tints so sub-department separators read clearly vs the main department row */
const SUB_DEPARTMENT_ROW_STYLES = [
  'bg-sky-100/80 dark:bg-sky-950/40 border-l-4 border-sky-500',
  'bg-violet-100/80 dark:bg-violet-950/40 border-l-4 border-violet-500',
  'bg-amber-100/80 dark:bg-amber-950/40 border-l-4 border-amber-500',
  'bg-emerald-100/80 dark:bg-emerald-950/40 border-l-4 border-emerald-500',
] as const;

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
          {department.name}
        </td>
      </tr>

      {groupedEmployees.flatMap((group, groupIndex) => [
        ...(group.departmentName
          ? [
              <tr key={`header-${group.departmentName}`}>
                <td
                  colSpan={8}
                  className={`px-4 py-2 font-semibold text-sm border-y border-border/60 ${SUB_DEPARTMENT_ROW_STYLES[groupIndex % SUB_DEPARTMENT_ROW_STYLES.length]}`}
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
