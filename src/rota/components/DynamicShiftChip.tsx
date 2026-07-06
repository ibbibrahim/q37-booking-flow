import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import type { RotaShiftType } from '../types/rota';
import { extractShiftLabel, extractTimingFromLabel, formatShiftTiming } from '../utils/rotaUtils';
import { chipMotionVariants, rotaEnter, staggerDelay } from '../utils/rotaMotion';

export interface DynamicShiftChipProps {
  shift: RotaShiftType;
  index?: number;
}

export const DynamicShiftChip = memo(function DynamicShiftChip({
  shift,
  index = 0,
}: DynamicShiftChipProps) {
  const displayLabel = extractShiftLabel(shift.label);
  const timing =
    extractTimingFromLabel(shift.label) ||
    formatShiftTiming(shift.startTime, shift.endTime);

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `shift-option-${shift.id}`,
    data: {
      type: 'shift-option',
      shiftKind: 'shift' as const,
      shiftTypeId: shift.id,
      shiftType: shift,
    },
    disabled: !shift.isActive,
  });

  const canInteract = shift.isActive && !isDragging;

  return (
    <motion.div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      variants={chipMotionVariants}
      initial="initial"
      animate={isDragging ? 'dragging' : 'idle'}
      whileHover={canInteract ? 'hover' : undefined}
      whileTap={canInteract ? 'tap' : undefined}
      transition={{ ...rotaEnter, delay: staggerDelay(index) }}
      className={cn(
        'inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-xs font-medium border cursor-grab active:cursor-grabbing min-w-0 touch-none will-change-transform',
        !shift.isActive && 'opacity-50 cursor-not-allowed'
      )}
      style={{
        backgroundColor: shift.color || '#f3f4f6',
        borderColor: shift.color || '#e5e7eb',
        color: '#374151',
      }}
    >
      <div className="flex items-center gap-1.5">
        <span className="font-semibold">{displayLabel}</span>
      </div>
      {timing && (
        <span className="text-[10px] font-medium pl-0 opacity-80">
          {timing}
        </span>
      )}
    </motion.div>
  );
});
