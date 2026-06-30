import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Star, RotateCcw, Radio } from 'lucide-react';
import type { Programme } from '../types/epg.types';
import {
  CATEGORY_STYLES,
  DEFAULT_CATEGORY_STYLE,
  CARD_HEIGHT,
  CARD_GAP,
  CARD_INSET_Y,
  PX_PER_MIN,
  MIN_CARD_WIDTH,
  NARROW_CARD_WIDTH,
  COMFORTABLE_CARD_WIDTH,
} from '../types/epg.types';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgrammeCardProps {
  programme: Programme;
  onClick: (programme: Programme) => void;
  index?: number;
  variant?: 'timeline' | 'list';
  dimmed?: boolean;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function cardLayoutWidth(durationMinutes: number): number {
  const raw = durationMinutes * PX_PER_MIN - CARD_GAP;
  return Math.max(raw, MIN_CARD_WIDTH);
}

type Density = 'micro' | 'compact' | 'comfortable';

function cardDensity(widthPx: number): Density {
  if (widthPx < NARROW_CARD_WIDTH) return 'micro';
  if (widthPx < COMFORTABLE_CARD_WIDTH) return 'compact';
  return 'comfortable';
}

export const ProgrammeCard: React.FC<ProgrammeCardProps> = ({
  programme,
  onClick,
  index = 0,
  variant = 'timeline',
  dimmed = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number } | null>(null);

  const catStyle = CATEGORY_STYLES[programme.category] ?? DEFAULT_CATEGORY_STYLE;
  const bg     = isDark ? catStyle.darkBg   : catStyle.bg;
  const color  = isDark ? catStyle.darkColor : catStyle.color;
  const border = catStyle.border;

  const widthPx = cardLayoutWidth(programme.durationMinutes);
  const density = cardDensity(widthPx);
  const endTime = minutesToTime(programme.startMinute + programme.durationMinutes);
  const cardHeight = CARD_HEIGHT - CARD_INSET_Y * 2;

  const showHoverTip = useCallback((e: React.MouseEvent) => {
    setHoverTip({ x: e.clientX, y: e.clientY });
  }, []);

  const hideHoverTip = useCallback(() => setHoverTip(null), []);

  const tooltipText = [
    programme.title,
    programme.arabicTitle,
    `${programme.startTime} – ${endTime} (${formatDuration(programme.durationMinutes)})`,
    programme.category,
    programme.isLive ? 'LIVE' : null,
  ].filter(Boolean).join(' · ');

  // ── List variant (weekly view) ───────────────────────────────────────
  if (variant === 'list') {
    return (
      <motion.button
        onClick={() => onClick(programme)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full text-left rounded-lg border p-2.5 transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ backgroundColor: bg, borderColor: border, borderLeftWidth: 3, opacity: dimmed ? 0.3 : 1 }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-semibold opacity-75" style={{ color }}>
                {programme.startTime}
              </span>
              {programme.isLive && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-green-600 dark:text-green-400">
                  <Radio size={8} className="animate-pulse" />
                  LIVE
                </span>
              )}
            </div>
            <p className="text-xs font-semibold leading-tight truncate" style={{ color }}>
              {programme.title}
            </p>
            {programme.arabicTitle && (
              <p className="text-[10px] text-right mt-0.5 opacity-70 truncate" style={{ color, direction: 'rtl' }}>
                {programme.arabicTitle}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] opacity-60" style={{ color }}>
              {formatDuration(programme.durationMinutes)}
            </span>
            {programme.category && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ backgroundColor: `${border}25`, color, border: `1px solid ${border}` }}
              >
                {programme.category}
              </span>
            )}
          </div>
        </div>
        {(programme.isRepeat || programme.isFirstRun) && (
          <div className="flex gap-1 mt-1.5">
            {programme.isFirstRun && (
              <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                <Star size={8} /> First Run
              </span>
            )}
            {programme.isRepeat && (
              <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                <RotateCcw size={8} /> Repeat
              </span>
            )}
          </div>
        )}
      </motion.button>
    );
  }

  // ── Timeline variant (daily view) ────────────────────────────────────
  const timeLabel = density === 'micro'
    ? programme.startTime.slice(0, 5)
    : `${programme.startTime} – ${endTime}`;

  return (
    <>
      <motion.button
        onClick={() => onClick(programme)}
        onMouseEnter={showHoverTip}
        onMouseMove={showHoverTip}
        onMouseLeave={hideHoverTip}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.25 }}
        whileHover={{ y: -2, boxShadow: `0 8px 24px ${border}35` }}
        whileTap={{ scale: 0.98 }}
        title={tooltipText}
        className="absolute rounded-lg border overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary group transition-opacity"
        style={{
          left: programme.startMinute * PX_PER_MIN + CARD_GAP / 2,
          width: widthPx,
          top: CARD_INSET_Y,
          height: cardHeight,
          backgroundColor: bg,
          borderColor: border,
          borderLeftWidth: programme.isLive ? 4 : 2,
          opacity: dimmed ? 0.25 : 1,
          zIndex: hoverTip ? 40 : 1,
        }}
      >
        {programme.isLive && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1 animate-pulse"
            style={{ backgroundColor: '#22c55e' }}
          />
        )}

        <div
          className={`flex flex-col h-full overflow-hidden ${
            density === 'micro' ? 'p-1 gap-0' : density === 'compact' ? 'p-1.5 gap-0.5' : 'p-2 gap-1'
          }`}
        >
          {/* Time */}
          <span
            className={`font-bold shrink-0 leading-none tabular-nums ${
              density === 'micro' ? 'text-[8px]' : 'text-[9px]'
            }`}
            style={{ color, opacity: 0.8 }}
          >
            {timeLabel}
          </span>

          {/* Title — always shown, scales with density */}
          <p
            className={`font-semibold leading-tight flex-1 min-h-0 ${
              density === 'micro'
                ? 'text-[8px] line-clamp-4 break-words'
                : density === 'compact'
                  ? 'text-[10px] line-clamp-3 break-words'
                  : 'text-[11px] line-clamp-2'
            }`}
            style={{ color }}
          >
            {programme.title}
          </p>

          {/* Arabic title */}
          {density !== 'micro' && programme.arabicTitle && (
            <p
              className={`text-right leading-tight opacity-75 shrink-0 ${
                density === 'compact' ? 'text-[8px] line-clamp-1' : 'text-[9px] line-clamp-1'
              }`}
              style={{ color, direction: 'rtl' }}
            >
              {programme.arabicTitle}
            </p>
          )}

          {/* Footer badges */}
          <div className="flex items-center gap-0.5 shrink-0 flex-wrap mt-auto min-h-[14px]">
            {programme.isLive && (
              <span
                className="flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded-full"
                style={{ backgroundColor: '#22c55e25', color: '#16a34a', border: '1px solid #22c55e60' }}
              >
                <Radio size={7} className="animate-pulse" />
                {density !== 'micro' && 'LIVE'}
              </span>
            )}
            {programme.category && density === 'comfortable' && (
              <span
                className="text-[8px] font-semibold px-1 py-0.5 rounded-full"
                style={{ backgroundColor: `${border}20`, color, border: `1px solid ${border}60` }}
              >
                {programme.category}
              </span>
            )}
            {programme.isFirstRun && density === 'comfortable' && (
              <Star size={7} className="text-amber-500 shrink-0" />
            )}
            {programme.isRepeat && density === 'comfortable' && (
              <RotateCcw size={7} className="shrink-0 opacity-50" style={{ color }} />
            )}
            {density !== 'micro' && (
              <span className="text-[7px] ml-auto shrink-0 opacity-50 tabular-nums" style={{ color }}>
                {formatDuration(programme.durationMinutes)}
              </span>
            )}
          </div>
        </div>
      </motion.button>

      {/* Fixed-position hover detail — escapes scroll overflow clipping */}
      {hoverTip && !dimmed && (
        <div
          className="fixed z-[200] pointer-events-none max-w-xs rounded-lg border border-border bg-card shadow-xl px-3 py-2.5"
          style={{
            left: Math.min(hoverTip.x + 12, window.innerWidth - 280),
            top: Math.max(hoverTip.y - 88, 8),
          }}
        >
          <p className="text-xs font-bold text-card-foreground leading-snug">{programme.title}</p>
          {programme.arabicTitle && (
            <p className="text-[10px] text-muted-foreground text-right mt-0.5 leading-snug" dir="rtl">
              {programme.arabicTitle}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground mt-1.5 tabular-nums">
            {programme.startTime} – {endTime} · {formatDuration(programme.durationMinutes)}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {programme.category && (
              <span
                className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${border}20`, color, border: `1px solid ${border}60` }}
              >
                {programme.category}
              </span>
            )}
            {programme.isLive && (
              <span className="text-[9px] font-bold text-green-600">LIVE</span>
            )}
            {programme.isFirstRun && (
              <span className="text-[9px] text-amber-600 font-medium">First Run</span>
            )}
            {programme.isRepeat && (
              <span className="text-[9px] text-muted-foreground">Repeat</span>
            )}
          </div>
        </div>
      )}
    </>
  );
};
