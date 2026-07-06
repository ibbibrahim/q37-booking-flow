import { memo, useMemo, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
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
  /** When true, sub-department rows (e.g. Producing Team) expand/collapse employee rows. Default expanded. */
  collapsibleSubTeams?: boolean;
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
  collapsibleSubTeams = true,
  onAssign,
  onRemove,
  onEdit,
}: DepartmentSectionProps) {
  /** `false` = collapsed; missing/`true` = expanded (default open). */
  const [subTeamOpen, setSubTeamOpen] = useState<Record<string, boolean>>({});

  const toggleSubTeam = useCallback((name: string) => {
    setSubTeamOpen((prev) => {
      const isOpen = prev[name] !== false;
      if (isOpen) return { ...prev, [name]: false };
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const groupedEmployees = useMemo((): EmployeeGroup[] => {
    if (!department.hasSubDepartments) {
      return [{ departmentName: null, employees: [...employees] }];
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

    let entries = Object.entries(groups);
    const order = department.subDepartmentNames;
    if (order?.length) {
      const orderMap = new Map(order.map((name, index) => [name, index]));
      entries = [...entries].sort(
        ([a], [b]) =>
          (orderMap.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (orderMap.get(b) ?? Number.MAX_SAFE_INTEGER)
      );
    }

    return entries.map(([departmentName, emps]) => ({
      departmentName,
      employees: emps,
    }));
  }, [employees, department.hasSubDepartments, department.subDepartmentNames]);

  const colSpan = weekDates.length + 1;

  return (
    <>
      <tr>
        <td
          colSpan={colSpan}
          className="bg-muted/30 px-4 py-2 font-semibold"
        >
          {department.name}
        </td>
      </tr>

      {groupedEmployees.flatMap((group, groupIndex) => {
        const subName = group.departmentName;
        const isSubOpen =
          !collapsibleSubTeams || !subName || subTeamOpen[subName] !== false;

        return [
          ...(subName
            ? [
                <tr key={`header-${subName}`}>
                  <td
                    colSpan={colSpan}
                    className={`p-0 border-y border-border/60 ${SUB_DEPARTMENT_ROW_STYLES[groupIndex % SUB_DEPARTMENT_ROW_STYLES.length]}`}
                  >
                    {collapsibleSubTeams ? (
                      <button
                        type="button"
                        onClick={() => toggleSubTeam(subName)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left font-semibold text-sm hover:bg-black/5 dark:hover:bg-white/5"
                        aria-expanded={isSubOpen}
                      >
                        <span>{subName}</span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isSubOpen ? '' : '-rotate-90'}`}
                          aria-hidden
                        />
                      </button>
                    ) : (
                      <div className="px-4 py-2 font-semibold text-sm">
                        {subName}
                      </div>
                    )}
                  </td>
                </tr>,
              ]
            : []),
          ...(isSubOpen
            ? group.employees.map((employee) => (
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
              ))
            : []),
        ];
      })}
    </>
  );
});
