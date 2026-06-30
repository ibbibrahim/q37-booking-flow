import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { format, addDays, parseISO } from 'date-fns';
import type { ViewMode, Programme } from '../types/epg.types';
import { EPGHeader } from './EPGHeader';
import { DailyView } from './DailyView';
import { WeeklyView } from './WeeklyView';
import { ProgrammePanel } from './ProgrammePanel';
import { NowPlayingSection } from './NowPlayingSection';
import { WeekNavigator } from './WeekNavigator';
import { UpNextStrip } from './UpNextStrip';
import { useEPGData } from '../hooks/useEPGData';
import { useNowLine } from '../hooks/useNowLine';

export const EPGViewer: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [selectedProgramme, setSelectedProgramme] = useState<Programme | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { nowMinute } = useNowLine();

  const {
    programmes,
    weekData,
    isLoading,
    error,
    loadDay,
    loadWeek,
    invalidateDay,
    invalidateWeek,
  } = useEPGData();

  // Prefetch week data for weekly view
  useEffect(() => {
    loadWeek(currentDate);
  }, [currentDate, loadWeek]);

  // Load the current view
  useEffect(() => {
    if (viewMode === 'daily') {
      loadDay(currentDate);
    }
    // Weekly already loaded above
  }, [viewMode, currentDate, loadDay]);

  // Reset category filter when date/view changes
  useEffect(() => {
    setActiveCategory(null);
  }, [currentDate, viewMode]);

  const handleCardClick = useCallback((prog: Programme) => {
    setSelectedProgramme(prog);
    setPanelOpen(true);
  }, []);

  const handleDayClick = useCallback((date: string) => {
    setCurrentDate(date);
    setViewMode('daily');
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleNavigate = useCallback((direction: -1 | 1) => {
    setCurrentDate(prev => {
      const d = parseISO(prev);
      const days = viewMode === 'weekly' ? 7 * direction : direction;
      return format(addDays(d, days), 'yyyy-MM-dd');
    });
  }, [viewMode]);

  const handleNavigateWeek = useCallback((direction: -1 | 1) => {
    setCurrentDate(prev => format(addDays(parseISO(prev), 7 * direction), 'yyyy-MM-dd'));
  }, []);

  const handleJumpToNow = useCallback(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setViewMode('daily');
    setCurrentDate(today);
  }, []);

  const handleRetry = useCallback(() => {
    if (viewMode === 'daily') {
      invalidateDay(currentDate);
      loadDay(currentDate);
    } else {
      invalidateWeek(currentDate);
      loadWeek(currentDate);
    }
  }, [viewMode, currentDate, invalidateDay, invalidateWeek, loadDay, loadWeek]);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2 pb-8 bg-muted/30">
      <div className="flex flex-col gap-6 sm:gap-8">

      {/* ── 1. Header (dark gradient card) ─────────────────────── */}
      <EPGHeader
        viewMode={viewMode}
        currentDate={currentDate}
        onViewModeChange={handleViewModeChange}
        onNavigate={handleNavigate}
        onJumpToNow={handleJumpToNow}
        isLoading={isLoading}
      />

      {/* ── 2. Now Playing cards ───────────────────────────────── */}
      <NowPlayingSection
        programmes={programmes}
        nowMinute={nowMinute}
        isLoading={isLoading && programmes.length === 0}
      />

      {/* ── 3. Week Navigator card ───────────────────────────── */}
      <WeekNavigator
        currentDate={currentDate}
        onDayClick={handleDayClick}
        onNavigateWeek={handleNavigateWeek}
      />

      {/* ── 4. Main content cards (timeline or weekly grid) ────── */}
      <AnimatePresence mode="wait">
        {viewMode === 'daily' ? (
          <DailyView
            key={`daily-${currentDate}`}
            date={currentDate}
            programmes={programmes}
            isLoading={isLoading}
            error={error}
            onCardClick={handleCardClick}
            onRetry={handleRetry}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        ) : (
          <WeeklyView
            key={`weekly-${currentDate}`}
            currentDate={currentDate}
            weekData={weekData}
            isLoading={isLoading}
            error={error}
            onCardClick={handleCardClick}
            onDayClick={handleDayClick}
            onRetry={handleRetry}
          />
        )}
      </AnimatePresence>

      {/* ── 5. Up Next strip card (daily view only) ────────────── */}
      {viewMode === 'daily' && !isLoading && programmes.length > 0 && (
        <UpNextStrip
          programmes={programmes}
          nowMinute={nowMinute}
          onCardClick={handleCardClick}
        />
      )}

      {/* ── 6. Slide-in detail panel ───────────────────────────── */}
      <AnimatePresence>
        {panelOpen && selectedProgramme && (
          <ProgrammePanel
            key="programme-panel"
            programme={selectedProgramme}
            onClose={() => setPanelOpen(false)}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};
