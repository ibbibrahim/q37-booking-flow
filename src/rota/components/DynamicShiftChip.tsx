import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { RotaShiftType } from '../types/rota';
import { formatShiftTiming } from '../utils/rotaUtils';

export interface DynamicShiftChipProps {
  shift: RotaShiftType;
}

/** Extract label part before parentheses, e.g. "Morning (6am-2pm)" -> "Morning" */
function extractLabel(text: string): string {
  return text.includes('(') ? text.split('(')[0].trim() : text;
}

/** Extract timing from label if present, e.g. "Morning (6am-2pm)" -> "6am-2pm" */
function extractTimingFromLabel(label: string): string {
  const match = label.match(/\(([^)]+)\)/);
  return match ? match[1] : '';
}

export const DynamicShiftChip = memo(function DynamicShiftChip({
  shift,
}: DynamicShiftChipProps) {
  const displayLabel = extractLabel(shift.label);
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
    data: { type: 'shift-option', shiftType: shift.name },
    disabled: !shift.isActive,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-xs font-medium border cursor-grab active:cursor-grabbing transition-colors min-w-0',
        'hover:opacity-90',
        isDragging && 'opacity-50',
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
    </div>
  );
});
