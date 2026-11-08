import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { formatFileSize } from '@/lib/formatFileSize';
import type { BitTicketAttachment } from '../types/ticket';

function isImage(a: BitTicketAttachment): boolean {
  return a.contentType?.startsWith('image/') ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(a.fileName);
}

/** Image thumbnails (open in a lightbox) plus file chips (open in a new tab). */
export function TicketAttachmentGallery({ attachments }: { attachments: BitTicketAttachment[] }) {
  const [preview, setPreview] = useState<BitTicketAttachment | null>(null);

  if (attachments.length === 0) return null;
  const images = attachments.filter(isImage);
  const files = attachments.filter((a) => !isImage(a));

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {images.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setPreview(a)}
                className="block overflow-hidden rounded-lg border border-border bg-muted transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={a.fileName}
              >
                <img src={a.url} alt={a.fileName} className="h-20 w-28 object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((a) => (
            <li key={a.id}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <FileText size={15} className="shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-card-foreground">{a.fileName}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatFileSize(a.sizeBytes)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl gap-3">
          <DialogTitle className="truncate pr-6 text-base">{preview?.fileName}</DialogTitle>
          <DialogDescription className="sr-only">Image preview</DialogDescription>
          {preview && (
            <img src={preview.url} alt={preview.fileName} className="max-h-[75vh] w-full rounded-lg object-contain" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
