import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Ban, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** OFF (special) or Custom (opens modal — not draggable) */
export type ShiftOptionType = 'off' | 'custom';

const OFF_CONFIG = {
  label: 'OFF',
  icon: Ban,
  colorClass: 'bg-muted text-muted-foreground border-muted-foreground/30',
};

const CUSTOM_CONFIG = {
  label: 'Custom...',
  icon: Plus,
  colorClass: 'bg-purple-100 text-purple-700 border-purple-200',
};

export interface ShiftOptionChipProps {
  optionType: ShiftOptionType;
  onCustomClick?: () => void;
  disabled?: boolean;
}

export const ShiftOptionChip = memo(function ShiftOptionChip({
  optionType,
  onCustomClick,
  disabled = false,
}: ShiftOptionChipProps) {
  const isOff = optionType === 'off';
  const config = isOff ? OFF_CONFIG : CUSTOM_CONFIG;
  const Icon = config.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: `shift-option-${optionType}`,
    data: {
      type: 'shift-option',
      shiftKind: 'off' as const,
    },
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
          CUSTOM_CONFIG.colorClass,
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
        OFF_CONFIG.colorClass,
        'hover:opacity-90',
        isDragging && 'opacity-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">{OFF_CONFIG.label}</span>
      </div>
    </div>
  );
});
