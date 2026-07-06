import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { motion } from 'motion/react';
import { Ban, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chipMotionVariants } from '../utils/rotaMotion';

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
      <motion.button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        variants={chipMotionVariants}
        initial="initial"
        animate="idle"
        whileHover={!disabled ? 'hover' : undefined}
        whileTap={!disabled ? 'tap' : undefined}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer will-change-transform',
          CUSTOM_CONFIG.colorClass,
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </motion.button>
    );
  }

  const canInteract = !isDragging && !disabled;

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
      className={cn(
        'inline-flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 text-xs font-medium border cursor-grab active:cursor-grabbing min-w-0 touch-none will-change-transform',
        OFF_CONFIG.colorClass,
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-semibold">{OFF_CONFIG.label}</span>
      </div>
    </motion.div>
  );
});
