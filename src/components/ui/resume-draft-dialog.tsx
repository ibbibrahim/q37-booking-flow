import { useRef } from 'react';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ResumeDraftDialogProps {
  open: boolean;
  title: string;
  description: string;
  itemTitle: string;
  meta: string;
  hint: string;
  note?: string;
  onStartNew: () => void;
  onContinue: () => void;
}

/** Forced-choice dialog offering to resume an unfinished form (Escape / outside click do nothing). */
export function ResumeDraftDialog({
  open,
  title,
  description,
  itemTitle,
  meta,
  hint,
  note,
  onStartNew,
  onContinue,
}: ResumeDraftDialogProps) {
  const startNewRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => {
          // Focus the primary action (Enter = Start new request) instead of the first button.
          e.preventDefault();
          startNewRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mx-6 mb-5 flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 space-y-0.5">
            <p className="truncate text-sm font-medium text-foreground">{itemTitle}</p>
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
        </div>
        {note && <p className="-mt-2 mb-3 px-6 text-xs text-muted-foreground">{note}</p>}
        <p className="-mt-2 mb-5 px-6 text-xs text-muted-foreground">{hint}</p>
        <AlertDialogFooter className="sm:items-center">
          <Button type="button" variant="outline" onClick={onContinue}>
            Resume where I left off
          </Button>
          <Button ref={startNewRef} type="button" onClick={onStartNew} className="shadow-sm">
            Start new request
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
