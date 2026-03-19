import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

export interface DraggableProgramChipProps {
  programName: string;
}

export const DraggableProgramChip = memo(function DraggableProgramChip({
  programName,
}: DraggableProgramChipProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `program-${programName}`,
    data: { type: 'program', programName },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium cursor-grab active:cursor-grabbing transition-colors',
        'bg-purple-50 text-purple-700 border border-purple-200',
        'hover:bg-purple-100',
        isDragging && 'opacity-50'
      )}
    >
      {programName}
    </div>
  );
});
