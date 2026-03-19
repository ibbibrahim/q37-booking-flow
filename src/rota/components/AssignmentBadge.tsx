import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RotaAssignment } from '../types/rota';
import { getAssignmentDisplay, type AssignmentDisplay } from '../utils/rotaUtils';

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
}

export const AssignmentBadge = memo(function AssignmentBadge({
  assignment,
  onRemove,
  draggable = true,
  readOnly = false,
}: AssignmentBadgeProps) {
  const display = getAssignmentDisplay(assignment);
  if (!display) return null;

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
      shiftType: assignment.shiftType,
      customLabel: assignment.customLabel,
      isOffDay: assignment.isOffDay,
    },
    disabled: !draggable || readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable && !readOnly ? { ...listeners, ...attributes } : {})}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border',
        colorClasses[display.color],
        draggable && !readOnly && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
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
    </div>
  );
});
