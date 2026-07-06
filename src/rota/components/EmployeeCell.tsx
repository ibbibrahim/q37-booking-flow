import { memo } from 'react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignmentBadge } from './AssignmentBadge';
import type {
  RotaAssignment,
  RotaEmployee,
  RotaShiftType,
  RotaAssignPayload,
} from '../types/rota';
import { formatDateForApi } from '../utils/dateUtils';
import { getAssignmentForEmployeeDay, getAssignmentDisplay } from '../utils/rotaUtils';
import { dropHintVariants, dropRingVariants, swapOverlayVariants } from '../utils/rotaMotion';

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

  const { active } = useDndContext();
  const activeData = active?.data.current as
    | { type?: string; assignment?: RotaAssignment }
    | undefined;
  const draggedAssignment =
    activeData?.type === 'assignment' ? activeData.assignment : undefined;
  const isDraggingAssignment = Boolean(draggedAssignment);
  const hasExistingAssignment = Boolean(assignment);
  const showSwapOverlay =
    !readOnly &&
    !disabled &&
    isOver &&
    hasExistingAssignment &&
    isDraggingAssignment &&
    draggedAssignment &&
    draggedAssignment.id !== assignment?.id;

  const isDropTarget = isOver && !disabled && !showSwapOverlay && Boolean(active);

  const handleDoubleClick = () => {
    if (readOnly || disabled) return;
    onEdit(assignment ?? null, employee.id, date);
  };

  return (
    <td
      ref={setNodeRef}
      onDoubleClick={handleDoubleClick}
      className={cn(
        'relative border p-2 min-w-28 h-20 align-top transition-colors duration-200 ease-out',
        disabled && 'bg-muted cursor-not-allowed',
        isDropTarget && 'bg-primary/8 border-primary/60',
        !readOnly && !disabled && 'cursor-pointer'
      )}
    >
      <AnimatePresence>
        {isDropTarget && (
          <motion.div
            key="drop-ring"
            variants={dropRingVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-none absolute inset-1 rounded-md ring-2 ring-primary/25 ring-inset"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSwapOverlay && (
          <motion.div
            key="swap"
            variants={swapOverlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-blue-400/80 bg-blue-50/90 backdrop-blur-[1px]"
            aria-hidden
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            >
              <ArrowLeftRight className="h-5 w-5 text-blue-600" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <AnimatePresence>
          {isDropTarget && (
            <motion.div
              key="drop-hint"
              variants={dropHintVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="text-xs text-primary/80 font-medium"
            >
              Drop here
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </td>
  );
});
