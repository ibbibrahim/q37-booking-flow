import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { useHrLanguage } from '../context/HrLanguageContext';

interface Props {
  imageUrl: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

async function getCroppedFile(imageUrl: string, cropPixels: Area, fileName: string): Promise<File | null> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(cropPixels.width);
  canvas.height = Math.round(cropPixels.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(
    img,
    cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height,
    0, 0, cropPixels.width, cropPixels.height
  );

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  return blob ? new File([blob], fileName, { type: 'image/jpeg' }) : null;
}

/** Lets HR manually drag/resize a crop box over the uploaded QID photo and use that
 * selection as the profile picture — replaces trying to guess the photo's position
 * automatically, which proved unreliable across different card content. */
export function QidPhotoCropModal({ imageUrl, onCancel, onConfirm }: Props) {
  const { t } = useHrLanguage();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const file = await getCroppedFile(imageUrl, croppedAreaPixels, 'QID-Photo.jpg');
      if (file) onConfirm(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl p-5 flex flex-col gap-4 max-w-sm w-full">
        <div>
          <h3 className="text-sm font-medium text-foreground">{t('cropPhoto')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('cropPhotoHint')}</p>
        </div>

        <div className="relative w-full h-72 bg-black rounded-md overflow-hidden">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <input
          type="range"
          min={1}
          max={4}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary"
          aria-label="Zoom"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm} disabled={saving || !croppedAreaPixels}>
            {saving ? t('scanning') : t('useThisCrop')}
          </Button>
        </div>
      </div>
    </div>
  );
}
