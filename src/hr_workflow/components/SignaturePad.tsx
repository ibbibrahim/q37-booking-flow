import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PenLine, Type as TypeIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHrLanguage } from '../context/HrLanguageContext';
import type { HrSignatureMethod } from '../types/hrApi';

interface Props {
  open: boolean;
  defaultName?: string;
  onCancel: () => void;
  onConfirm: (pngBlob: Blob, method: HrSignatureMethod) => void;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

// react-signature-canvas's own getTrimmedCanvas() depends on the
// "trim-canvas" package, whose CJS export breaks under Vite's dev-server
// pre-bundler (esbuild's interop shim resolves it to a non-function) even
// though it works fine once Rollup builds it for production — trimming it
// ourselves avoids that dependency entirely.
function trimCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return canvas; // nothing drawn

  const trimmedWidth = maxX - minX + 1;
  const trimmedHeight = maxY - minY + 1;
  const trimmed = document.createElement('canvas');
  trimmed.width = trimmedWidth;
  trimmed.height = trimmedHeight;
  trimmed
    .getContext('2d')
    ?.drawImage(canvas, minX, minY, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
  return trimmed;
}

// Renders typed text onto an offscreen canvas using a cursive-style font,
// producing the same kind of PNG the Draw/Upload tabs produce — every mode
// converges to "one signature image" before it ever touches the PDF.
function renderTypedSignature(text: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (!ctx || !text.trim()) return Promise.resolve(null);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'italic 56px "Segoe Script", "Brush Script MT", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text.trim(), canvas.width / 2, canvas.height / 2);

  return canvasToBlob(canvas);
}

/** DocuSign-style signature capture — draw, type, or upload an image, all
 * producing the same PNG output that gets stamped onto the contract PDF. */
export function SignaturePad({ open, defaultName, onCancel, onConfirm }: Props) {
  const { t } = useHrLanguage();
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(400);
  const [typedName, setTypedName] = useState(defaultName ?? '');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [saving, setSaving] = useState(false);

  // The canvas's pixel width/height attributes must match its actual
  // rendered CSS size exactly — react-signature-canvas maps pointer events
  // straight to canvas coordinates, so any mismatch (e.g. a fixed attribute
  // width next to a CSS "w-full" class) makes drawn strokes land in the
  // wrong place or fail to register at all.
  useEffect(() => {
    if (!open || tab !== 'draw' || !canvasWrapperRef.current) return;
    const el = canvasWrapperRef.current;
    const measure = () => setCanvasWidth(el.clientWidth || 400);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, tab]);

  if (!open) return null;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      if (tab === 'draw') {
        if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) return;
        const canvas = trimCanvas(sigCanvasRef.current.getCanvas());
        const blob = await canvasToBlob(canvas);
        if (blob) onConfirm(blob, 'Draw');
      } else if (tab === 'type') {
        const blob = await renderTypedSignature(typedName);
        if (blob) onConfirm(blob, 'Type');
      } else if (tab === 'upload' && uploadedFile) {
        onConfirm(uploadedFile, 'Upload');
      }
    } finally {
      setSaving(false);
    }
  };

  const canConfirm =
    (tab === 'draw') ||
    (tab === 'type' && typedName.trim().length > 0) ||
    (tab === 'upload' && !!uploadedFile);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl p-5 flex flex-col gap-4 max-w-md w-full">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('signContract')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('signContractHint')}</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="draw" className="gap-1.5"><PenLine size={14} /> {t('signDraw')}</TabsTrigger>
            <TabsTrigger value="type" className="gap-1.5"><TypeIcon size={14} /> {t('signType')}</TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5"><Upload size={14} /> {t('signUpload')}</TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div ref={canvasWrapperRef} className="rounded-md border border-border bg-white overflow-hidden">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#1a1a1a"
                canvasProps={{ width: canvasWidth, height: 180 }}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1.5"
              onClick={() => sigCanvasRef.current?.clear()}
            >
              {t('clear')}
            </Button>
          </TabsContent>

          <TabsContent value="type" className="mt-4 space-y-3">
            <Input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder={t('fullName')}
            />
            {typedName.trim() && (
              <div className="rounded-md border border-border bg-white p-4 flex items-center justify-center h-24">
                <span className="text-3xl italic" style={{ fontFamily: '"Segoe Script", "Brush Script MT", cursive' }}>
                  {typedName}
                </span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => uploadInputRef.current?.click()} className="max-w-full">
              <span className="truncate">{uploadedFile ? uploadedFile.name : t('chooseFile')}</span>
            </Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={!canConfirm || saving}>
            {saving ? t('scanning') : t('signAndComplete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
