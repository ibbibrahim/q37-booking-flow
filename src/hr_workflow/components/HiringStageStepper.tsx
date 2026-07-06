import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HIRING_STAGES } from '../utils/hrUtils';
import type { HiringRequestStage } from '../types/hr';

interface Props {
  stage: HiringRequestStage;
}

export function HiringStageStepper({ stage }: Props) {
  if (stage === 'Returned to Department') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm font-medium">
        <RotateCcw size={16} />
        Returned to Department Head for corrections
      </div>
    );
  }

  const currentIndex = HIRING_STAGES.indexOf(stage);

  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {HIRING_STAGES.map((s, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <div key={s} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1 min-w-[5.5rem]">
              <div
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold border-2',
                  done && 'bg-success border-success text-white',
                  active && 'border-primary text-primary bg-primary/10',
                  !done && !active && 'border-border text-muted-foreground'
                )}
              >
                {done ? <Check size={14} /> : idx + 1}
              </div>
              <span
                className={cn(
                  'text-[11px] text-center leading-tight',
                  active ? 'text-primary font-semibold' : 'text-muted-foreground'
                )}
              >
                {s}
              </span>
            </div>
            {idx < HIRING_STAGES.length - 1 && (
              <div className={cn('h-0.5 w-6 sm:w-10', done ? 'bg-success' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
