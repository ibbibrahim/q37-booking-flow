export type Tone = 'primary' | 'info' | 'warning' | 'success' | 'destructive' | 'muted';

/** Pill container classes per tone (literal strings so Tailwind keeps them). */
const PILL_BASE = 'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap';

// Same palette scale as the booking-type pills (100 fill / 700 text / 200 border), so pills look identical across modules.
export const TONE_PILL: Record<Tone, string> = {
  primary: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  info: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  warning: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800',
  destructive: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  muted: 'bg-muted text-muted-foreground border-border',
};

export const TONE_DOT: Record<Tone, string> = {
  primary: 'bg-blue-500',
  info: 'bg-sky-500',
  warning: 'bg-amber-500',
  success: 'bg-emerald-500',
  destructive: 'bg-red-500',
  muted: 'bg-muted-foreground/60',
};

/** Indicator colour for Progress bars (applied on the wrapper via arbitrary child selector). */
export const TONE_BAR: Record<Tone, string> = {
  primary: '[&>div]:bg-primary',
  info: '[&>div]:bg-info',
  warning: '[&>div]:bg-warning',
  success: '[&>div]:bg-success',
  destructive: '[&>div]:bg-destructive',
  muted: '[&>div]:bg-muted-foreground/50',
};

export function pillClass(tone: Tone): string {
  return `${PILL_BASE} ${TONE_PILL[tone]}`;
}
