import { cloneElement, isValidElement, useRef, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import {
  Captions,
  Film,
  MonitorPlay,
  Newspaper,
  Presentation,
  Share2,
  Sparkles,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CREATIVE_REQUEST_TYPE, type CreativeRequestType } from '../types/creative';

// --- Request type presentation (icon + short hint) ---

export const REQUEST_TYPE_ICON: Record<CreativeRequestType, LucideIcon> = {
  [CREATIVE_REQUEST_TYPE.SocialMediaHeadline]: Share2,
  [CREATIVE_REQUEST_TYPE.NewsHeadline]: Newspaper,
  [CREATIVE_REQUEST_TYPE.ProgramVideoWall]: MonitorPlay,
  [CREATIVE_REQUEST_TYPE.VideoWallPresentation]: Presentation,
  [CREATIVE_REQUEST_TYPE.Filler]: Film,
  [CREATIVE_REQUEST_TYPE.LowerThird]: Captions,
  [CREATIVE_REQUEST_TYPE.SpecialRequest]: Sparkles,
};

export const REQUEST_TYPE_HINT: Record<CreativeRequestType, string> = {
  [CREATIVE_REQUEST_TYPE.SocialMediaHeadline]: 'Posts for QBC / QTV37 socials',
  [CREATIVE_REQUEST_TYPE.NewsHeadline]: 'On-air headline graphic',
  [CREATIVE_REQUEST_TYPE.ProgramVideoWall]: "Slides for a program's video wall",
  [CREATIVE_REQUEST_TYPE.VideoWallPresentation]: 'Presentation screen for a show',
  [CREATIVE_REQUEST_TYPE.Filler]: 'Filler graphics',
  [CREATIVE_REQUEST_TYPE.LowerThird]: 'Name & title straps',
  [CREATIVE_REQUEST_TYPE.SpecialRequest]: 'Anything else',
};

// --- FormSection ---

export function FormSection({
  step,
  icon: Icon,
  title,
  description,
  children,
}: {
  step: number;
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5 sm:p-6 space-y-6">
        <div className="flex items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-card-foreground">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {title}
            </h2>
            {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

// --- Field ---

export function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  bare,
  children,
}: {
  id: string;
  label?: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  /** Skip cloning aria props onto the child (for composite children that manage their own). */
  bare?: boolean;
  children: ReactNode;
}) {
  const describedBy = error ? `${id}-error` : undefined;
  let content = children;
  if (!bare && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    content = cloneElement(child, {
      'aria-invalid': !!error || undefined,
      'aria-describedby': describedBy ?? (child.props['aria-describedby'] as string | undefined),
    });
  }
  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="text-destructive ml-0.5" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
        </Label>
      )}
      {content}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

// --- Radio-group helpers ---

function useRadioKeys<T extends string>(values: T[], value: T | undefined | null, onChange: (v: T) => void) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = values.findIndex((v) => v === value);
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (index + 1) % values.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (index - 1 + values.length) % values.length;
    if (next < 0) return;
    e.preventDefault();
    onChange(values[next]);
    refs.current[next]?.focus();
  }

  return { refs, tabbableIndex, onKeyDown };
}

// --- SegmentedControl ---

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  tone?: 'default' | 'destructive';
}

export function SegmentedControl<T extends string>({
  id,
  value,
  options,
  onChange,
  invalid,
  ariaLabel,
}: {
  id?: string;
  value: T | undefined | null;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  invalid?: boolean;
  ariaLabel: string;
}) {
  const { refs, tabbableIndex, onKeyDown } = useRadioKeys(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={cn('flex w-full items-stretch gap-1 rounded-lg bg-muted p-1', invalid && 'ring-1 ring-destructive')}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabbableIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex-1 min-h-9 rounded-md px-3 text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? o.tone === 'destructive'
                  ? 'bg-destructive/10 text-destructive shadow-sm'
                  : 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// --- OptionCards ---

export interface OptionCardItem<T extends string> {
  value: T;
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function OptionCards<T extends string>({
  id,
  value,
  options,
  onChange,
  invalid,
  ariaLabel,
  className,
}: {
  id?: string;
  value: T | undefined | null;
  options: OptionCardItem<T>[];
  onChange: (v: T) => void;
  invalid?: boolean;
  ariaLabel: string;
  /** Grid column classes, e.g. "grid-cols-2 md:grid-cols-4". */
  className?: string;
}) {
  const { refs, tabbableIndex, onKeyDown } = useRadioKeys(
    options.map((o) => o.value),
    value,
    onChange,
  );
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={cn('grid gap-3', className ?? 'grid-cols-2 md:grid-cols-4', invalid && 'rounded-lg ring-1 ring-destructive')}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === tabbableIndex ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'flex min-h-9 flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border hover:bg-muted/50',
            )}
          >
            {Icon && (
              <Icon
                className={cn('h-5 w-5', selected ? 'text-primary' : 'text-muted-foreground')}
                aria-hidden="true"
              />
            )}
            <span className="text-sm font-medium text-card-foreground">{o.title}</span>
            {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
          </button>
        );
      })}
    </div>
  );
}

// --- TypeTiles ---

export function TypeTiles({
  value,
  types,
  labels,
  onChange,
}: {
  value: CreativeRequestType;
  types: CreativeRequestType[];
  labels: Record<CreativeRequestType, string>;
  onChange: (v: CreativeRequestType) => void;
}) {
  return (
    <OptionCards<CreativeRequestType>
      id="request-type"
      ariaLabel="Request Type"
      value={value}
      onChange={onChange}
      className="grid-cols-2 md:grid-cols-4"
      options={types.map((t) => ({
        value: t,
        title: labels[t],
        description: REQUEST_TYPE_HINT[t],
        icon: REQUEST_TYPE_ICON[t],
      }))}
    />
  );
}

// --- Repeaters ---

export function RepeaterItem({
  index,
  title,
  onRemove,
  children,
}: {
  index: number;
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const label = `${title} ${index + 1}`;
  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
            {index + 1}
          </span>
          <span className="text-sm font-medium text-card-foreground">{label}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="h-9 w-9 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

export function RepeaterEmpty({
  text,
  actionLabel,
  onAdd,
}: {
  text: string;
  actionLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1" /> {actionLabel}
      </Button>
    </div>
  );
}
