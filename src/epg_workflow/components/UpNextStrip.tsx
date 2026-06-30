import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Radio, Star, RotateCcw, ChevronRight } from 'lucide-react';
import type { Programme } from '../types/epg.types';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../types/epg.types';
import { useTheme } from '@/contexts/ThemeContext';

interface UpNextStripProps {
  programmes: Programme[];
  nowMinute: number;
  onCardClick: (p: Programme) => void;
}

function formatTime(startTime: string): string {
  return startTime;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function minutesUntil(prog: Programme, nowMinute: number): number {
  return Math.max(0, prog.startMinute - nowMinute);
}

export const UpNextStrip: React.FC<UpNextStripProps> = ({
  programmes,
  nowMinute,
  onCardClick,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const scrollRef = useRef<HTMLDivElement>(null);

  const upcoming = programmes
    .filter(p => p.startMinute > nowMinute)
    .slice(0, 12);

  if (upcoming.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Strip header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs font-bold text-card-foreground uppercase tracking-wider">
            Up Next Today
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {upcoming.length} shown
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
          Scroll horizontally <ChevronRight size={10} />
        </span>
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-3 px-5 pb-5 overflow-x-auto"
        style={{ scrollBehavior: 'smooth', scrollbarWidth: 'thin' }}
      >
        {upcoming.map((prog, i) => {
          const catStyle = CATEGORY_STYLES[prog.category] ?? DEFAULT_CATEGORY_STYLE;
          const bg = isDark ? catStyle.darkBg : catStyle.bg;
          const color = isDark ? catStyle.darkColor : catStyle.color;
          const border = catStyle.border;
          const minsUntil = minutesUntil(prog, nowMinute);

          return (
            <motion.button
              key={prog.id}
              onClick={() => onCardClick(prog)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              whileHover={{ y: -2, boxShadow: `0 6px 20px ${border}30` }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 w-44 rounded-xl border text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary overflow-hidden"
              style={{ backgroundColor: bg, borderColor: border, borderLeftWidth: 3 }}
            >
              {/* Time badge */}
              <div
                className="px-2.5 py-1.5 flex items-center justify-between border-b"
                style={{ borderColor: `${border}30`, backgroundColor: `${border}15` }}
              >
                <span className="text-[10px] font-bold" style={{ color }}>
                  {formatTime(prog.startTime)}
                </span>
                <span className="text-[9px] text-muted-foreground">
                  {minsUntil < 60
                    ? `in ${minsUntil}m`
                    : `in ${Math.floor(minsUntil / 60)}h ${minsUntil % 60}m`}
                </span>
              </div>

              {/* Body */}
              <div className="px-2.5 py-2">
                {prog.isLive && (
                  <div className="flex items-center gap-1 mb-1">
                    <Radio size={8} className="text-green-600 dark:text-green-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-green-600 dark:text-green-400">LIVE</span>
                  </div>
                )}
                <p className="text-xs font-semibold leading-tight line-clamp-2 mb-1" style={{ color }}>
                  {prog.title}
                </p>
                {prog.arabicTitle && (
                  <p className="text-[10px] text-right opacity-70 truncate mb-1" style={{ color, direction: 'rtl' }}>
                    {prog.arabicTitle}
                  </p>
                )}
                <div className="flex items-center justify-between gap-1 mt-auto flex-wrap">
                  <div className="flex items-center gap-1">
                    {prog.category && (
                      <span
                        className="text-[9px] font-bold px-1 py-0.5 rounded-full"
                        style={{ backgroundColor: `${border}20`, color, border: `1px solid ${border}` }}
                      >
                        {prog.category}
                      </span>
                    )}
                    {prog.isFirstRun && (
                      <Star size={9} className="text-amber-500 shrink-0" />
                    )}
                    {prog.isRepeat && (
                      <RotateCcw size={9} className="text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <span className="text-[9px] opacity-60 shrink-0" style={{ color }}>
                    {formatDuration(prog.durationMinutes)}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
