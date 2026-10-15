import { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { formatFileSize } from '@/lib/formatFileSize';

export interface UploadedFileRef {
  url: string;
  name: string;
  sizeBytes: number;
  contentType?: string;
}

function isImage(f: UploadedFileRef): boolean {
  return f.contentType?.startsWith('image/') ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);
}

// Generalizes dtl_workflow/components/DtlDocumentUploadField.tsx to accept multiple files.
// `onUpload` does the actual network upload and returns the stored URL; this component only
// handles the picker UI, per-file "uploading" state, and the resulting list — size/type are
// read straight off the selected File, so both sides (uploader and whoever views the request
// later) can see exactly what was sent, byte-for-byte, with no re-encoding in between.
export function MultiFileUploadField({
  id,
  label,
  value,
  onChange,
  onUpload,
  accept = 'image/*,.pdf',
  multiple = true,
}: {
  id: string;
  label: string;
  value: UploadedFileRef[];
  onChange: (files: UploadedFileRef[]) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  multiple?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(files: FileList) {
    setError(null);
    setUploading(true);
    try {
      const uploaded: UploadedFileRef[] = [];
      for (const file of Array.from(files)) {
        const url = await onUpload(file);
        uploaded.push({ url, name: file.name, sizeBytes: file.size, contentType: file.type });
      }
      onChange(multiple ? [...value, ...uploaded] : uploaded);
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleFilesSelected(e.target.files);
        }}
      />

      {value.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {value.map((f, i) => (
            <li
              key={`${f.url}-${i}`}
              className="relative flex flex-col gap-1.5 rounded-md border border-border p-2"
            >
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute -top-2 -right-2 rounded-full bg-background border border-border text-muted-foreground hover:text-destructive p-0.5"
                title="Remove"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="block">
                {isImage(f) ? (
                  <img src={f.url} alt={f.name} className="h-20 w-full rounded object-cover bg-muted" />
                ) : (
                  <div className="flex h-20 w-full items-center justify-center rounded bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </a>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-card-foreground" title={f.name}>{f.name}</p>
                <p className="text-[11px] text-muted-foreground">{formatFileSize(f.sizeBytes)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(multiple || value.length === 0) && (
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
