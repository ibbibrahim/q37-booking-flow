import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TONE_DOT, pillClass, type Tone } from '@/lib/tone';

interface StatusPillProps {
  tone: Tone;
  children: ReactNode;
  /**
   * Controls the leading dot. When omitted, a simple static dot is rendered.
   * When passed at all (true or false), the dot is wrapped in a relative container
   * and a pulsing ring is added only when `true` (attention-grabbing states).
   */
  ping?: boolean;
  className?: string;
}

/** Rounded token-coloured pill with a leading dot. */
export function StatusPill({ tone, children, ping, className }: StatusPillProps) {
  return (
    <span className={className ? cn(pillClass(tone), className) : pillClass(tone)}>
      {ping !== undefined ? (
        <span className="relative flex h-1.5 w-1.5" aria-hidden>
          {ping && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${TONE_DOT[tone]}`} />
          )}
          <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
        </span>
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} aria-hidden />
      )}
      {children}
    </span>
  );
}
