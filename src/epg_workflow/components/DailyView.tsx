import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { isToday, parseISO, format } from 'date-fns';
import { RefreshCw, CalendarX, Rows3, Layers } from 'lucide-react';
import type { Programme } from '../types/epg.types';
import {
  PX_PER_MIN, TIMELINE_WIDTH, LANE_HEIGHT, RULER_HEIGHT,
  CHANNEL_COL_WIDTH, CATEGORY_STYLES,
} from '../types/epg.types';
import { ProgrammeCard } from './ProgrammeCard';
import { NowLine } from './NowLine';
import { SkeletonCard } from './SkeletonCard';
import { useNowLine } from '../hooks/useNowLine';
import channelLogo from '@/assets/android-chrome-512x512.png';

const HOURS = Array.from({ length: 25 }, (_, i) => i);

// ── Lane helpers ─────────────────────────────────────────────────────────

type LaneKey = 'news' | 'programs' | 'outdoor' | 'other';

interface LaneInfo {
  key: LaneKey;
  label: string;
  color: string;
  bgColor: string;
  order: number;
}

const LANE_DEFINITIONS: LaneInfo[] = [
  { key: 'news',     label: 'News Studio',     color: '#3B82F6', bgColor: '#EFF6FF', order: 1 },
  { key: 'programs', label: 'Programs Studio', color: '#8B5CF6', bgColor: '#F5F3FF', order: 2 },
  { key: 'outdoor',  label: 'Outdoor',         color: '#F59E0B', bgColor: '#FFFBEB', order: 3 },
  { key: 'other',    label: 'Other Facilities', color: '#6B7280', bgColor: '#F9FAFB', order: 4 },
];

function normalizeLocationKey(location: string): LaneKey {
  const lower = location.toLowerCase();
  if (lower.includes('news')) return 'news';
  if (lower.includes('program')) return 'programs';
  if (lower.includes('outdoor')) return 'outdoor';
  return 'other';
}

interface Lane extends LaneInfo {
  programmes: Programme[];
}

function buildLanes(programmes: Programme[]): Lane[] {
  const grouped = new Map<LaneKey, Programme[]>(
    LANE_DEFINITIONS.map(def => [def.key, [] as Programme[]])
  );

  programmes.forEach(prog => {
    const key = normalizeLocationKey(prog.location);
    grouped.get(key)!.push(prog);
  });

  // Always show News + Programs + Other; show Outdoor only when it has programmes
  return LANE_DEFINITIONS
    .filter(def => def.key !== 'outdoor' || (grouped.get('outdoor')?.length ?? 0) > 0)
    .map(def => ({
      ...def,
      programmes: grouped.get(def.key) ?? [],
    }));
}

// ── Component ─────────────────────────────────────────────────────────────

interface DailyViewProps {
  date: string;
  programmes: Programme[];
  isLoading: boolean;
  error: string | null;
  onCardClick: (p: Programme) => void;
  onRetry: () => void;
  activeCategory?: string | null;
  onCategoryChange?: (cat: string | null) => void;
}

export const DailyView: React.FC<DailyViewProps> = ({
  date,
  programmes,
  isLoading,
  error,
  onCardClick,
  onRetry,
  activeCategory,
  onCategoryChange,
}) => {
  const [splitByStudio, setSplitByStudio] = useState(false);
  const { nowPx, formatNowTime } = useNowLine();
  const containerRef = useRef<HTMLDivElement>(null);
  const isCurrentDay = isToday(parseISO(date));

  // Group programmes into lanes (only used when splitByStudio is on)
  const lanes = useMemo(() => buildLanes(programmes), [programmes]);

  const displayLanes: Lane[] = useMemo(() => {
    if (splitByStudio) return lanes;
    return [{
      key: 'other' as LaneKey,
      label: 'Combined',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      order: 0,
      programmes,
    }];
  }, [splitByStudio, lanes, programmes]);

  const numLanes = displayLanes.length;

  // Auto-scroll to current time on load
  useEffect(() => {
    if (!containerRef.current) return;
    if (!isCurrentDay) {
      containerRef.current.scrollLeft = 0;
      return;
    }
    const el = containerRef.current;
    const target = Math.max(0, nowPx - el.clientWidth / 3);
    el.scrollTo({ left: target, behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isCurrentDay, splitByStudio]);

  // Category counts
  const categoryCounts = useMemo(() =>
    programmes.reduce<Record<string, number>>((acc, p) => {
      if (p.category) acc[p.category] = (acc[p.category] || 0) + 1;
      return acc;
    }, {}),
    [programmes]
  );
  const categories = useMemo(() => Object.keys(categoryCounts).sort(), [categoryCounts]);

  // ── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-sm flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <CalendarX size={24} className="text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-card-foreground">Failed to load schedule</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      </div>
    );
  }

  const skeletonWidths = [120, 240, 180, 360, 300, 180, 240, 120, 480, 240, 180];

  return (
    <motion.div
      key={date}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-6 sm:gap-8"
    >
      {/* ── Filter bar card ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-5 py-3.5 rounded-xl border border-border bg-card shadow-sm overflow-x-auto">
        {!isLoading && categories.length > 0 && onCategoryChange && (
          <>
            <button
              onClick={() => onCategoryChange(null)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                !activeCategory
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-card-foreground hover:bg-muted'
              }`}
            >
              All · {programmes.length}
            </button>
            {categories.map(cat => {
              const style = CATEGORY_STYLES[cat];
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onCategoryChange(isActive ? null : cat)}
                  className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border"
                  style={isActive
                    ? { backgroundColor: style?.border ?? '#888', color: '#fff', borderColor: style?.border ?? '#888' }
                    : { color: style?.color ?? '#555', borderColor: `${style?.border ?? '#888'}50`, backgroundColor: `${style?.bg ?? '#eee'}` }
                  }
                >
                  {cat} · {categoryCounts[cat]}
                </button>
              );
            })}
          </>
        )}

        {/* Studio view toggle — always visible */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0 pl-3 border-l border-border">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:inline">
            Studio
          </span>
          <div className="flex items-center bg-muted rounded-lg p-0.5 border border-border">
            <button
              onClick={() => setSplitByStudio(false)}
              title="All programmes on one timeline"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                !splitByStudio
                  ? 'bg-card text-primary shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <Rows3 size={11} />
              <span className="hidden sm:inline">Combined</span>
            </button>
            <button
              onClick={() => setSplitByStudio(true)}
              title="Separate rows per studio"
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                splitByStudio
                  ? 'bg-card text-primary shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-card-foreground'
              }`}
            >
              <Layers size={11} />
              <span className="hidden sm:inline">By Studio</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Timeline card ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Timeline sub-header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-card-foreground">
              {format(parseISO(date), 'EEEE, d MMM yyyy')}
            </span>
            {isCurrentDay && (
              <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500 text-white">
                Live
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3">
            {LANE_DEFINITIONS.filter(d => d.key !== 'other').map(def => (
              <span key={def.key} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color }} />
                {def.label.replace(' Studio', '').replace(' Facilities', '')}
              </span>
            ))}
          </div>
        </div>

        <div className="flex overflow-hidden">

        {/* ── Fixed left column ─────────────────────────────────────── */}
        <div
          className="shrink-0 flex flex-col border-r border-border bg-card z-10"
          style={{ width: CHANNEL_COL_WIDTH }}
        >
          {/* Ruler spacer (aligns with time axis) */}
          <div
            className="border-b border-border bg-muted/30 shrink-0"
            style={{ height: RULER_HEIGHT }}
          />

          {/* Lane labels */}
          {isLoading
            ? (splitByStudio
                ? LANE_DEFINITIONS.filter(d => d.key !== 'outdoor').map(def => (
                    <div
                      key={def.key}
                      className="flex items-center gap-2 px-2 border-b border-border"
                      style={{ height: LANE_HEIGHT, borderLeftColor: def.color, borderLeftWidth: 3 }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: `${def.color}60` }} />
                      <div className="space-y-1">
                        <div className="h-2 w-10 rounded bg-muted animate-pulse" />
                        <div className="h-2.5 w-20 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))
                : (
                    <div
                      className="flex items-center justify-center px-2 border-b border-border"
                      style={{ height: LANE_HEIGHT }}
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted animate-pulse" />
                    </div>
                  ))
            : displayLanes.map(lane => (
                  <div
                    key={splitByStudio ? lane.key : 'combined'}
                    className={`border-b border-border last:border-b-0 ${
                      splitByStudio
                        ? 'flex flex-col justify-center gap-0.5 px-2.5'
                        : 'flex items-center justify-center px-2'
                    }`}
                    style={{
                      height: LANE_HEIGHT,
                      borderLeftColor: splitByStudio ? lane.color : '#3B82F6',
                      borderLeftWidth: 3,
                    }}
                  >
                    {splitByStudio ? (
                      <>
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground leading-none">
                          LANE
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: lane.color }} />
                          <span className="text-[11px] font-bold leading-tight" style={{ color: lane.color }}>
                            {lane.label}
                          </span>
                        </div>
                        <span className="text-[9px] text-muted-foreground leading-none">
                          {lane.programmes.length === 0 ? 'No programmes' : `${lane.programmes.length} prog.`}
                        </span>
                      </>
                    ) : (
                      <img
                        src={channelLogo}
                        alt="QBC"
                        className="w-10 h-10 rounded-xl object-contain"
                      />
                    )}
                  </div>
                ))
          }
        </div>

        {/* ── Scrollable timeline ───────────────────────────────────── */}
        <div
          ref={containerRef}
          className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden"
          style={{ scrollBehavior: 'smooth' }}
        >
          <div
            className="relative"
            style={{ width: TIMELINE_WIDTH, minWidth: TIMELINE_WIDTH }}
          >
            {/* Time ruler */}
            <div
              className="relative bg-muted/40 border-b border-border"
              style={{ height: RULER_HEIGHT }}
            >
              {HOURS.map(hour => (
                <div
                  key={hour}
                  className="absolute top-0 flex flex-col items-start"
                  style={{ left: hour * 60 * PX_PER_MIN }}
                >
                  <div className="w-px bg-border" style={{ height: RULER_HEIGHT * 0.45 }} />
                  <span className="text-[10px] text-muted-foreground font-medium pl-1 leading-none mt-0.5">
                    {hour === 24 ? '' : `${String(hour).padStart(2, '0')}:00`}
                  </span>
                </div>
              ))}
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={`h-${h}`}
                  className="absolute top-0 w-px bg-border/50"
                  style={{ left: (h * 60 + 30) * PX_PER_MIN, height: RULER_HEIGHT * 0.25 }}
                />
              ))}
              {/* NOW marker in ruler */}
              {isCurrentDay && (
                <div
                  className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded-sm leading-none z-10 pointer-events-none"
                  style={{ left: nowPx, top: 2 }}
                >
                  NOW
                </div>
              )}
            </div>

            {/* Lanes area (NowLine positions relative to this) */}
            <div className="relative">

              {/* NowLine spans all lanes */}
              {isCurrentDay && !isLoading && (
                <NowLine
                  nowPx={nowPx}
                  timeLabel={formatNowTime()}
                  height={numLanes * LANE_HEIGHT}
                />
              )}

              {/* Loading skeleton rows */}
              {isLoading && (
                splitByStudio ? (
                  <>
                    {LANE_DEFINITIONS.filter(d => d.key !== 'outdoor').map((def, laneIdx) => (
                      <div
                        key={def.key}
                        className="relative border-b border-border"
                        style={{ height: LANE_HEIGHT, backgroundColor: `${def.bgColor}40` }}
                      >
                        {(() => {
                          let cursor = laneIdx * 80;
                          return skeletonWidths.slice(0, 4).map((w, i) => {
                            const left = cursor;
                            cursor += w + 4;
                            return (
                              <div key={i} className="absolute top-0" style={{ left }}>
                                <SkeletonCard width={w} index={i + laneIdx * 4} variant="timeline" />
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ))}
                  </>
                ) : (
                  <div
                    className="relative border-b border-border"
                    style={{ height: LANE_HEIGHT }}
                  >
                    {(() => {
                      let cursor = 0;
                      return skeletonWidths.map((w, i) => {
                        const left = cursor;
                        cursor += w + 4;
                        return (
                          <div key={i} className="absolute top-0" style={{ left }}>
                            <SkeletonCard width={w} index={i} variant="timeline" />
                          </div>
                        );
                      });
                    })()}
                  </div>
                )
              )}

              {/* Lane rows */}
              {!isLoading && displayLanes.map(lane => (
                <div
                  key={splitByStudio ? lane.key : 'combined'}
                  className="relative border-b border-border"
                  style={{ height: LANE_HEIGHT, backgroundColor: splitByStudio ? `${lane.bgColor}40` : undefined }}
                >
                  {HOURS.map(hour => (
                    <div
                      key={hour}
                      className="absolute top-0 bottom-0 w-px bg-border/15"
                      style={{ left: hour * 60 * PX_PER_MIN }}
                    />
                  ))}
                  {lane.programmes.map((prog, i) => (
                    <ProgrammeCard
                      key={prog.id}
                      programme={prog}
                      onClick={onCardClick}
                      index={i}
                      variant="timeline"
                      dimmed={!!activeCategory && prog.category !== activeCategory}
                    />
                  ))}
                </div>
              ))}

              {!isLoading && programmes.length === 0 && (
                <div
                  className="relative border-b border-border flex items-center justify-center"
                  style={{ height: LANE_HEIGHT }}
                >
                  <div className="text-center">
                    <CalendarX size={20} className="mx-auto text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">No programmes scheduled</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Footer */}
        {!isLoading && programmes.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {programmes.length} programme{programmes.length !== 1 ? 's' : ''}
              {splitByStudio
                ? ` · ${numLanes} lane${numLanes !== 1 ? 's' : ''}`
                : ' · combined view'}
            </p>
            {isCurrentDay && (
              <p className="text-xs text-primary font-medium">
                Live indicator · {formatNowTime()}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
