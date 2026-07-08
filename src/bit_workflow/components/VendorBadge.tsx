import { Server } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChecklistVendor } from '../types/checklist';
import avidLogo from '@/assets/avid.png';
import evsLogo from '@/assets/evs.png';
import vantageLogo from '@/assets/vantage.png';
import vizrtLogo from '@/assets/vizrt.png';
import wiresLogo from '@/assets/wires.png';

const chip =
  'inline-flex items-center justify-center h-8 min-w-[4.5rem] px-2 rounded-md border border-border bg-white select-none whitespace-nowrap';

const LOGOS: Partial<Record<ChecklistVendor, { src: string; alt: string }>> = {
  evs: { src: evsLogo, alt: 'EVS' },
  vizrt: { src: vizrtLogo, alt: 'Vizrt' },
  avid: { src: avidLogo, alt: 'Avid' },
  wires: { src: wiresLogo, alt: 'Wires' },
  vantage: { src: vantageLogo, alt: 'Telestream Vantage' },
};

/** Compact brand mark using the real vendor logos from the printed checklist. */
export function VendorBadge({ vendor, className }: { vendor: ChecklistVendor; className?: string }) {
  const logo = LOGOS[vendor];

  if (logo) {
    // The Vantage mark is a compact hexagon whose embedded text is illegible at
    // chip size — pair it with a text label instead of scaling it up.
    if (vendor === 'vantage') {
      return (
        <span title={logo.alt} className={cn(chip, 'gap-1.5', className)}>
          <img src={logo.src} alt="" className="h-6 w-auto object-contain" />
          <span className="text-xs font-bold text-orange-600">Vantage</span>
        </span>
      );
    }
    return (
      <span title={logo.alt} className={cn(chip, className)}>
        <img src={logo.src} alt={logo.alt} className="h-6 w-auto max-w-[88px] object-contain" />
      </span>
    );
  }

  if (vendor === 'glookast') {
    return (
      <span
        title="Glookast"
        className={cn(chip, 'border-sky-500/30 bg-sky-500/5 text-xs font-bold text-sky-700 dark:text-sky-400', className)}
      >
        Glookast
      </span>
    );
  }

  return (
    <span
      title="System"
      className={cn(chip, 'border-border bg-muted/50 text-[10px] font-bold tracking-widest text-muted-foreground', className)}
    >
      <Server size={10} className="mr-1 shrink-0" />
      SYS
    </span>
  );
}
