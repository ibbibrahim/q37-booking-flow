import { motion } from 'motion/react';
import type { CSSProperties, ReactNode } from 'react';
import type { Active } from '@dnd-kit/core';
import { Ban } from 'lucide-react';
import type { RotaAssignment, RotaShiftType } from '../types/rota';
import {
  extractShiftLabel,
  extractTimingFromLabel,
  formatShiftTiming,
  getAssignmentDisplay,
} from '../utils/rotaUtils';
import { dragOverlayVariants } from '../utils/rotaMotion';

type ActiveData = {
  type?: string;
  shiftKind?: 'shift' | 'off';
  shiftType?: RotaShiftType;
  shiftTypeId?: number;
  programName?: string;
  assignment?: RotaAssignment;
};

export interface RotaDragOverlayProps {
  active: Active | null;
  shiftTypes?: RotaShiftType[];
}

function OverlayShell({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      variants={dragOverlayVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`cursor-grabbing rounded-lg border px-3 py-2 text-xs font-medium will-change-transform ${className ?? ''}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function RotaDragOverlay({ active, shiftTypes = [] }: RotaDragOverlayProps) {
  if (!active) return null;

  const data = active.data.current as ActiveData | undefined;
  if (!data?.type) return null;

  if (data.type === 'shift-option') {
    if (data.shiftKind === 'off') {
      return (
        <OverlayShell className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground border-muted-foreground/30">
          <Ban className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">OFF</span>
        </OverlayShell>
      );
    }

    const shift = data.shiftType;
    if (!shift) return null;
    const label = extractShiftLabel(shift.label);
    const timing =
      extractTimingFromLabel(shift.label) ||
      formatShiftTiming(shift.startTime, shift.endTime);

    return (
      <OverlayShell
        className="inline-flex flex-col items-start gap-0.5 min-w-[88px]"
        style={{
          backgroundColor: shift.color || '#f3f4f6',
          borderColor: shift.color || '#e5e7eb',
          color: '#374151',
        }}
      >
        <span className="font-semibold">{label}</span>
        {timing && <span className="text-[10px] font-medium opacity-80">{timing}</span>}
      </OverlayShell>
    );
  }

  if (data.type === 'program' && data.programName) {
    return (
      <OverlayShell className="bg-purple-50 text-purple-700 border-purple-200">
        {data.programName}
      </OverlayShell>
    );
  }

  if (data.type === 'assignment' && data.assignment) {
    const display = getAssignmentDisplay(data.assignment, shiftTypes);
    if (!display) return null;

    return (
      <OverlayShell
        className="inline-flex items-center rounded-full px-2.5 py-1"
        style={
          display.customColor
            ? {
                backgroundColor: display.customColor,
                borderColor: display.customColor,
                color: '#374151',
              }
            : undefined
        }
      >
        <span>{display.label}</span>
      </OverlayShell>
    );
  }

  return null;
}
