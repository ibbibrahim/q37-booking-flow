import React, { useState, useEffect } from 'react';
import { format, parseISO, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Target, LayoutList, CalendarDays, Clock } from 'lucide-react';
import type { ViewMode } from '../types/epg.types';
import qbcLight from '@/assets/QBC-light.png';
import qbcLightAr from '@/assets/QBC-light-ar.png';

interface EPGHeaderProps {
  viewMode: ViewMode;
  currentDate: string;
  onViewModeChange: (mode: ViewMode) => void;
  onNavigate: (direction: -1 | 1) => void;
  onJumpToNow: () => void;
  isLoading?: boolean;
}

export const EPGHeader: React.FC<EPGHeaderProps> = ({
  viewMode,
  currentDate,
  onViewModeChange,
  onNavigate,
  onJumpToNow,
  isLoading,
}) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateObj = parseISO(currentDate);
  const todayFlag = isToday(dateObj);
  const navLabel = viewMode === 'daily' ? 'day' : 'week';

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm px-6 py-5 flex items-center justify-between gap-4 flex-wrap"
      style={{
        background: 'linear-gradient(135deg, #0B1E3D 0%, #1B3A6B 55%, #0D2347 100%)',
      }}
    >
      {/* ── Left: logos + title ─────────────────────────────────── */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-[88px] flex items-center">
            <img src={qbcLight} alt="QBC" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="h-10 w-[84px] flex items-center">
            <img src={qbcLightAr} alt="كيو بي سي" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
        <div className="w-px h-10 bg-white/20" />
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5"
            style={{ color: '#F0B429' }}
          >
            QBC Channel
          </p>
          <h1 className="text-white text-lg font-bold leading-none tracking-tight">
            Programme Schedule
          </h1>
        </div>
      </div>

      {/* ── Right: clock + date + controls ─────────────────────── */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Live clock */}
        <div className="hidden sm:flex flex-col items-end">
          <div className="flex items-center gap-1 mb-0.5">
            <Clock size={10} className="text-white/40" />
            <span className="text-[9px] text-white/40 uppercase tracking-wider">Local Time</span>
          </div>
          <span className="text-white text-base font-bold font-mono tabular-nums leading-none">
            {format(now, 'HH:mm:ss')}
          </span>
        </div>

        <div className="hidden sm:block w-px h-8 bg-white/20" />

        {/* Date */}
        <div className="hidden md:flex flex-col items-end">
          <span
            className="text-[9px] font-bold uppercase tracking-wider mb-0.5"
            style={{ color: todayFlag ? '#F0B429' : 'rgba(255,255,255,0.4)' }}
          >
            {todayFlag ? 'TODAY' : format(dateObj, 'EEE').toUpperCase()}
          </span>
          <span className="text-white text-sm font-semibold leading-none">
            {format(dateObj, 'EEE, d MMM yyyy')}
          </span>
        </div>

        <div className="hidden md:block w-px h-8 bg-white/20" />

        {/* View toggle */}
        <div className="flex items-center bg-white/10 rounded-lg p-0.5 border border-white/20">
          <button
            onClick={() => onViewModeChange('daily')}
            title="Daily view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'daily'
                ? 'bg-white text-[#0B1E3D] shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <LayoutList size={12} />
            <span className="hidden sm:inline">Daily</span>
          </button>
          <button
            onClick={() => onViewModeChange('weekly')}
            title="Weekly view"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'weekly'
                ? 'bg-white text-[#0B1E3D] shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            <CalendarDays size={12} />
            <span className="hidden sm:inline">Weekly</span>
          </button>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-0.5 bg-white/10 rounded-lg border border-white/20">
          <button
            onClick={() => onNavigate(-1)}
            title={`Previous ${navLabel}`}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-l-lg"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => onNavigate(1)}
            title={`Next ${navLabel}`}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors rounded-r-lg"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Today / Now */}
        <button
          onClick={onJumpToNow}
          title="Jump to now"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg"
          style={{
            backgroundColor: '#F0B429',
            color: '#0B1E3D',
          }}
        >
          <Target size={12} />
          <span className="hidden sm:inline">Today</span>
        </button>

        {isLoading && (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
        )}
      </div>
    </div>
  );
};
