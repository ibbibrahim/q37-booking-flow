import { ScanLine } from 'lucide-react';
import { useHrLanguage } from '../context/HrLanguageContext';

interface Props {
  open: boolean;
  imageUrl: string | null;
}

/** Shown while a QID scan is in flight — sweeps a scanner line over the actual photo
 * the user uploaded, instead of a plain inline spinner. */
export function QidScanningModal({ open, imageUrl }: Props) {
  const { t } = useHrLanguage();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl p-5 flex flex-col items-center gap-4 max-w-xs w-full">
        <div className="relative w-full aspect-[3/4] max-h-72 rounded-md overflow-hidden border border-border bg-black">
          {imageUrl && (
            <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain" />
          )}

          {/* Darkened scan tint over the photo */}
          <div className="absolute inset-0 bg-primary/10" />

          {/* Scanner frame corners */}
          <div className="absolute inset-3 border-2 border-primary/50 rounded-sm pointer-events-none" />

          {/* Sweeping scan line */}
          <div
            className="absolute inset-x-0 h-[3px] animate-scan-sweep"
            style={{
              background: 'linear-gradient(to right, transparent, hsl(var(--primary)), transparent)',
              boxShadow: '0 0 14px 3px hsl(var(--primary) / 0.75)',
            }}
          />
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ScanLine size={16} className="text-primary animate-pulse" />
          {t('scanning')}
        </div>
      </div>
    </div>
  );
}
