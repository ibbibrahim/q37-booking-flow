import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PenTool, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SignaturePad } from './SignaturePad';
import type { SignaturePlacement } from '../utils/contractPdf';
import type { HrSignatureMethod } from '../types/hrApi';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface SignaturePlacementEditorHandle {
  getSignedPlacements: () => Promise<SignaturePlacement[]>;
  getSignatureMethod: () => HrSignatureMethod;
}

interface Props {
  pdfBytes: Uint8Array;
  defaultSignerName?: string;
  onSignedCountChange?: (count: number) => void;
}

interface RenderedPage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

interface Placement {
  id: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  blob: Blob;
  previewUrl: string;
}

const RENDER_SCALE = 1.6;
// Viewport-px default box size for a dropped signature — roughly matches
// the box the old fixed-position stamp used to draw, just no longer tied to
// one hardcoded spot on one page.
const PLACEMENT_WIDTH = 210;
const PLACEMENT_HEIGHT = 78;

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** DocuSign-style signing surface: the contract renders read-only — no
 * editable fields, just the finished page images. Signing is capture-once,
 * place-many: clicking the FIELDS panel's "Signature" tile opens the
 * draw/type/upload pad a single time; once captured, that same tile becomes
 * a draggable stamp of it that can be dropped onto any page, any number of
 * times, with no further signing prompts. */
export const SignaturePlacementEditor = forwardRef<SignaturePlacementEditorHandle, Props>(
  function SignaturePlacementEditor({ pdfBytes, defaultSignerName, onSignedCountChange }, ref) {
    const [pages, setPages] = useState<RenderedPage[]>([]);
    const [loading, setLoading] = useState(true);
    const [placements, setPlacements] = useState<Placement[]>([]);
    const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null);
    const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
    const [captureOpen, setCaptureOpen] = useState(false);
    const viewportsRef = useRef<Map<number, pdfjsLib.PageViewport>>(new Map());
    const methodRef = useRef<HrSignatureMethod>('Draw');

    useImperativeHandle(ref, () => ({
      getSignedPlacements: async () => {
        const results: SignaturePlacement[] = [];
        for (const p of placements) {
          const viewport = viewportsRef.current.get(p.page);
          if (!viewport) continue;

          const [px1, py1] = viewport.convertToPdfPoint(p.left, p.top);
          const [px2, py2] = viewport.convertToPdfPoint(p.left + p.width, p.top + p.height);
          const imageBytes = new Uint8Array(await p.blob.arrayBuffer());

          results.push({
            pageIndex: p.page - 1,
            x: Math.min(px1, px2),
            y: Math.min(py1, py2),
            width: Math.abs(px2 - px1),
            height: Math.abs(py2 - py1),
            imageBytes,
            imageType: p.blob.type === 'image/jpeg' ? 'jpeg' : 'png',
          });
        }
        return results;
      },
      getSignatureMethod: () => methodRef.current,
    }));

    useEffect(() => {
      onSignedCountChange?.(placements.length);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [placements]);

    useEffect(() => {
      let cancelled = false;
      let firstPageReady = false;
      const objectUrls: string[] = [];

      (async () => {
        setLoading(true);
        setPages([]);
        viewportsRef.current = new Map();

        const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
        if (cancelled) return;

        // Pages render independently and in parallel, revealing themselves
        // as soon as each is ready, rather than blocking the whole surface
        // on every page (including the largest ones) finishing first.
        const renderPage = async (pageNumber: number) => {
          const page = await doc.getPage(pageNumber);
          const viewport = page.getViewport({ scale: RENDER_SCALE });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          }
          if (cancelled) return;

          const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (cancelled) return;
          const imageUrl = blob ? URL.createObjectURL(blob) : '';
          if (imageUrl) objectUrls.push(imageUrl);

          viewportsRef.current.set(pageNumber, viewport);
          setPages((prev) => [...prev, { pageNumber, imageUrl, width: viewport.width, height: viewport.height }].sort((a, b) => a.pageNumber - b.pageNumber));
          if (!firstPageReady) {
            firstPageReady = true;
            setLoading(false);
          }
        };

        await Promise.all(Array.from({ length: doc.numPages }, (_, i) => renderPage(i + 1)));
      })();

      return () => {
        cancelled = true;
        objectUrls.forEach((u) => URL.revokeObjectURL(u));
      };
    }, [pdfBytes]);

    const handleDrop = (
      e: React.DragEvent<HTMLDivElement>,
      pageNumber: number,
      pageWidth: number,
      pageHeight: number
    ) => {
      e.preventDefault();
      if (e.dataTransfer.getData('text/plain') !== 'signature' || !signatureBlob || !signaturePreviewUrl) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const left = Math.min(Math.max(e.clientX - rect.left - PLACEMENT_WIDTH / 2, 0), Math.max(pageWidth - PLACEMENT_WIDTH, 0));
      const top = Math.min(Math.max(e.clientY - rect.top - PLACEMENT_HEIGHT / 2, 0), Math.max(pageHeight - PLACEMENT_HEIGHT, 0));

      const id = Math.random().toString(36).slice(2);
      setPlacements((prev) => [
        ...prev,
        {
          id,
          page: pageNumber,
          left,
          top,
          width: PLACEMENT_WIDTH,
          height: PLACEMENT_HEIGHT,
          blob: signatureBlob,
          previewUrl: signaturePreviewUrl,
        },
      ]);
    };

    const removePlacement = (id: string) => setPlacements((prev) => prev.filter((p) => p.id !== id));

    // Captured once from the FIELDS tile; a data URL (not an object URL) so
    // it can be safely referenced by every placement dropped afterward
    // without any revoke-on-remove bookkeeping.
    const handleSignatureCaptured = async (blob: Blob, method: HrSignatureMethod) => {
      const dataUrl = await blobToDataUrl(blob);
      methodRef.current = method;
      setSignatureBlob(blob);
      setSignaturePreviewUrl(dataUrl);
      setCaptureOpen(false);
    };

    if (loading) {
      return <div className="flex items-center justify-center h-full text-muted-foreground">Loading document…</div>;
    }

    return (
      <div className="flex h-full">
        <div className="w-44 shrink-0 border-r border-border bg-card p-3 overflow-y-auto">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-wide mb-2">FIELDS</p>
          <div
            draggable={!!signatureBlob}
            onDragStart={(e) => {
              if (!signatureBlob) return;
              e.dataTransfer.setData('text/plain', 'signature');
            }}
            onClick={() => setCaptureOpen(true)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm select-none',
              signatureBlob
                ? 'border-[#4b54d9] bg-white cursor-grab active:cursor-grabbing'
                : 'border-border bg-background cursor-pointer hover:border-primary hover:bg-primary/5'
            )}
          >
            {signatureBlob && signaturePreviewUrl ? (
              <>
                <img src={signaturePreviewUrl} alt="Your signature" className="h-6 max-w-[6.5rem] object-contain" />
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Change</span>
              </>
            ) : (
              <>
                <PenTool size={15} className="text-primary shrink-0" />
                Signature
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
            {signatureBlob
              ? 'Drag your signature onto the document, anywhere, as many times as needed.'
              : 'Click to draw, type, or upload your signature — once.'}
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-3 py-4 flex flex-col items-center bg-[#525659]">
            {pages.map((p) => (
              <div
                key={p.pageNumber}
                className="relative bg-white shadow-md"
                style={{ width: p.width, height: p.height }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, p.pageNumber, p.width, p.height)}
              >
                <img
                  src={p.imageUrl}
                  alt={`Page ${p.pageNumber}`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  draggable={false}
                />
                {placements
                  .filter((pl) => pl.page === p.pageNumber)
                  .map((pl) => (
                    <div
                      key={pl.id}
                      className="absolute flex items-center justify-center rounded-md border border-[#4b54d9] bg-white group"
                      style={{ left: pl.left, top: pl.top, width: pl.width, height: pl.height }}
                    >
                      <img src={pl.previewUrl} alt="Signature" className="max-w-full max-h-full object-contain p-1 pointer-events-none" />
                      <button
                        type="button"
                        onClick={() => removePlacement(pl.id)}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>

        <SignaturePad
          open={captureOpen}
          defaultName={defaultSignerName}
          onCancel={() => setCaptureOpen(false)}
          onConfirm={handleSignatureCaptured}
        />
      </div>
    );
  }
);
