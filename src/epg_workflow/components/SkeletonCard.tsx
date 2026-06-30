import React from 'react';
import { motion } from 'motion/react';
import { CARD_HEIGHT, CARD_GAP, CARD_INSET_Y } from '../types/epg.types';

interface SkeletonCardProps {
  width?: number;
  index?: number;
  variant?: 'timeline' | 'list';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = 200,
  index = 0,
  variant = 'timeline',
}) => {
  if (variant === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: index * 0.04, duration: 0.3 }}
        className="rounded-lg border border-border p-3 space-y-2 bg-muted/30"
      >
        <div className="flex items-center gap-2">
          <div className="h-3 w-12 rounded bg-muted animate-pulse" />
          <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        </div>
        <div className="h-2.5 w-1/2 rounded bg-muted animate-pulse" />
        <div className="h-4 w-14 rounded-full bg-muted animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      className="absolute rounded-lg border border-border overflow-hidden bg-muted/30"
      style={{
        width: Math.max(width - CARD_GAP, 40),
        height: CARD_HEIGHT - CARD_INSET_Y * 2,
        top: CARD_INSET_Y,
        left: CARD_GAP / 2,
      }}
    >
      <div className="absolute inset-0 flex flex-col gap-2 p-2">
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-3.5 w-4/5 rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/5 rounded bg-muted animate-pulse" />
        <div className="mt-auto flex gap-1">
          <div className="h-4 w-12 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
};
