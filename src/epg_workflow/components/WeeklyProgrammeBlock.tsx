import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import type { Programme } from '../types/epg.types';
import { WEEKLY_BLOCK_INSET, WEEKLY_PX_PER_MIN } from '../types/epg.types';

interface WeeklyProgrammeBlockProps {
  programme: Programme;
  onClick: (programme: Programme) => void;
  index?: number;
}

interface BlockColors {
  gradient: string;
  fg: string;
  border: string;
  shadow: string;
}

/** QBC weekly-plan palette — base hues matched to Excel, rendered with soft gradients. */
const PALETTE = {
  newsLive: { base: '#92D050', fg: '#1a2e0a' },
  newsRepeat: { base: '#00B050', fg: '#0a2818' },
  mojazLive: { base: '#548235', fg: '#FFFFFF' },
  aswaqLive: { base: '#FF0000', fg: '#3d0a0a' },
  aswaqRepeat: { base: '#FF00FF', fg: '#3d0a3d' },
  aswaqContinue: { base: '#7030A0', fg: '#FFFFFF' },
  documentary: { base: '#FFFF00', fg: '#3d3a00' },
  trends: { base: '#FF0066', fg: '#3d0a22' },
  salaamRepeat: { base: '#C00000', fg: '#FFFFFF' },
  salaamLive: { base: '#ED7D31', fg: '#3d2208' },
  eqtisad: { base: '#A6A6A6', fg: '#2a2a2a' },
  klakeet: { base: '#9966FF', fg: '#2a184d' },
  sanad: { base: '#70AD47', fg: '#1a2e0a' },
  business: { base: '#00B0F0', fg: '#083d4d' },
  firstRunStripe: { base: '#FFFF00', fg: '#3d3a00' },
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount;
  return rgbToHex(
    r + (target[0] - r) * t,
    g + (target[1] - g) * t,
    b + (target[2] - b) * t,
  );
}

function softGradient(base: string): string {
  const highlight = mix(base, [255, 255, 255], 0.22);
  const mid = mix(base, [255, 255, 255], 0.06);
  const depth = mix(base, [0, 0, 0], 0.14);
  return `linear-gradient(168deg, ${highlight} 0%, ${mid} 42%, ${base} 72%, ${depth} 100%)`;
}

function softBorder(base: string): string {
  return mix(base, [0, 0, 0], 0.28);
}

function softShadow(base: string): string {
  const [r, g, b] = hexToRgb(mix(base, [0, 0, 0], 0.35));
  return `0 1px 2px rgba(${r}, ${g}, ${b}, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.28)`;
}

function paletteToBlockColors(entry: { base: string; fg: string }): BlockColors {
  return {
    gradient: softGradient(entry.base),
    fg: entry.fg,
    border: softBorder(entry.base),
    shadow: softShadow(entry.base),
  };
}

const EXCEL_COLORS = {
  newsLive: paletteToBlockColors(PALETTE.newsLive),
  newsRepeat: paletteToBlockColors(PALETTE.newsRepeat),
  mojazLive: paletteToBlockColors(PALETTE.mojazLive),
  aswaqLive: paletteToBlockColors(PALETTE.aswaqLive),
  aswaqRepeat: paletteToBlockColors(PALETTE.aswaqRepeat),
  aswaqContinue: paletteToBlockColors(PALETTE.aswaqContinue),
  documentary: paletteToBlockColors(PALETTE.documentary),
  trends: paletteToBlockColors(PALETTE.trends),
  salaamRepeat: paletteToBlockColors(PALETTE.salaamRepeat),
  salaamLive: paletteToBlockColors(PALETTE.salaamLive),
  eqtisad: paletteToBlockColors(PALETTE.eqtisad),
  klakeet: paletteToBlockColors(PALETTE.klakeet),
  sanad: paletteToBlockColors(PALETTE.sanad),
  business: paletteToBlockColors(PALETTE.business),
  firstRunStripe: {
    gradient: softGradient(PALETTE.firstRunStripe.base),
    fg: PALETTE.firstRunStripe.fg,
  },
} as const;

function titleText(prog: Programme): string {
  return `${prog.title} ${prog.tvGuideTitle ?? ''}`.toLowerCase();
}

function matches(prog: Programme, ...patterns: RegExp[]): boolean {
  const t = titleText(prog);
  return patterns.some(p => p.test(t));
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, '0')}`;
}

function isPremiereFirstRun(prog: Programme): boolean {
  return prog.premiereMode?.trim().toLowerCase() === 'first run';
}

function weeklyBlockTitle(prog: Programme): string {
  const fromApi = prog.title?.trim() || prog.tvGuideTitle?.trim() || 'Untitled';
  return fromApi.length > 56 ? `${fromApi.slice(0, 56)}…` : fromApi;
}

function weeklyBlockColors(prog: Programme): BlockColors {
  if (prog.category === 'Documentary' || matches(prog, /documentary/, /^doc\b/)) {
    return EXCEL_COLORS.documentary;
  }

  if (matches(prog, /salaat|saleet|solaat|aamal.*mojuz/)) {
    if (prog.isLive) return EXCEL_COLORS.salaamLive;
    return EXCEL_COLORS.salaamRepeat;
  }

  if (matches(prog, /mojaz\s*news|^mojaz\b/)) {
    return EXCEL_COLORS.mojazLive;
  }

  if (prog.category === 'News' || matches(prog, /\bnews\b/, /nws\d/)) {
    if (prog.isLive) return EXCEL_COLORS.newsLive;
    return EXCEL_COLORS.newsRepeat;
  }

  if (matches(prog, /aswaq|hadith al aswaq/)) {
    if (prog.isLive) return EXCEL_COLORS.aswaqLive;
    if (matches(prog, /continue/)) return EXCEL_COLORS.aswaqContinue;
    return EXCEL_COLORS.aswaqRepeat;
  }

  if (matches(prog, /trend/)) {
    return EXCEL_COLORS.trends;
  }

  if (matches(prog, /eqtisad al mondial/)) {
    return EXCEL_COLORS.eqtisad;
  }

  if (matches(prog, /klakeet/)) {
    return EXCEL_COLORS.klakeet;
  }

  if (matches(prog, /sanad/)) {
    return EXCEL_COLORS.sanad;
  }

  if (matches(prog, /filler|destination/)) {
    return EXCEL_COLORS.business;
  }

  return EXCEL_COLORS.business;
}

export const WeeklyProgrammeBlock: React.FC<WeeklyProgrammeBlockProps> = ({
  programme,
  onClick,
  index = 0,
}) => {
  const [hoverTip, setHoverTip] = useState<{ x: number; y: number } | null>(null);

  const colors = weeklyBlockColors(programme);
  const title = weeklyBlockTitle(programme);
  const top = programme.startMinute * WEEKLY_PX_PER_MIN + WEEKLY_BLOCK_INSET;
  const height = Math.max(
    programme.durationMinutes * WEEKLY_PX_PER_MIN - WEEKLY_BLOCK_INSET * 2,
    6,
  );
  const endMinute = programme.startMinute + programme.durationMinutes;
  const endTime = minutesToTime(endMinute);
  const showText = height >= 18;
  const showFirstRun = isPremiereFirstRun(programme) && height >= 14;

  const showHoverTip = useCallback((e: React.MouseEvent) => {
    setHoverTip({ x: e.clientX, y: e.clientY });
  }, []);
  const hideHoverTip = useCallback(() => setHoverTip(null), []);

  return (
    <>
      <motion.button
        type="button"
        onClick={() => onClick(programme)}
        onMouseEnter={showHoverTip}
        onMouseMove={showHoverTip}
        onMouseLeave={hideHoverTip}
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.015, duration: 0.2 }}
        whileHover={{ scale: 1.02, zIndex: 30 }}
        whileTap={{ scale: 0.98 }}
        className="absolute left-0.5 right-0.5 overflow-hidden cursor-pointer rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 text-left group transition-shadow duration-200 group-hover:shadow-md"
        style={{
          top,
          height,
          background: colors.gradient,
          color: colors.fg,
          border: `1px solid ${colors.border}`,
          boxShadow: colors.shadow,
          zIndex: hoverTip ? 40 : 2,
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/5"
          aria-hidden
        />
        <div
          className={`relative flex h-full items-center justify-center px-1.5 py-1 ${
            showFirstRun ? 'pr-5' : ''
          }`}
        >
          {showText && (
            <p
              className={`w-full text-center font-semibold leading-snug ${
                height < 32
                  ? 'text-[10px] line-clamp-2'
                  : height < 52
                    ? 'text-[11px] line-clamp-3'
                    : 'text-xs line-clamp-4'
              }`}
            >
              {title}
            </p>
          )}
        </div>

        {showFirstRun && (
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center justify-center border-l border-black/15"
            style={{
              width: 18,
              background: EXCEL_COLORS.firstRunStripe.gradient,
            }}
          >
            <span
              className="text-[8px] font-bold uppercase tracking-wide"
              style={{
                color: EXCEL_COLORS.firstRunStripe.fg,
                writingMode: 'vertical-rl',
                transform: 'rotate(180deg)',
              }}
            >
              First Run
            </span>
          </div>
        )}
      </motion.button>

      {hoverTip && (
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
            {programme.startTime} – {endTime}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {programme.category && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {programme.category}
              </span>
            )}
            {programme.isLive && <span className="text-[9px] font-bold text-green-600">LIVE</span>}
            {isPremiereFirstRun(programme) && (
              <span className="text-[9px] text-amber-600 font-medium">First Run</span>
            )}
            {programme.isRepeat && <span className="text-[9px] text-muted-foreground">Repeat</span>}
          </div>
        </div>
      )}
    </>
  );
};
