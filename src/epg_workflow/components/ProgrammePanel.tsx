import React from 'react';
import { motion } from 'motion/react';
import {
  X, Clock, Tag, Film, Star, RotateCcw, Radio, User, Hash, Tv,
} from 'lucide-react';
import type { Programme } from '../types/epg.types';
import { CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE } from '../types/epg.types';
import { useTheme } from '@/contexts/ThemeContext';

interface ProgrammePanelProps {
  programme: Programme;
  onClose: () => void;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} hr`;
  return `${h} hr ${m} min`;
}

interface DetailRowProps {
  icon: React.ElementType;
  label: string;
  value: string | undefined;
}

const DetailRow: React.FC<DetailRowProps> = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 w-5 flex items-center justify-center">
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-card-foreground break-words">{value}</p>
      </div>
    </div>
  );
};

export const ProgrammePanel: React.FC<ProgrammePanelProps> = ({ programme, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const catStyle = CATEGORY_STYLES[programme.category] ?? DEFAULT_CATEGORY_STYLE;
  const bg     = isDark ? catStyle.darkBg   : catStyle.bg;
  const color  = isDark ? catStyle.darkColor : catStyle.color;
  const border = catStyle.border;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/40 z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.aside
        className="fixed right-0 top-0 h-full w-full max-w-sm bg-card border-l border-border z-50 flex flex-col shadow-2xl overflow-hidden"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 340, damping: 36 }}
      >
        {/* Category colour header */}
        <div
          className="shrink-0 px-5 pt-5 pb-4"
          style={{ backgroundColor: bg, borderBottom: `2px solid ${border}` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Category badge */}
              {programme.category && (
                <span
                  className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                  style={{
                    backgroundColor: `${border}25`,
                    color,
                    border: `1px solid ${border}`,
                  }}
                >
                  {programme.category}
                </span>
              )}

              {/* Live badge */}
              {programme.isLive && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 mb-2"
                  style={{ backgroundColor: '#22c55e20', color: '#16a34a', border: '1px solid #22c55e' }}
                >
                  <Radio size={8} className="animate-pulse" />
                  LIVE
                </span>
              )}

              {/* Title */}
              <h2 className="text-base font-bold leading-snug" style={{ color }}>
                {programme.title}
              </h2>

              {/* Arabic title */}
              {programme.arabicTitle && (
                <p
                  className="text-sm mt-1 text-right font-medium leading-snug opacity-90"
                  style={{ color, direction: 'rtl' }}
                >
                  {programme.arabicTitle}
                </p>
              )}

              {/* TV Guide title */}
              {programme.tvGuideTitle && programme.tvGuideTitle !== programme.title && (
                <p className="text-xs mt-1 opacity-70" style={{ color }}>
                  {programme.tvGuideTitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-colors"
              style={{ color }}
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {programme.isFirstRun && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 px-2 py-0.5 rounded-full">
                <Star size={9} /> First Run
              </span>
            )}
            {programme.isRepeat && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                <RotateCcw size={9} /> Repeat
              </span>
            )}
            {programme.premiereMode && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 border border-primary/30 px-2 py-0.5 rounded-full">
                <Tv size={9} /> {programme.premiereMode}
              </span>
            )}
          </div>
        </div>

        {/* Details body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <DetailRow
            icon={Clock}
            label="Airtime"
            value={`${programme.startTime} · ${formatDuration(programme.durationMinutes)}`}
          />
          <DetailRow
            icon={Tag}
            label="Category"
            value={programme.category || undefined}
          />
          <DetailRow
            icon={Film}
            label="Genre"
            value={programme.genre || undefined}
          />
          <DetailRow
            icon={User}
            label="Cast / Presenter"
            value={programme.cast || undefined}
          />
          <DetailRow
            icon={Clock}
            label="Nominal Duration"
            value={programme.nominalDuration || undefined}
          />
          <DetailRow
            icon={Hash}
            label="House Number"
            value={programme.houseNumber || undefined}
          />

          {/* Raw arabic title again full */}
          {programme.arabicTitle && (
            <div className="rounded-lg border border-border p-3 bg-muted/30" dir="rtl">
              <p className="text-xs text-muted-foreground mb-1 text-right">العنوان بالعربية</p>
              <p className="text-sm font-semibold text-card-foreground text-right">
                {programme.arabicTitle}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border px-5 py-3">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </motion.aside>
    </>
  );
};
