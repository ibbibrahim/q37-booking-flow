import { useRef, useState } from 'react';
import { Loader2, ScanLine, ShieldCheck, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { qidIntakeApi } from '../api/qidIntakeApi';
import { QidScanningModal } from '../components/QidScanningModal';
import { HrLanguageProvider } from '../context/HrLanguageContext';
import qidSample from '@/assets/qid-holder.jpg';
import type { HrQidScanResult } from '../types/hrApi';

const ALLOWED_QID_SCAN_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

interface FormState {
  qid: string;
  fullNameEn: string;
  fullNameAr: string;
  dob: string;
  qidExpiry: string;
  nationality: string;
  occupation: string;
  passportNumber: string;
  passportExpiry: string;
  employer: string;
  residencyType: string;
}

const emptyFields: FormState = {
  qid: '', fullNameEn: '', fullNameAr: '', dob: '', qidExpiry: '', nationality: '',
  occupation: '', passportNumber: '', passportExpiry: '', employer: '', residencyType: '',
};

/** Unauthenticated QID intake — no login. A freelancer sends their QID scan
 * to the coordinator by email/WhatsApp/etc.; the coordinator opens this
 * page, types the name, uploads that photo, scans it (same OCR pipeline as
 * Add Employee), reviews/corrects the extracted fields, and submits. Fully
 * repeatable — submitting clears the form for the next person. This is only
 * the intake step: nothing here touches hr_employees; matching/creating the
 * actual employee record happens later, inside the authenticated HR area. */
// QidScanningModal (reused from Add Employee) reads from HrLanguageContext
// internally — that provider normally only exists inside the authenticated
// HR layout, which this standalone/unauthenticated page sits outside of, so
// it's supplied locally here instead.
export function QidIntakePage() {
  return (
    <HrLanguageProvider>
      <QidIntakePageContent />
    </HrLanguageProvider>
  );
}

function QidIntakePageContent() {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<HrQidScanResult | null>(null);
  const [fields, setFields] = useState<FormState>(emptyFields);
  const [submitting, setSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setName('');
    setImageFile(null);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setScanResult(null);
    setFields(emptyFields);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleFileSelect = (file: File | null) => {
    if (file && !ALLOWED_QID_SCAN_TYPES.includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP images are allowed.', 'error');
      return;
    }
    setImageFile(file);
    setScanResult(null);
    setFields(emptyFields);
    setImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleScan = async () => {
    if (!imageFile) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await qidIntakeApi.scanQid(imageFile);
      setScanResult(result);
      setFields({
        qid: result.qid ?? '',
        fullNameEn: result.fullNameEn ?? '',
        fullNameAr: result.fullNameAr ?? '',
        dob: toDateInputValue(result.dob),
        qidExpiry: toDateInputValue(result.qidExpiry),
        nationality: result.nationality ?? '',
        occupation: result.occupation ?? '',
        passportNumber: result.passportNumber ?? '',
        passportExpiry: toDateInputValue(result.passportExpiry),
        employer: result.employer ?? '',
        residencyType: result.residencyType ?? '',
      });
      if (!name.trim() && result.fullNameEn) setName(result.fullNameEn);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to scan QID.'), 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Name is required.', 'error');
      return;
    }
    if (!imageFile) {
      showToast('Please upload the QID image.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await qidIntakeApi.submit({
        name: name.trim(),
        image: imageFile,
        qid: fields.qid || null,
        fullNameEn: fields.fullNameEn || null,
        fullNameAr: fields.fullNameAr || null,
        dob: fields.dob || null,
        qidExpiry: fields.qidExpiry || null,
        nationality: fields.nationality || null,
        occupation: fields.occupation || null,
        passportNumber: fields.passportNumber || null,
        passportExpiry: fields.passportExpiry || null,
        employer: fields.employer || null,
        residencyType: fields.residencyType || null,
      });
      setSubmittedCount((c) => c + 1);
      showToast('Saved. Ready for the next one.', 'success');
      resetForm();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to save this submission.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <QidScanningModal open={scanning} imageUrl={imagePreview} />

      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Freelance QID Intake</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload the QID scan a freelancer sent you, review the details, and submit — no login needed.
            {submittedCount > 0 && <span className="ml-1 font-medium text-foreground">{submittedCount} submitted so far.</span>}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div>
            <Label htmlFor="qid-intake-name" className="mb-1.5 block">Name *</Label>
            <Input
              id="qid-intake-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Freelancer's name"
              disabled={submitting}
            />
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine size={16} className="text-primary" />
              <Label className="text-sm font-medium">QID Scan</Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <img
                src={imagePreview ?? qidSample}
                alt="QID scan preview"
                className="shrink-0 w-28 rounded-md border border-border object-contain bg-black"
              />

              <div className="flex-1 space-y-3 min-w-0">
                <p className="text-xs text-muted-foreground">
                  One photo with the QID front and back stacked top-to-bottom, as exported by the official Qatar ID app.
                </p>

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={submitting} className="max-w-full gap-1.5">
                    <UploadCloud size={14} />
                    <span className="truncate">{imageFile ? imageFile.name : 'Choose file'}</span>
                  </Button>
                  <Button type="button" size="sm" disabled={!imageFile || scanning || submitting} onClick={handleScan} className="gap-1.5">
                    {scanning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…
                      </>
                    ) : (
                      <>
                        <ScanLine size={14} /> Scan QID
                      </>
                    )}
                  </Button>
                </div>

                {scanResult && (
                  <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                    <p className="text-foreground font-medium flex items-center gap-1.5">
                      <ShieldCheck size={13} className="text-success" /> Details scanned — review below before submitting.
                    </p>
                    {scanResult.warnings.length > 0 && (
                      <p className="text-warning">Couldn't read: {scanResult.warnings.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {(scanResult || fields.qid) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="mb-1.5 block text-xs">QID Number</Label>
                <Input value={fields.qid} onChange={(e) => update('qid', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Nationality</Label>
                <Input value={fields.nationality} onChange={(e) => update('nationality', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Full Name (English)</Label>
                <Input value={fields.fullNameEn} onChange={(e) => update('fullNameEn', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Full Name (Arabic)</Label>
                <Input value={fields.fullNameAr} onChange={(e) => update('fullNameAr', e.target.value)} disabled={submitting} dir="rtl" />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Date of Birth</Label>
                <Input type="date" value={fields.dob} onChange={(e) => update('dob', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">QID Expiry</Label>
                <Input type="date" value={fields.qidExpiry} onChange={(e) => update('qidExpiry', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Passport Number</Label>
                <Input value={fields.passportNumber} onChange={(e) => update('passportNumber', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Passport Expiry</Label>
                <Input type="date" value={fields.passportExpiry} onChange={(e) => update('passportExpiry', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Employer</Label>
                <Input value={fields.employer} onChange={(e) => update('employer', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Occupation (visa)</Label>
                <Input value={fields.occupation} onChange={(e) => update('occupation', e.target.value)} disabled={submitting} />
              </div>
              <div>
                <Label className="mb-1.5 block text-xs">Residency Type</Label>
                <Input value={fields.residencyType} onChange={(e) => update('residencyType', e.target.value)} disabled={submitting} />
              </div>
            </div>
          )}

          <Button className="w-full gap-1.5" disabled={submitting || !name.trim() || !imageFile} onClick={handleSubmit}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : (
              'Submit and Add Next'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
