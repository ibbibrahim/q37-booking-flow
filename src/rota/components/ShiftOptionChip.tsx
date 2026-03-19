import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Sun, Sunset, Moon, Ban, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShiftOptionType = 'morning' | 'evening' | 'night' | 'off' | 'custom';

const SHIFT_OPTIONS: {
  type: ShiftOptionType;
  label: string;
  icon: typeof Sun;
  colorClass: string;
}[] = [
  { type: 'morning', label: 'Morning', icon: Sun, colorClass: 'bg-orange-100 text-orange-700 border-orange-200' },
  { type: 'evening', label: 'Evening', icon: Sunset, colorClass: 'bg-blue-100 text-blue-700 border-blue-200' },
  { type: 'night', label: 'Night', icon: Moon, colorClass: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { type: 'off', label: 'OFF', icon: Ban, colorClass: 'bg-muted text-muted-foreground border-muted-foreground/30' },
  { type: 'custom', label: 'Custom...', icon: Plus, colorClass: 'bg-purple-100 text-purple-700 border-purple-200' },
];

export interface ShiftOptionChipProps {
  optionType: ShiftOptionType;
  onCustomClick?: () => void;
  disabled?: boolean;
  /** Optional timing label e.g. "6am-2pm" */
  timing?: string;
}

export const ShiftOptionChip = memo(function ShiftOptionChip({
  optionType,
  onCustomClick,
  disabled = false,
  timing,
}: ShiftOptionChipProps) {
  const config = SHIFT_OPTIONS.find((o) => o.type === optionType)!;
  const Icon = config.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `shift-option-${optionType}`,
    data: { type: 'shift-option', shiftType: optionType },
    disabled: disabled || optionType === 'custom',
  });

  const handleClick = () => {
    if (optionType === 'custom' && onCustomClick) {
      onCustomClick();
    }
  };

  if (optionType === 'custom') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer transition-colors',
          config.colorClass,
          'hover:opacity-90',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </button>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-xs font-medium border cursor-grab active:cursor-grabbing transition-colors min-w-0',
        config.colorClass,
        'hover:opacity-90',
        isDragging && 'opacity-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">{config.label}</span>
      </div>
      {timing && (
        <span className="text-[10px] text-muted-foreground font-medium pl-5">
          {timing}
        </span>
      )}
    </div>
  );
});
