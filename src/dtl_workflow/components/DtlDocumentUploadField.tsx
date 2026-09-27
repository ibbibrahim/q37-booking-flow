import { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { uploadDtlGuestDocument, type DtlGuestUploadKind } from '../services/dtlApi';

export function DtlDocumentUploadField({
  id,
  label,
  kind,
  value,
  onChange,
  accept = 'image/*,.pdf',
}: {
  id: string;
  label: string;
  kind: DtlGuestUploadKind;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadDtlGuestDocument(file, kind);
      onChange(url);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 truncate text-primary hover:underline"
          >
            <FileText className="h-4 w-4 shrink-0" />
            View uploaded file
          </a>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-primary hover:underline"
              disabled={uploading}
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-muted-foreground hover:text-destructive"
              title="Remove"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Upload
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
