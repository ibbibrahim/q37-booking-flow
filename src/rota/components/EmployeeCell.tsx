import { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { AssignmentBadge } from './AssignmentBadge';
import type { RotaAssignment, RotaEmployee, RotaShiftType, RotaAssignPayload } from '../types/rota';
import { formatDateForApi } from '../utils/dateUtils';
import { getAssignmentForEmployeeDay, getAssignmentDisplay } from '../utils/rotaUtils';

export interface EmployeeCellProps {
  employee: RotaEmployee;
  date: Date;
  assignments: RotaAssignment[];
  shiftTypes?: RotaShiftType[];
  readOnly?: boolean;
  onAssign: (employeeId: number, date: Date, payload: RotaAssignPayload) => void;
  onRemove: (assignmentId: number) => void;
  onEdit: (assignment: RotaAssignment | null, employeeId: number, date: Date) => void;
}

export const EmployeeCell = memo(function EmployeeCell({
  employee,
  date,
  assignments,
  shiftTypes = [],
  readOnly = false,
  onAssign,
  onRemove,
  onEdit,
}: EmployeeCellProps) {
  const dateStr = formatDateForApi(date);
  const cellId = `cell-${employee.id}-${dateStr}`;
  const assignment = getAssignmentForEmployeeDay(assignments, employee.id, date);
  const disabled = false;

  const { setNodeRef, isOver } = useDroppable({
    id: cellId,
    data: { type: 'employee-cell', employeeId: employee.id, date: dateStr },
    disabled,
  });

  const handleDoubleClick = () => {
    if (readOnly || disabled) return;
    onEdit(assignment ?? null, employee.id, date);
  };

  return (
    <td
      ref={setNodeRef}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'border p-2 min-w-28 h-20 align-top',
        disabled && 'bg-muted cursor-not-allowed',
        isOver && !disabled && 'bg-primary/10 border-primary border-2',
        !readOnly && !disabled && 'cursor-pointer'
      )}
    >
      {disabled ? (
        <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
          OFF
        </div>
      ) : assignment ? (
        <div className="space-y-0.5">
          <AssignmentBadge
            assignment={assignment}
            onRemove={() => onRemove(assignment.id)}
            draggable={!readOnly}
            readOnly={readOnly}
            shiftTypes={shiftTypes}
          />
          {assignment.programName &&
            getAssignmentDisplay(assignment, shiftTypes)?.label !== assignment.programName && (
              <div className="text-[10px] text-muted-foreground truncate">
                {assignment.programName}
              </div>
            )}
          {assignment.assignmentComments && (
            <div className="text-[10px] text-muted-foreground truncate italic">
              {assignment.assignmentComments}
            </div>
          )}
        </div>
      ) : (
        <>
          {isOver && (
            <div className="text-xs text-primary font-medium">Drop here</div>
          )}
        </>
      )}
    </td>
  );
});
