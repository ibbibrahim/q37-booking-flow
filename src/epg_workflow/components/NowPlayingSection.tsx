import React from 'react';
import { motion } from 'motion/react';
import { Radio, ChevronRight, Star, RotateCcw, Tv, CalendarDays } from 'lucide-react';
import type { Programme } from '../types/epg.types';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../types/epg.types';
import { useTheme } from '@/contexts/ThemeContext';
import channelLogo from '@/assets/android-chrome-512x512.png';

interface NowPlayingSectionProps {
  programmes: Programme[];
  nowMinute: number;
  isLoading: boolean;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function progressPercent(prog: Programme, nowMinute: number): number {
  const elapsed = nowMinute - prog.startMinute;
  return Math.min(100, Math.max(0, (elapsed / prog.durationMinutes) * 100));
}

function minutesRemaining(prog: Programme, nowMinute: number): number {
  return Math.max(0, prog.startMinute + prog.durationMinutes - nowMinute);
}

interface CardProps {
  label: string;
  programme: Programme | null;
  nowMinute: number;
  isOnAir?: boolean;
  accent?: string;
}

const ProgrammeInfoCard: React.FC<CardProps> = ({ label, programme, nowMinute, isOnAir, accent }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const catStyle = programme
    ? (CATEGORY_STYLES[programme.category] ?? DEFAULT_CATEGORY_STYLE)
    : DEFAULT_CATEGORY_STYLE;
  const bg = isDark ? catStyle.darkBg : catStyle.bg;
  const color = isDark ? catStyle.darkColor : catStyle.color;
  const border = catStyle.border;

  const progress = programme && isOnAir ? progressPercent(programme, nowMinute) : null;
  const remaining = programme && isOnAir ? minutesRemaining(programme, nowMinute) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex-1 min-w-0 rounded-xl border overflow-hidden"
      style={{ borderColor: programme ? border : undefined }}
    >
      {/* Card header stripe */}
      <div
        className="px-3 py-1.5 flex items-center justify-between"
        style={{ backgroundColor: programme ? `${border}20` : undefined }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent ?? border ?? '#aaa' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent ?? color }}>
            {label}
          </span>
        </div>
        {isOnAir && programme && (
          <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400">
            <Radio size={8} className="animate-pulse" />
            ON AIR
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="p-3" style={{ backgroundColor: programme ? bg : undefined }}>
        {!programme ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Tv size={14} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Off Air</p>
              <p className="text-[10px] text-muted-foreground">No further programmes</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2.5">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border"
                style={{ borderColor: `${border}40` }}>
                <img src={channelLogo} alt="Channel" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold leading-tight line-clamp-1" style={{ color }}>
                  {programme.title}
                </p>
                {programme.arabicTitle && (
                  <p className="text-[10px] text-right mt-0.5 opacity-70 truncate" style={{ color, direction: 'rtl' }}>
                    {programme.arabicTitle}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-semibold" style={{ color }}>{programme.startTime}</span>
                  {remaining !== null && (
                    <span className="text-[10px] text-muted-foreground">
                      {remaining}m remaining
                    </span>
                  )}
                  {!isOnAir && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDuration(programme.durationMinutes)}
                    </span>
                  )}
                  {programme.category && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ backgroundColor: `${border}25`, color, border: `1px solid ${border}` }}
                    >
                      {programme.category}
                    </span>
                  )}
                  {programme.isFirstRun && (
                    <span className="flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                      <Star size={7} /> First Run
                    </span>
                  )}
                  {programme.isRepeat && (
                    <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground">
                      <RotateCcw size={7} /> Repeat
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress bar for on-air */}
            {progress !== null && (
              <div className="mt-2.5 h-1 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: border }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export const NowPlayingSection: React.FC<NowPlayingSectionProps> = ({
  programmes,
  nowMinute,
  isLoading,
}) => {
  const onAir = programmes.find(
    p => p.startMinute <= nowMinute && nowMinute < p.startMinute + p.durationMinutes
  ) ?? null;

  const upNext = programmes.find(p => p.startMinute > nowMinute) ?? null;

  const totalToday = programmes.length;
  const liveCount = programmes.filter(p => p.isLive).length;
  const remaining = programmes.filter(p => p.startMinute > nowMinute).length;

  if (isLoading) {
    return (
      <div className="flex gap-4 sm:gap-5">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-[96px] rounded-xl border border-border bg-card shadow-sm animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 sm:gap-5">
        {/* On Air Now */}
        <ProgrammeInfoCard
          label="On Air Now"
          programme={onAir}
          nowMinute={nowMinute}
          isOnAir
          accent="#22c55e"
        />

        {/* Up Next */}
        <ProgrammeInfoCard
          label="Up Next"
          programme={upNext}
          nowMinute={nowMinute}
          accent="#3b82f6"
        />

        {/* Today stats card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-36 shrink-0 rounded-xl border border-border bg-card shadow-sm flex flex-col justify-center px-4 py-3 gap-2.5 hidden sm:flex"
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays size={13} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Today</p>
              <p className="text-base font-bold text-card-foreground leading-none">{totalToday}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Radio size={13} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Live Shows</p>
              <p className="text-base font-bold text-card-foreground leading-none">{liveCount}</p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-[9px] text-muted-foreground">{remaining} remaining</span>
            <ChevronRight size={11} className="text-muted-foreground" />
          </div>
        </motion.div>
    </div>
  );
};
