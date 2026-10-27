import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export interface InteractivePdfEditorHandle {
  /** Every text field's current value, keyed by its PDF field name — ready
   * to feed straight into pdf-lib's setText() the same way the auto-filled
   * fields already are. Includes fields that were pre-filled from the
   * employee record, since those are editable here too. */
  getFieldValues: () => Record<string, string>;
  /** Every checkbox/radio widget's current checked state, keyed by its PDF
   * field name — feed into pdf-lib's PDFCheckBox.check()/uncheck(). */
  getCheckboxValues: () => Record<string, boolean>;
}

interface Props {
  pdfBytes: Uint8Array;
  /** Fires with the full current checkbox state after every checkbox click —
   * lets a caller compute something derived live (e.g. a score tally) without
   * polling getCheckboxValues(). Optional; existing callers are unaffected. */
  onCheckboxChange?: (values: Record<string, boolean>) => void;
  /** Sets of checkbox field names (e.g. the 5 score boxes in one scoring
   * rubric row) that behave like a radio group — checking one in a group
   * unchecks the others in that same group. Checkboxes not listed in any
   * group stay independent, as before. Optional; existing callers that don't
   * pass this see no change in behavior. */
  checkboxGroups?: readonly (readonly string[])[];
  /** Clickable "sign here" hot-zones drawn on top of the rendered page, for
   * blank areas of the document that aren't PDF form fields at all (e.g. a
   * signature cell). Pass only the slots that should currently be
   * clickable — once a caller stamps a signature into one and reloads the
   * PDF with new `pdfBytes`, simply omit that slot to make it disappear
   * (the stamped image shows through the page raster instead). Optional. */
  signatureSlots?: { id: string; page: number; rect: { x: number; y: number; width: number; height: number }; label?: string }[];
  onSignSlotClick?: (id: string) => void;
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

interface CheckboxOverlay {
  name: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  initialChecked: boolean;
}

interface SignatureSlotOverlay {
  id: string;
  page: number;
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
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

/** Samples the rendered canvas inside a slot's rect (shrunk a few px on each
 * side, to dodge the cell's own border lines) and reports whether there's
 * already drawn content there — a signature baked in from an earlier
 * session, say. Used to auto-hide a "sign here" prompt that would otherwise
 * sit directly on top of a signature that's already there. */
function regionHasInk(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number): boolean {
  const inset = 4;
  const x = Math.max(0, Math.round(left + inset));
  const y = Math.max(0, Math.round(top + inset));
  const w = Math.max(1, Math.round(width - inset * 2));
  const h = Math.max(1, Math.round(height - inset * 2));
  if (x + w > ctx.canvas.width || y + h > ctx.canvas.height) return false;

  const { data } = ctx.getImageData(x, y, w, h);
  let darkPixels = 0;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a > 10 && (r < 200 || g < 200 || b < 200)) darkPixels++;
  }
  // A handful of stray dark pixels (JPEG-ish artifacts, anti-aliasing) isn't
  // a signature — real ink covers a meaningfully larger area than that.
  return darkPixels > 25;
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
  { pdfBytes, onCheckboxChange, checkboxGroups, signatureSlots, onSignSlotClick },
  ref
) {
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [overlays, setOverlays] = useState<FieldOverlay[]>([]);
  const [checkboxOverlays, setCheckboxOverlays] = useState<CheckboxOverlay[]>([]);
  const [signatureSlotOverlays, setSignatureSlotOverlays] = useState<SignatureSlotOverlay[]>([]);
  const [loading, setLoading] = useState(true);
  const valuesRef = useRef<Record<string, string>>({});
  const checkboxValuesRef = useRef<Record<string, boolean>>({});
  const checkboxElsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // field name -> its group (if any), rebuilt only when the groups prop itself changes.
  const groupByField = useMemo(() => {
    const map = new Map<string, readonly string[]>();
    for (const group of checkboxGroups ?? []) {
      for (const name of group) map.set(name, group);
    }
    return map;
  }, [checkboxGroups]);

  useImperativeHandle(ref, () => ({
    getFieldValues: () => ({ ...valuesRef.current }),
    getCheckboxValues: () => ({ ...checkboxValuesRef.current }),
  }));

  useEffect(() => {
    let cancelled = false;
    let firstPageReady = false;
    const objectUrls: string[] = [];

    (async () => {
      setLoading(true);
      setPages([]);
      setOverlays([]);
      setCheckboxOverlays([]);
      setSignatureSlotOverlays([]);
      valuesRef.current = {};
      checkboxValuesRef.current = {};

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
        const pageCheckboxOverlays: CheckboxOverlay[] = [];
        const pageValues: Record<string, string> = {};
        const pageCheckboxValues: Record<string, boolean> = {};
        for (const a of annotations) {
          if (!a.fieldName) continue;

          const [x1, y1] = viewport.convertToViewportPoint(a.rect[0], a.rect[1]);
          const [x2, y2] = viewport.convertToViewportPoint(a.rect[2], a.rect[3]);
          const left = Math.min(x1, x2);
          const top = Math.min(y1, y2);
          const width = Math.abs(x2 - x1);
          const height = Math.abs(y2 - y1);

          if (a.fieldType === 'Tx') {
            const value = typeof a.fieldValue === 'string' ? a.fieldValue : '';
            pageOverlays.push({
              name: a.fieldName, page: pageNumber, left, top, width, height,
              initialValue: value, multiLine: !!a.multiLine,
            });
            pageValues[a.fieldName] = value;
          } else if (a.fieldType === 'Btn' && !a.radioButton && !a.pushButton) {
            // Checkbox widget — a.fieldValue is the current export state
            // name (e.g. "Off" or the "on" value like "Yes"/"1").
            const checked = typeof a.fieldValue === 'string' && a.fieldValue !== 'Off' && a.fieldValue !== '';
            pageCheckboxOverlays.push({
              name: a.fieldName, page: pageNumber, left, top, width, height, initialChecked: checked,
            });
            pageCheckboxValues[a.fieldName] = checked;
          }
        }

        // Signature slots aren't PDF form fields/annotations — their rects
        // come from the `signatureSlots` prop in PDF point space (bottom-left
        // origin, same convention as pdf-lib), so they go through the exact
        // same viewport transform as the real annotations above. A slot that
        // already has ink in it (signed in an earlier session, or just
        // stamped and reloaded) is dropped rather than shown, so the "+ Sign"
        // prompt never sits on top of an actual signature.
        const pageSlotOverlays: SignatureSlotOverlay[] = (signatureSlots ?? [])
          .filter((s) => s.page === pageNumber)
          .map((s) => {
            const [sx1, sy1] = viewport.convertToViewportPoint(s.rect.x, s.rect.y);
            const [sx2, sy2] = viewport.convertToViewportPoint(s.rect.x + s.rect.width, s.rect.y + s.rect.height);
            return {
              id: s.id, page: pageNumber, label: s.label,
              left: Math.min(sx1, sx2), top: Math.min(sy1, sy2),
              width: Math.abs(sx2 - sx1), height: Math.abs(sy2 - sy1),
            };
          })
          .filter((o) => !ctx || !regionHasInk(ctx, o.left, o.top, o.width, o.height));

        if (cancelled) return;
        valuesRef.current = { ...valuesRef.current, ...pageValues };
        checkboxValuesRef.current = { ...checkboxValuesRef.current, ...pageCheckboxValues };
        setPages((prev) => [...prev, { pageNumber, imageUrl, width: viewport.width, height: viewport.height }].sort((a, b) => a.pageNumber - b.pageNumber));
        setOverlays((prev) => [...prev, ...pageOverlays]);
        setCheckboxOverlays((prev) => [...prev, ...pageCheckboxOverlays]);
        setSignatureSlotOverlays((prev) => [...prev, ...pageSlotOverlays]);
        if (!firstPageReady) {
          firstPageReady = true;
          setLoading(false);
        }
      };

      await Promise.all(Array.from({ length: doc.numPages }, (_, i) => renderPage(i + 1)));
      // Lets a caller that needs the document's own pre-existing checkbox
      // state right away (e.g. showing a score tally computed from boxes the
      // loaded PDF already has checked) get it without waiting for the user
      // to click anything — harmless no-op for callers that don't care,
      // since it reports whatever's already loaded.
      if (!cancelled) onCheckboxChange?.({ ...checkboxValuesRef.current });
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
          {checkboxOverlays
            .filter((o) => o.page === p.pageNumber)
            .map((o) => (
              <input
                key={o.name}
                type="checkbox"
                defaultChecked={o.initialChecked}
                ref={(el) => {
                  checkboxElsRef.current[o.name] = el;
                }}
                onChange={(e) => {
                  const checked = e.target.checked;
                  checkboxValuesRef.current[o.name] = checked;
                  if (checked) {
                    // Radio-like group: uncheck every other box in the same
                    // group, both in the DOM (these are uncontrolled inputs,
                    // so the element itself has to be told directly) and in
                    // the tracked values.
                    const group = groupByField.get(o.name);
                    if (group) {
                      for (const other of group) {
                        if (other === o.name || !checkboxValuesRef.current[other]) continue;
                        checkboxValuesRef.current[other] = false;
                        const otherEl = checkboxElsRef.current[other];
                        if (otherEl) otherEl.checked = false;
                      }
                    }
                  }
                  onCheckboxChange?.({ ...checkboxValuesRef.current });
                }}
                className="absolute cursor-pointer accent-[#3f83f8]"
                style={{ left: o.left, top: o.top, width: Math.max(o.width, 10), height: Math.max(o.height, 10) }}
              />
            ))}
          {signatureSlotOverlays
            .filter((s) => s.page === p.pageNumber)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSignSlotClick?.(s.id)}
                className="absolute flex items-center justify-center gap-1 rounded-[2px] border border-dashed border-[#3f83f8] bg-[#3f83f8]/10 hover:bg-[#3f83f8]/20 text-[#1a56db] text-[11px] font-medium"
                style={{ left: s.left, top: s.top, width: s.width, height: s.height }}
              >
                {s.label ?? '+ Sign'}
              </button>
            ))}
        </div>
      ))}
    </div>
  );
});
