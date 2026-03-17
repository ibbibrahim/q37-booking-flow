import React, { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RotaEmployee } from '../types/rota';

const DRAG_TYPE = 'employee';

export interface EmployeeChipProps {
  employee: RotaEmployee;
  showRemove?: boolean;
  onRemove?: () => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** When false, chip is not draggable (e.g. when displayed in shift cell) */
  draggable?: boolean;
  /** Unique id when draggable=false to avoid dnd-kit id collisions */
  uniqueId?: string;
}

export const EmployeeChip = memo(function EmployeeChip({
  employee,
  showRemove = false,
  onRemove,
  size = 'md',
  disabled = false,
  draggable = true,
  uniqueId,
}: EmployeeChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: draggable ? `employee-${employee.id}` : `assigned-${uniqueId ?? employee.id}`,
    data: { employeeId: employee.id, type: DRAG_TYPE },
    disabled: disabled || !draggable,
  });

  const isActuallyDraggable = draggable && !disabled;

  return (
    <div
      ref={setNodeRef}
      {...(isActuallyDraggable ? { ...listeners, ...attributes } : {})}
      className={cn(
        'inline-flex items-center gap-1 rounded-full text-xs font-medium transition-colors',
        size === 'sm' && 'px-2 py-0.5',
        size === 'md' && 'px-2 py-1',
        'bg-primary/10 text-primary border border-primary/20',
        'hover:bg-primary/20',
        isActuallyDraggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        (!isActuallyDraggable || disabled) && 'cursor-default'
      )}
      role="button"
      aria-label={`Drag ${employee.name} to assign to shift`}
      tabIndex={isActuallyDraggable ? 0 : -1}
    >
      <span>{employee.name}</span>
      {showRemove && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-primary/30 rounded-full p-0.5 transition-colors"
          aria-label={`Remove ${employee.name} from shift`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
});
