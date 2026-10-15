import { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { formatFileSize } from '@/lib/formatFileSize';
import type { UploadedFileRef } from '@/components/ui/multi-file-upload-field';
import { uploadCreativeFormFile } from '../services/creativeApi';

function isImage(f: UploadedFileRef): boolean {
  return f.contentType?.startsWith('image/') ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);
}

// Single-file upload field for the Creative Workflow's create-form (event logo, background
// image, reference image). Shows a thumbnail + file size once uploaded — so whoever fills
// the form AND whoever later opens the request (Graphics Team, Social Media) can both see
// exactly what was sent. Mirrors dtl_workflow/components/DtlDocumentUploadField.tsx but
// uploads through creativeApi's decoupled form-upload endpoint instead of DTL's, and carries
// size/name alongside the URL instead of a bare string.
export function CreativeDocumentUploadField({
  id,
  label,
  value,
  onChange,
  accept = 'image/*,.pdf',
  required = false,
}: {
  id: string;
  label: string;
  value: UploadedFileRef | null | undefined;
  onChange: (ref: UploadedFileRef | null) => void;
  accept?: string;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(file: File) {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadCreativeFormFile(file);
      onChange({ url, name: file.name, sizeBytes: file.size, contentType: file.type });
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
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
        <div className="flex items-center gap-3 rounded-md border border-border p-2">
          <a href={value.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
            {isImage(value) ? (
              <img src={value.url} alt={value.name} className="h-16 w-16 rounded object-cover bg-muted" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </a>
          <div className="min-w-0 flex-1">
            <a
              href={value.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm font-medium text-primary hover:underline"
              title={value.name}
            >
              {value.name}
            </a>
            <p className="text-xs text-muted-foreground">{formatFileSize(value.sizeBytes)}</p>
          </div>
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
              onClick={() => onChange(null)}
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
