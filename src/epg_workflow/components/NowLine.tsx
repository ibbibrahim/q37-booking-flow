import React from 'react';
import { motion } from 'motion/react';
import { RULER_HEIGHT, CARD_HEIGHT } from '../types/epg.types';

interface NowLineProps {
  nowPx: number;
  timeLabel: string;
  /** Total height to span — defaults to RULER_HEIGHT + CARD_HEIGHT for single-lane */
  height?: number;
}

export const NowLine: React.FC<NowLineProps> = ({ nowPx, timeLabel, height }) => {
  const totalHeight = height ?? (RULER_HEIGHT + CARD_HEIGHT);
  return (
    <motion.div
      className="absolute top-0 z-20 pointer-events-none"
      style={{ left: nowPx, height: totalHeight }}
      initial={{ opacity: 0, scaleY: 0 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.3 }}
    >
      {/* Time bubble */}
      <div
        className="absolute -top-0.5 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow"
        style={{ top: 0 }}
      >
        {timeLabel}
      </div>

      {/* Vertical line */}
      <div
        className="absolute left-0 w-0.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]"
        style={{ top: 18, bottom: 0 }}
      />

      {/* Top dot */}
      <div
        className="absolute left-0 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500"
        style={{ top: 15 }}
      />
    </motion.div>
  );
};
