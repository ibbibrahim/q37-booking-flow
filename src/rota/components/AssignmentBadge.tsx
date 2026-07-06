import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RotaAssignment, RotaShiftType } from '../types/rota';
import { getAssignmentDisplay, type AssignmentDisplay } from '../utils/rotaUtils';
import { badgeMotionVariants } from '../utils/rotaMotion';

const colorClasses: Record<AssignmentDisplay['color'], string> = {
  grey: 'bg-muted text-muted-foreground border-muted-foreground/30',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
};

export interface AssignmentBadgeProps {
  assignment: RotaAssignment;
  onRemove: () => void;
  draggable?: boolean;
  readOnly?: boolean;
  shiftTypes?: RotaShiftType[];
}

export const AssignmentBadge = memo(function AssignmentBadge({
  assignment,
  onRemove,
  draggable = true,
  readOnly = false,
  shiftTypes,
}: AssignmentBadgeProps) {
  const display = getAssignmentDisplay(assignment, shiftTypes);
  if (!display) return null;

  const canDrag = draggable && !readOnly;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `assignment-${assignment.id}`,
    data: {
      type: 'assignment',
      assignment,
      employeeId: assignment.employeeId,
      shiftDate: assignment.shiftDate,
      shiftTypeId: assignment.shiftTypeId,
      shiftType: assignment.shiftType,
      customLabel: assignment.customLabel,
      isOffDay: assignment.isOffDay,
    },
    disabled: !canDrag,
  });

  const useCustomColor = !!display.customColor;
  const canInteract = canDrag && !isDragging;

  return (
    <motion.div
      ref={setNodeRef}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      variants={badgeMotionVariants}
      initial="initial"
      animate={isDragging ? 'dragging' : 'idle'}
      whileHover={canInteract ? 'hover' : undefined}
      whileTap={canInteract ? 'tap' : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border touch-none will-change-transform',
        !useCustomColor && colorClasses[display.color],
        canDrag && 'cursor-grab active:cursor-grabbing'
      )}
      style={
        useCustomColor
          ? {
              backgroundColor: display.customColor,
              borderColor: display.customColor,
              color: '#374151',
            }
          : undefined
      }
    >
      <span>{display.label}</span>
      {!readOnly && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 rounded-full p-0.5"
          aria-label="Remove assignment"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
});
