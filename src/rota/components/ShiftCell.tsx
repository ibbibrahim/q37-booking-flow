import React, { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { EmployeeChip } from './EmployeeChip';
import type { RotaAssignment, RotaEmployee } from '../types/rota';
import { formatDateForApi } from '../utils/dateUtils';

export interface ShiftCellProps {
  date: Date;
  shiftType: 'morning' | 'evening' | 'night';
  assignments: RotaAssignment[];
  employees: RotaEmployee[];
  requiredCount?: number; // Kept for API compatibility, not displayed
  disabled: boolean;
  onDrop: (employeeId: number) => void;
  onRemove: (assignmentId: number) => void;
}

export const ShiftCell = memo(function ShiftCell({
  date,
  shiftType,
  assignments,
  employees,
  disabled,
  onRemove,
}: ShiftCellProps) {
  const dateStr = formatDateForApi(date);
  const cellId = `cell-${dateStr}-${shiftType}`;
  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { date: dateStr, shiftType },
    disabled,
  });

  const getEmployee = (employeeId: number) =>
    employees.find((e) => e.id === employeeId);

  return (
    <td
      ref={setNodeRef}
      className={cn(
        'border p-2 min-w-32 h-24 align-top',
        disabled && 'bg-muted cursor-not-allowed',
        isOver && !disabled && 'bg-primary/10 border-primary border-2'
      )}
    >
      {!disabled ? (
        <>
          <div className="flex flex-wrap gap-1">
            {assignments.map((assignment) => {
              const emp =
                getEmployee(assignment.employeeId) ?? ({
                  id: assignment.employeeId,
                  name: assignment.employeeName,
                  departmentId: 0,
                  isActive: true,
                });
              return (
                <EmployeeChip
                  key={assignment.id}
                  employee={emp}
                  showRemove
                  onRemove={() => onRemove(assignment.id)}
                  size="sm"
                  draggable={false}
                  uniqueId={String(assignment.id)}
                />
              );
            })}
          </div>

          {isOver && (
            <div className="text-xs text-primary mt-1 font-medium">
              Drop here
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          OFF
        </div>
      )}
    </td>
  );
});
