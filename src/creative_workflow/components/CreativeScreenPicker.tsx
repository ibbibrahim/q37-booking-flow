import { useState, type KeyboardEvent } from 'react';
import { Check, Maximize2, MonitorPlay } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CreativeScreen } from '../types/creative';

type ScreenOption = Pick<CreativeScreen, 'name' | 'imageUrl' | 'description'>;

// Visual replacement for the plain screen <Select>: every screen is laid out as a card with
// its studio photo and location note (both managed on the Creative Reference Lists page), so
// requesters pick by sight instead of by name. Value is still the screen's name, so the
// stored TypeSpecificData shape is unchanged.
export function CreativeScreenPicker({
  id,
  value,
  onChange,
  screens,
  invalid = false,
}: {
  id?: string;
  value: string;
  onChange: (name: string) => void;
  screens: ScreenOption[];
  invalid?: boolean;
}) {
  const [previewing, setPreviewing] = useState<ScreenOption | null>(null);

  if (screens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        <MonitorPlay className="h-6 w-6" />
        No screens are set up for this request type yet. Ask an admin to add them under Reference Lists.
      </div>
    );
  }

  // Roving arrow-key navigation across the cards, like a native radio group.
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (e.key in keys) {
      e.preventDefault();
      const next = (index + keys[e.key] + screens.length) % screens.length;
      const container = e.currentTarget.parentElement;
      (container?.children[next] as HTMLElement | undefined)?.focus();
      onChange(screens[next].name);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(screens[index].name);
    }
  }

  const selectedIndex = screens.findIndex((s) => s.name === value);

  return (
    <>
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-invalid={invalid || undefined}
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3',
          invalid && 'rounded-xl outline outline-2 outline-offset-4 outline-red-500/70',
        )}
      >
        {screens.map((s, i) => {
          const isSelected = s.name === value;
          return (
            <div
              key={s.name}
              role="radio"
              aria-checked={isSelected}
              aria-label={s.name}
              // Only one card is in the tab order: the selected one, or the first if none is.
              tabIndex={isSelected || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onClick={() => onChange(s.name)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                'group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all duration-200',
                'hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isSelected ? 'border-primary ring-2 ring-primary/60' : 'border-border hover:border-primary/40',
              )}
            >
              <div className="relative aspect-video w-full overflow-hidden bg-muted">
                <ScreenThumb
                  screen={s}
                  className="h-full w-full rounded-none shadow-none transition-transform duration-300 group-hover:scale-[1.03]"
                />
                {/* Soft fade so the overlaid controls stay legible on bright studio photos. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/35 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {s.imageUrl && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewing(s);
                    }}
                    className="absolute left-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/75 group-hover:opacity-100"
                    title="View larger"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </button>
                )}
                <span
                  className={cn(
                    'absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all',
                    isSelected
                      ? 'scale-100 border-primary bg-primary text-primary-foreground shadow'
                      : 'scale-90 border-white/80 bg-black/20 text-transparent backdrop-blur-sm',
                  )}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              </div>
              <div className={cn('flex-1 space-y-1 px-4 py-3 transition-colors', isSelected && 'bg-primary/5')}>
                <p className="text-sm font-semibold leading-snug text-card-foreground">{s.name}</p>
                {s.description ? (
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
                ) : (
                  <p className="text-xs italic text-muted-foreground/60">No description</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={previewing !== null} onOpenChange={(open) => !open && setPreviewing(null)}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
          {previewing && (
            <>
              {previewing.imageUrl && (
                <img
                  src={previewing.imageUrl}
                  alt={previewing.name}
                  className="max-h-[70vh] w-full bg-black object-contain"
                />
              )}
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-lg">{previewing.name}</DialogTitle>
                  <DialogDescription>{previewing.description || 'No description'}</DialogDescription>
                </div>
                <Button
                  type="button"
                  className="shrink-0"
                  onClick={() => {
                    onChange(previewing.name);
                    setPreviewing(null);
                  }}
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  {previewing.name === value ? 'Selected' : 'Select this screen'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ScreenThumb({
  screen,
  className,
}: {
  screen: Pick<CreativeScreen, 'name' | 'imageUrl'>;
  className?: string;
}) {
  if (!screen.imageUrl) {
    return (
      <span className={cn('flex shrink-0 items-center justify-center rounded bg-muted text-muted-foreground', className)}>
        <MonitorPlay className="h-6 w-6" />
      </span>
    );
  }
  return (
    <img
      src={screen.imageUrl}
      alt={screen.name}
      loading="lazy"
      className={cn('shrink-0 rounded bg-muted object-cover shadow-sm', className)}
    />
  );
}
