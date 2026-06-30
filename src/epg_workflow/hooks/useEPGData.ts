import { useState, useRef, useCallback } from 'react';
import { format, addDays, startOfWeek, parseISO } from 'date-fns';
import axios from 'axios';
import apiClient from '@/utils/apiClient';
import type { Programme, BcmResponse } from '../types/epg.types';

const CHANNEL_ID = 1;

function buildUrl(fromDate: string, toDate: string): string {
  const params = new URLSearchParams({
    fromDate,
    toDate,
    channels: String(CHANNEL_ID),
  });
  return `/api/epg/schedules?${params.toString()}`;
}

function parseDurationMinutes(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return Math.max(1, h * 60 + m);
}

function timeToMinutes(time: string): number {
  if (!time) return 0;
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

type TitleEntry = { titleType?: string; language?: string; lang?: string; value?: string };

function findTitle(titles: TitleEntry[] | undefined, ...keywords: string[]): string | undefined {
  if (!titles?.length) return undefined;
  return titles.find(t => {
    const field = (t.lang ?? t.language ?? t.titleType ?? '').toLowerCase();
    return keywords.some(k => field.includes(k));
  })?.value;
}

function extractSetLocation(i: Record<string, unknown>): string {
  const raw = i.setLocations ?? i.setLocation;
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  return String(raw).trim();
}

function parseBoolFlag(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  return s !== '' && s !== 'no' && s !== 'false' && s !== '0';
}

function formatCast(cast: unknown): string | undefined {
  if (cast == null) return undefined;
  if (typeof cast === 'string') return cast || undefined;
  if (Array.isArray(cast)) {
    const names = cast
      .map(entry => (typeof entry === 'object' && entry && 'name' in entry ? String((entry as { name?: string }).name ?? '') : ''))
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : undefined;
  }
  return undefined;
}

function parseItems(items: unknown[]): Programme[] {
  return items.map((item: unknown, idx: number) => {
    const i = item as Record<string, unknown>;
    const additionalTitle = i.additionalTitle as TitleEntry[] | undefined;
    const startMinute = timeToMinutes((i.tvGuideTime as string) || '00:00');
    const durationMinutes = parseDurationMinutes((i.duration as string) || '00:30:00:00');
    const eventId = i.eventID ?? i.eventId;

    return {
      id: eventId != null ? `prog-${eventId}` : `prog-${idx}-${i.tvGuideTime ?? idx}`,
      startMinute,
      durationMinutes,
      startTime: (i.tvGuideTime as string) || '00:00',
      title: (i.title as string) || 'Untitled',
      arabicTitle: findTitle(additionalTitle, 'arabic', 'ar'),
      tvGuideTitle: findTitle(additionalTitle, 'tvguide', 'guide'),
      cast: formatCast(i.cast),
      category: (i.progCat as { value?: string } | undefined)?.value || '',
      genre: (i.genre as { value?: string } | undefined)?.value || '',
      isLive: parseBoolFlag(i.live),
      isRepeat: parseBoolFlag(i.repeat),
      isFirstRun: parseBoolFlag(i.firstRun),
      premiereMode: i.premiereMode as string | undefined,
      nominalDuration: i.nominalDuration as string | undefined,
      houseNumber: ((i.houseNo ?? i.houseNumber) as string | undefined) || undefined,
      location: extractSetLocation(i),
      raw: item as Programme['raw'],
    };
  });
}

async function fetchDayFromApi(date: string): Promise<Programme[]> {
  const url = buildUrl(date, date);
  const res = await apiClient.get<BcmResponse>(url);
  const data = res.data;
  const items = data?.[0]?.day?.[0]?.items ?? data?.[0]?.items ?? [];
  return parseItems(Array.isArray(items) ? items : []);
}

export interface EpgDataState {
  programmes: Programme[];
  weekData: Map<string, Programme[]>;
  isLoading: boolean;
  error: string | null;
}

export function useEPGData() {
  const cache = useRef<Map<string, Programme[]>>(new Map());
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [weekData, setWeekData] = useState<Map<string, Programme[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDay = useCallback(async (date: string) => {
    if (cache.current.has(date)) {
      setProgrammes(cache.current.get(date)!);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const progs = await fetchDayFromApi(date);
      cache.current.set(date, progs);
      setProgrammes(progs);
    } catch (e) {
      const message = axios.isAxiosError(e)
        ? (e.response?.data as { message?: string } | undefined)?.message
          ?? `Schedule request failed: HTTP ${e.response?.status ?? 'unknown'}`
        : e instanceof Error
          ? e.message
          : 'Failed to load programme schedule';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadWeek = useCallback(async (date: string) => {
    const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const dates = Array.from({ length: 7 }, (_, i) =>
      format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd')
    );

    // Check if all days already cached
    const allCached = dates.every(d => cache.current.has(d));
    if (allCached) {
      const result = new Map<string, Programme[]>();
      dates.forEach(d => result.set(d, cache.current.get(d)!));
      setWeekData(result);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await Promise.all(
        dates.map(async (d) => {
          if (!cache.current.has(d)) {
            const progs = await fetchDayFromApi(d);
            cache.current.set(d, progs);
          }
        })
      );
      const result = new Map<string, Programme[]>();
      dates.forEach(d => result.set(d, cache.current.get(d) ?? []));
      setWeekData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load week schedule');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invalidateDay = useCallback((date: string) => {
    cache.current.delete(date);
  }, []);

  const invalidateWeek = useCallback((date: string) => {
    const weekStart = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    for (let i = 0; i < 7; i++) {
      cache.current.delete(format(addDays(parseISO(weekStart), i), 'yyyy-MM-dd'));
    }
  }, []);

  return {
    programmes,
    weekData,
    isLoading,
    error,
    loadDay,
    loadWeek,
    invalidateDay,
    invalidateWeek,
  };
}
