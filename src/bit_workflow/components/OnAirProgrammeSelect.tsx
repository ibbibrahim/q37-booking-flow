import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { fetchEpgDay } from '@/epg_workflow/hooks/useEPGData';
import type { Programme } from '@/epg_workflow/types/epg.types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function programmeLabel(p: Programme): string {
  return `${p.startTime.slice(0, 5)} · ${p.title}`.slice(0, 255);
}

interface OnAirProgrammeSelectProps {
  id: string;
  /** Doha calendar date (yyyy-MM-dd) whose schedule to list. */
  date: string;
  /** Minutes after midnight (Doha) of the incident — used to pre-select the programme on air. */
  incidentMinute: number | null;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/** One selectable row: a schedule entry, or the "Other" escape hatch (programme = null). */
interface Option {
  key: string;
  label: string;
  programme: Programme | null;
}

export function OnAirProgrammeSelect({ id, date, incidentMinute, value, onChange, error }: OnAirProgrammeSelectProps) {
  const [mode, setMode] = useState<'list' | 'other'>('list');
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['epg-day', date],
    queryFn: () => fetchEpgDay(date),
    enabled: DATE_RE.test(date),
    staleTime: 5 * 60_000,
  });

  // All programmes, live and recorded: an on-air fault can hit either.
  const programmes = useMemo(() => [...(data ?? [])].sort((a, b) => a.startMinute - b.startMinute), [data]);
  const labels = useMemo(() => programmes.map(programmeLabel), [programmes]);

  useEffect(() => {
    if (!data || mode !== 'list') return;
    if (value && !labels.includes(value)) {
      // Date changed and the earlier pick isn't in this day's schedule.
      onChange('');
      return;
    }
    if (!value && incidentMinute !== null) {
      const index = programmes.findIndex(
        (p) => p.startMinute <= incidentMinute && incidentMinute < p.startMinute + p.durationMinutes
      );
      if (index >= 0) onChange(labels[index]);
    }
  }, [data, mode, value, incidentMinute, programmes, labels, onChange]);

  const options = useMemo<Option[]>(() => {
    const q = search.trim().toLowerCase();
    const matches = programmes
      .map((p, i) => ({ key: p.id, label: labels[i], programme: p }))
      .filter(
        ({ programme: p, label }) =>
          !q || label.toLowerCase().includes(q) || (p.arabicTitle ?? '').toLowerCase().includes(q)
      );
    return [...matches, { key: '__other__', label: 'Other / not in schedule', programme: null }];
  }, [programmes, labels, search]);

  // Reset the search each time the list opens, and land on the current pick.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    const index = labels.indexOf(value);
    setActive(mode === 'other' ? programmes.length : Math.max(0, index));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the popover opens
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  function choose(option: Option) {
    if (option.programme) {
      setMode('list');
      onChange(option.label);
    } else {
      setMode('other');
      onChange('');
    }
    setOpen(false);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const option = options[active];
      if (option) choose(option);
    }
  }

  const triggerText = mode === 'other' ? 'Other / not in schedule' : labels.includes(value) ? value : '';

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Affected programme *</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={!!error}
            disabled={isLoading}
            className={cn(
              'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
              !triggerText && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {triggerText || (isLoading ? 'Loading schedule…' : 'Select the programme')}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] min-w-[20rem] p-0"
          // Inside a Dialog the body scroll lock would otherwise swallow wheel/touch scrolling here.
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search programme or time…"
              aria-label="Search programmes"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
          <div ref={listRef} role="listbox" className="max-h-72 overflow-y-auto p-1">
            {options.length === 1 && search.trim() && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">No programmes match “{search.trim()}”</p>
            )}
            {options.map((option, index) => {
              const p = option.programme;
              const selected = p ? option.label === value && mode === 'list' : mode === 'other';
              return (
                <div
                  key={option.key}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm',
                    index === active && 'bg-accent text-accent-foreground',
                    !p && 'mt-1 border-t border-border pt-2'
                  )}
                >
                  {selected && <Check className="absolute left-2 h-4 w-4" />}
                  {p ? (
                    <span className="min-w-0 truncate">
                      <span className="tabular-nums">{p.startTime.slice(0, 5)}</span> · {p.title}
                      {p.isLive && (
                        <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                          Live
                        </span>
                      )}
                      {p.arabicTitle && (
                        <span className="ml-2 text-muted-foreground" dir="rtl">
                          {p.arabicTitle}
                        </span>
                      )}
                    </span>
                  ) : (
                    option.label
                  )}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
      {mode === 'other' && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={255}
          placeholder="Programme or bulletin name"
          aria-label="Programme or bulletin name"
          autoFocus
        />
      )}
      {!isLoading && (isError || (data && programmes.length === 0)) && (
        <p className="text-xs text-muted-foreground">
          {isError
            ? 'Could not load the schedule. Choose Other and type the programme name.'
            : 'No programmes found in the schedule for this date.'}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
