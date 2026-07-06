import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { chipEnterFromLeft, rotaEnter, staggerDelay } from '../utils/rotaMotion';

export interface DraggableProgramChipProps {
  programName: string;
  index?: number;
}

export const DraggableProgramChip = memo(function DraggableProgramChip({
  programName,
  index = 0,
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

  const canInteract = !isDragging;

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      variants={chipEnterFromLeft}
      initial="initial"
      animate={isDragging ? 'dragging' : 'idle'}
      whileHover={canInteract ? 'hover' : undefined}
      whileTap={canInteract ? 'tap' : undefined}
      transition={{ ...rotaEnter, delay: staggerDelay(index) }}
      className={cn(
        'px-3 py-1.5 rounded-md text-xs font-medium cursor-grab active:cursor-grabbing touch-none will-change-transform',
        'bg-purple-50 text-purple-700 border border-purple-200'
      )}
    >
      {programName}
    </motion.div>
  );
});
