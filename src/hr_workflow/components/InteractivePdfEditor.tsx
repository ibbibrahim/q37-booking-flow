import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface InteractivePdfEditorHandle {
  /** Every field's current value, keyed by its PDF field name — ready to
   * feed straight into pdf-lib's setText() the same way the auto-filled
   * fields already are. Includes fields that were pre-filled from the
   * employee record, since those are editable here too. */
  getFieldValues: () => Record<string, string>;
}

interface Props {
  pdfBytes: Uint8Array;
}

interface RenderedPage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

interface FieldOverlay {
  name: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  initialValue: string;
  multiLine: boolean;
}

const RENDER_SCALE = 1.6;
// Matches contractPdf.ts's FIELD_FONT_SIZE (9pt) at RENDER_SCALE, so what the
// coordinator sees while typing looks like what gets baked into the saved
// PDF instead of a mismatched preview.
const BASE_FONT_PX = 14;
const MIN_FONT_PX = 9;

let measureCtx: CanvasRenderingContext2D | null = null;
function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')!;
  }
  return measureCtx;
}

/** Shrinks the font size (down to a floor) until `text` actually fits
 * `maxWidth` — same idea as contractPdf.ts's setFieldFitted, just measured
 * with Canvas2D instead of pdf-lib, so a long value visibly fits inside its
 * box while the coordinator is typing instead of only being fixed on save. */
function fitFontSize(text: string, maxWidth: number): number {
  const ctx = getMeasureCtx();
  let size = BASE_FONT_PX;
  if (!text) return size;
  ctx.font = `${size}px sans-serif`;
  while (size > MIN_FONT_PX && ctx.measureText(text).width > maxWidth) {
    size -= 0.5;
    ctx.font = `${size}px sans-serif`;
  }
  return size;
}

/** Renders every page of the fillable contract exactly as the native PDF
 * viewer would, at the same resolution and layout, with every text field —
 * including the ones pre-filled from the employee record — editable
 * directly on the page. The rendered page image itself is drawn with form
 * appearances turned off (annotationMode: ENABLE_FORMS), so a field's value
 * is only ever shown once, through its live input, never baked into the
 * background image underneath it too. */
export const InteractivePdfEditor = forwardRef<InteractivePdfEditorHandle, Props>(function InteractivePdfEditor(
  { pdfBytes },
  ref
) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [overlays, setOverlays] = useState<FieldOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const valuesRef = useRef<Record<string, string>>({});

  useImperativeHandle(ref, () => ({
    getFieldValues: () => ({ ...valuesRef.current }),
  }));

  useEffect(() => {
    let cancelled = false;
    let firstPageReady = false;
    const objectUrls: string[] = [];

    (async () => {
      setLoading(true);
      setPages([]);
      setOverlays([]);
      valuesRef.current = {};

      const doc = await pdfjsLib.getDocument({ data: pdfBytes.slice() }).promise;
      if (cancelled) return;

      // Pages render independently and in parallel instead of one at a time
      // — a 12-page contract rendered sequentially made "Edit" feel like it
      // hung, since nothing appeared until every page (including the huge
      // page-12 field) had finished. Each page now reveals itself the
      // instant it's ready, so page 1 is interactive almost immediately
      // while the rest stream in behind it.
      const renderPage = async (pageNumber: number) => {
        const page = await doc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // ENABLE_FORMS excludes interactive form-field widgets from the
          // raster — only the static template (labels, lines, logos) is
          // drawn here. Field values live entirely in the input/textarea
          // overlays below, so a value never appears twice (once baked into
          // this image, once in an overlay on top of it).
          await page.render({
            canvas,
            canvasContext: ctx,
            viewport,
            annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS,
          }).promise;
        }
        if (cancelled) return;

        const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (cancelled) return;
        const imageUrl = blob ? URL.createObjectURL(blob) : '';
        if (imageUrl) objectUrls.push(imageUrl);

        const annotations = await page.getAnnotations({ intent: 'display' });
        const pageOverlays: FieldOverlay[] = [];
        const pageValues: Record<string, string> = {};
        for (const a of annotations) {
          if (a.fieldType !== 'Tx' || !a.fieldName) continue;

          const [x1, y1] = viewport.convertToViewportPoint(a.rect[0], a.rect[1]);
          const [x2, y2] = viewport.convertToViewportPoint(a.rect[2], a.rect[3]);
          const left = Math.min(x1, x2);
          const top = Math.min(y1, y2);
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);

          const value = typeof a.fieldValue === 'string' ? a.fieldValue : '';
          pageOverlays.push({
            name: a.fieldName,
            page: pageNumber,
            left,
            top,
            width,
            height,
            initialValue: value,
            multiLine: !!a.multiLine,
          });
          pageValues[a.fieldName] = value;
        }

        if (cancelled) return;
        valuesRef.current = { ...valuesRef.current, ...pageValues };
        setPages((prev) => [...prev, { pageNumber, imageUrl, width: viewport.width, height: viewport.height }].sort((a, b) => a.pageNumber - b.pageNumber));
        setOverlays((prev) => [...prev, ...pageOverlays]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBytes]);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading document…</div>;
  }

  return (
    <div className="space-y-3 py-4 flex flex-col items-center bg-[#525659]">
      {pages.map((p) => (
        <div
          key={p.pageNumber}
          className="relative bg-white shadow-md"
          style={{ width: p.width, height: p.height }}
        >
          <img src={p.imageUrl} alt={`Page ${p.pageNumber}`} className="absolute inset-0 w-full h-full" draggable={false} />
          {overlays
            .filter((o) => o.page === p.pageNumber)
            .map((o) =>
              o.multiLine ? (
                <textarea
                  key={o.name}
                  defaultValue={o.initialValue}
                  onChange={(e) => {
                    valuesRef.current[o.name] = e.target.value;
                  }}
                  className="absolute resize-none bg-[#c4dbf6]/35 hover:bg-[#c4dbf6]/55 focus:bg-white border-0 outline-none focus:ring-2 focus:ring-[#3f83f8] rounded-[1px] px-1 py-0.5 font-sans leading-snug"
                  style={{ left: o.left, top: o.top, width: o.width, height: o.height, fontSize: BASE_FONT_PX }}
                />
              ) : (
                <input
                  key={o.name}
                  defaultValue={o.initialValue}
                  ref={(el) => {
                    if (el) el.style.fontSize = `${fitFontSize(el.value, o.width - 6)}px`;
                  }}
                  onChange={(e) => {
                    valuesRef.current[o.name] = e.target.value;
                    e.target.style.fontSize = `${fitFontSize(e.target.value, o.width - 6)}px`;
                  }}
                  className="absolute truncate bg-[#c4dbf6]/35 hover:bg-[#c4dbf6]/55 focus:bg-white border-0 outline-none focus:ring-2 focus:ring-[#3f83f8] rounded-[1px] px-0.5 font-sans"
                  style={{ left: o.left, top: o.top, width: o.width, height: o.height, lineHeight: `${o.height}px` }}
                />
              )
            )}
        </div>
      ))}
    </div>
  );
});
