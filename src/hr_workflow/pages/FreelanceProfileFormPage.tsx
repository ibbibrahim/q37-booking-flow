import { useRef, useState } from 'react';
import { Loader2, Plus, ScanLine, ShieldCheck, Trash2, UploadCloud, User, GraduationCap, Briefcase, Award, Landmark, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { freelanceProfilePublicApi } from '../api/freelanceProfileApi';
import { QidScanningModal } from '../components/QidScanningModal';
import { HrLanguageProvider } from '../context/HrLanguageContext';
import qidSample from '@/assets/qid-holder.jpg';
import type {
  FreelanceProfileEducationDraft,
  FreelanceProfileExperienceDraft,
  FreelanceProfileCertificateDraft,
  FreelanceProfileFormFields,
  FreelanceProfileFormFiles,
} from '../types/freelanceProfile';
import type { HrQidScanResult } from '../types/hrApi';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_EDUCATION_ENTRIES = 3;

// Placeholder list — HR is providing the real dropdown options; swap this
// array out once received, nothing else needs to change.
const QUALIFICATION_LEVELS = [
  'High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'Doctorate (PhD)', 'Professional Certification', 'Other',
];

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const emptyFields: FreelanceProfileFormFields = {
  title: '', fullNameEn: '', fullNameAr: '', qid: '', qidExpiry: '', passportNumber: '', passportExpiry: '',
  nationality: '', dob: '', employer: '', gender: '', bloodType: '', maritalStatus: '', phoneNumber: '',
  personalEmail: '', address: '', residenceCountry: '', languages: '',
  emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
  hasRelativesAtQbc: false, relativeFullName: '', relativeRelationship: '', relativeDepartment: '',
  bankBeneficiaryName: '', bankName: '', bankBranch: '', bankAccountNumber: '', bankIban: '',
  declarationAccepted: false,
};

const emptyFiles: FreelanceProfileFormFiles = {
  qidImage: null, photo: null, cv: null, employerNocLetter: null, employerEstablishmentCard: null, bankCertificate: null,
};

function FileInputButton({
  label, file, onSelect, accept = 'image/jpeg,image/png,image/webp,application/pdf', disabled,
}: {
  label: string; file: File | null; onSelect: (file: File | null) => void; accept?: string; disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onSelect(e.target.files?.[0] ?? null)} />
      <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={disabled} className="gap-1.5 max-w-full">
        <UploadCloud size={14} />
        <span className="truncate">{file ? file.name : label}</span>
      </Button>
    </div>
  );
}

export function FreelanceProfileFormPage() {
  return (
    <HrLanguageProvider>
      <FreelanceProfileFormContent />
    </HrLanguageProvider>
  );
}

function FreelanceProfileFormContent() {
  const { showToast } = useToast();

  const [fields, setFields] = useState<FreelanceProfileFormFields>(emptyFields);
  const [files, setFiles] = useState<FreelanceProfileFormFiles>(emptyFiles);
  const [education, setEducation] = useState<FreelanceProfileEducationDraft[]>([{ qualificationLevel: '', file: null }]);
  const [experience, setExperience] = useState<FreelanceProfileExperienceDraft[]>([{ companyName: '', country: '', jobTitle: '', file: null }]);
  const [certificates, setCertificates] = useState<FreelanceProfileCertificateDraft[]>([]);

  const [qidPreview, setQidPreview] = useState<string | null>(null);
  const [scanningQid, setScanningQid] = useState(false);
  const [qidScanResult, setQidScanResult] = useState<HrQidScanResult | null>(null);

  const [scanningBank, setScanningBank] = useState(false);
  const [bankScanApplied, setBankScanApplied] = useState(false);
  const [bankScanWarnings, setBankScanWarnings] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  const update = <K extends keyof FreelanceProfileFormFields>(key: K, value: FreelanceProfileFormFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const setFile = <K extends keyof FreelanceProfileFormFiles>(key: K, file: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: file }));

  const resetForm = () => {
    setFields(emptyFields);
    setFiles(emptyFiles);
    setEducation([{ qualificationLevel: '', file: null }]);
    setExperience([{ companyName: '', country: '', jobTitle: '', file: null }]);
    setCertificates([]);
    setQidPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setQidScanResult(null);
    setBankScanApplied(false);
    setBankScanWarnings([]);
  };

  const handleQidFileSelect = (file: File | null) => {
    if (file && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP images are allowed.', 'error');
      return;
    }
    setFile('qidImage', file);
    setQidScanResult(null);
    setQidPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleScanQid = async () => {
    if (!files.qidImage) return;
    setScanningQid(true);
    try {
      const result = await freelanceProfilePublicApi.scanQid(files.qidImage);
      setQidScanResult(result);
      setFields((prev) => ({
        ...prev,
        fullNameEn: result.fullNameEn ?? prev.fullNameEn,
        fullNameAr: result.fullNameAr ?? prev.fullNameAr,
        qid: result.qid ?? prev.qid,
        qidExpiry: result.qidExpiry ? toDateInputValue(result.qidExpiry) : prev.qidExpiry,
        passportNumber: result.passportNumber ?? prev.passportNumber,
        passportExpiry: result.passportExpiry ? toDateInputValue(result.passportExpiry) : prev.passportExpiry,
        nationality: result.nationality ?? prev.nationality,
        dob: result.dob ? toDateInputValue(result.dob) : prev.dob,
        employer: result.employer ?? prev.employer,
      }));
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to scan QID.'), 'error');
    } finally {
      setScanningQid(false);
    }
  };

  const handleBankCertificateSelect = (file: File | null) => {
    if (file && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP images are allowed.', 'error');
      return;
    }
    setFile('bankCertificate', file);
    setBankScanApplied(false);
    setBankScanWarnings([]);
  };

  const handleScanBankCertificate = async () => {
    if (!files.bankCertificate) return;
    setScanningBank(true);
    try {
      const result = await freelanceProfilePublicApi.scanBankCertificate(files.bankCertificate);
      setFields((prev) => ({
        ...prev,
        bankBeneficiaryName: result.beneficiaryName ?? prev.bankBeneficiaryName,
        bankName: result.bankName ?? prev.bankName,
        bankBranch: result.branch ?? prev.bankBranch,
        bankAccountNumber: result.accountNumber ?? prev.bankAccountNumber,
        bankIban: result.iban ?? prev.bankIban,
      }));
      setBankScanApplied(true);
      setBankScanWarnings(result.warnings);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to scan bank certificate.'), 'error');
    } finally {
      setScanningBank(false);
    }
  };

  const handleSubmit = async () => {
    if (!fields.fullNameEn.trim() || !fields.qid.trim()) {
      showToast('Full name and QID number are required.', 'error');
      return;
    }
    if (fields.hasRelativesAtQbc && !fields.relativeFullName.trim()) {
      showToast("Relative's full name is required.", 'error');
      return;
    }
    if (!fields.declarationAccepted) {
      showToast('Please accept the document declaration before submitting.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await freelanceProfilePublicApi.submit(fields, files, education, experience, certificates);
      setSubmittedCount((c) => c + 1);
      showToast('Profile submitted. HR will review it shortly.', 'success');
      resetForm();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to submit. Please try again.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // The app sets html/body to overflow:hidden globally (every other
    // screen scrolls inside the authenticated layout's own inner
    // container) — this standalone page has no such wrapper, so it has to
    // provide its own scroll region instead of relying on the document.
    <div className="h-screen overflow-y-auto bg-muted/30 py-8 px-4">
      <QidScanningModal open={scanningQid} imageUrl={qidPreview} />

      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Freelancer Profile Form</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete every section that applies to you and submit — no login needed.
            {submittedCount > 0 && <span className="ml-1 font-medium text-foreground">{submittedCount} submitted this session.</span>}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <Tabs defaultValue="personal">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="personal" className="gap-1.5"><User size={14} /> Personal Info</TabsTrigger>
              <TabsTrigger value="education" className="gap-1.5"><GraduationCap size={14} /> Education</TabsTrigger>
              <TabsTrigger value="experience" className="gap-1.5"><Briefcase size={14} /> Experience</TabsTrigger>
              <TabsTrigger value="certificates" className="gap-1.5"><Award size={14} /> Certificates</TabsTrigger>
              <TabsTrigger value="bank" className="gap-1.5"><Landmark size={14} /> Bank Account</TabsTrigger>
              <TabsTrigger value="declaration" className="gap-1.5"><Users2 size={14} /> Relatives &amp; Declaration</TabsTrigger>
            </TabsList>

            {/* ============ 1. PERSONAL INFORMATION ============ */}
            <TabsContent value="personal" className="mt-6 space-y-6">
              <div className="rounded-lg border border-dashed border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine size={16} className="text-primary" />
                  <Label className="text-sm font-medium">Scan your QID (front &amp; back, one photo, as exported by Metrash)</Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <img src={qidPreview ?? qidSample} alt="QID preview" className="shrink-0 w-28 rounded-md border border-border object-contain bg-black" />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileInputButton label="Choose QID image" file={files.qidImage} onSelect={handleQidFileSelect} accept="image/jpeg,image/png,image/webp" disabled={submitting} />
                      <Button type="button" size="sm" disabled={!files.qidImage || scanningQid || submitting} onClick={handleScanQid} className="gap-1.5">
                        {scanningQid ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</> : <><ScanLine size={14} /> Scan QID</>}
                      </Button>
                    </div>
                    {qidScanResult && (
                      <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                        <p className="text-foreground font-medium flex items-center gap-1.5"><ShieldCheck size={13} className="text-success" /> Details scanned — review below.</p>
                        {qidScanResult.warnings.length > 0 && <p className="text-warning">Couldn't read: {qidScanResult.warnings.join(', ')}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs">Title</Label>
                  <Select value={fields.title} onValueChange={(v) => update('title', v)} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Eng.'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs">Full Name *</Label>
                  <Input value={fields.fullNameEn} onChange={(e) => update('fullNameEn', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Full Name (Arabic)</Label>
                  <Input value={fields.fullNameAr} onChange={(e) => update('fullNameAr', e.target.value)} disabled={submitting} dir="rtl" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">QID No. *</Label>
                  <Input value={fields.qid} onChange={(e) => update('qid', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">QID Expiry Date</Label>
                  <Input type="date" value={fields.qidExpiry} onChange={(e) => update('qidExpiry', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Passport No.</Label>
                  <Input value={fields.passportNumber} onChange={(e) => update('passportNumber', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Passport Expiry Date</Label>
                  <Input type="date" value={fields.passportExpiry} onChange={(e) => update('passportExpiry', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Nationality</Label>
                  <Input value={fields.nationality} onChange={(e) => update('nationality', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Date of Birth</Label>
                  <Input type="date" value={fields.dob} onChange={(e) => update('dob', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Gender</Label>
                  <Select value={fields.gender} onValueChange={(v) => update('gender', v)} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Blood Type</Label>
                  <Select value={fields.bloodType} onValueChange={(v) => update('bloodType', v)} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Marital Status</Label>
                  <Select value={fields.maritalStatus} onValueChange={(v) => update('maritalStatus', v)} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {['Single', 'Married', 'Divorced', 'Widowed'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Phone Number</Label>
                  <Input value={fields.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Personal Email</Label>
                  <Input type="email" value={fields.personalEmail} onChange={(e) => update('personalEmail', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Residence Country</Label>
                  <Input value={fields.residenceCountry} onChange={(e) => update('residenceCountry', e.target.value)} disabled={submitting} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs">Address</Label>
                  <Input value={fields.address} onChange={(e) => update('address', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Languages</Label>
                  <Input placeholder="e.g. English, Arabic, Hindi" value={fields.languages} onChange={(e) => update('languages', e.target.value)} disabled={submitting} />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Employer</Label>
                <Input value={fields.employer} onChange={(e) => update('employer', e.target.value)} disabled={submitting} placeholder="Sponsoring/staffing company" />
                <div className="flex flex-wrap gap-2">
                  <FileInputButton label="Attach NOC letter" file={files.employerNocLetter} onSelect={(f) => setFile('employerNocLetter', f)} disabled={submitting} />
                  <FileInputButton label="Attach company establishment card" file={files.employerEstablishmentCard} onSelect={(f) => setFile('employerEstablishmentCard', f)} disabled={submitting} />
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <FileInputButton label="Upload passport-size photograph" file={files.photo} onSelect={(f) => setFile('photo', f)} disabled={submitting} />
                <FileInputButton label="Upload updated CV" file={files.cv} onSelect={(f) => setFile('cv', f)} disabled={submitting} />
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Emergency Contact</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs">Name</Label>
                    <Input value={fields.emergencyContactName} onChange={(e) => update('emergencyContactName', e.target.value)} disabled={submitting} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Relationship</Label>
                    <Input value={fields.emergencyContactRelationship} onChange={(e) => update('emergencyContactRelationship', e.target.value)} disabled={submitting} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Phone Number</Label>
                    <Input value={fields.emergencyContactPhone} onChange={(e) => update('emergencyContactPhone', e.target.value)} disabled={submitting} />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ============ 2. EDUCATION ============ */}
            <TabsContent value="education" className="mt-6 space-y-4">
              <p className="text-xs text-muted-foreground">Upload each qualification separately — don't merge them into one file. You can add up to {MAX_EDUCATION_ENTRIES} (e.g. Bachelor's, Master's, Doctorate).</p>
              {education.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Qualification {i + 1}</Label>
                    {education.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setEducation((prev) => prev.filter((_, idx) => idx !== i))} disabled={submitting}>
                        <Trash2 size={13} /> Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs">Qualification Level</Label>
                      <Select value={entry.qualificationLevel} onValueChange={(v) => setEducation((prev) => prev.map((e, idx) => idx === i ? { ...e, qualificationLevel: v } : e))} disabled={submitting}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>{QUALIFICATION_LEVELS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <FileInputButton label="Attach qualification file" file={entry.file} onSelect={(f) => setEducation((prev) => prev.map((e, idx) => idx === i ? { ...e, file: f } : e))} disabled={submitting} />
                    </div>
                  </div>
                </div>
              ))}
              {education.length < MAX_EDUCATION_ENTRIES && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setEducation((prev) => [...prev, { qualificationLevel: '', file: null }])} disabled={submitting}>
                  <Plus size={14} /> Add Qualification
                </Button>
              )}
            </TabsContent>

            {/* ============ 3. WORK EXPERIENCE ============ */}
            <TabsContent value="experience" className="mt-6 space-y-4">
              <p className="text-xs text-muted-foreground">Upload the official experience certificate only — not just what's written in your CV — and it must be translated into Arabic.</p>
              {experience.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Experience {i + 1}</Label>
                    {experience.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))} disabled={submitting}>
                        <Trash2 size={13} /> Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs">Company Name</Label>
                      <Input value={entry.companyName} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, companyName: e.target.value } : x))} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Country</Label>
                      <Input value={entry.country} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, country: e.target.value } : x))} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Job Title</Label>
                      <Input value={entry.jobTitle} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, jobTitle: e.target.value } : x))} disabled={submitting} />
                    </div>
                  </div>
                  <FileInputButton label="Attach experience certificate" file={entry.file} onSelect={(f) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, file: f } : x))} disabled={submitting} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setExperience((prev) => [...prev, { companyName: '', country: '', jobTitle: '', file: null }])} disabled={submitting}>
                <Plus size={14} /> Add Experience
              </Button>
            </TabsContent>

            {/* ============ 4. CERTIFICATES & TRAINING ============ */}
            <TabsContent value="certificates" className="mt-6 space-y-4">
              {certificates.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Certificate {i + 1}</Label>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setCertificates((prev) => prev.filter((_, idx) => idx !== i))} disabled={submitting}>
                      <Trash2 size={13} /> Remove
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Title (optional)" value={entry.title} onChange={(e) => setCertificates((prev) => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} disabled={submitting} />
                    <FileInputButton label="Attach file" file={entry.file} onSelect={(f) => setCertificates((prev) => prev.map((x, idx) => idx === i ? { ...x, file: f } : x))} disabled={submitting} />
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCertificates((prev) => [...prev, { title: '', file: null }])} disabled={submitting}>
                <Plus size={14} /> Add Certificate/Training
              </Button>
            </TabsContent>

            {/* ============ 5. BANK ACCOUNT ============ */}
            <TabsContent value="bank" className="mt-6 space-y-4">
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Bank Account Certificate</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <FileInputButton label="Attach bank certificate" file={files.bankCertificate} onSelect={handleBankCertificateSelect} disabled={submitting} />
                  <Button type="button" size="sm" disabled={!files.bankCertificate || scanningBank || submitting} onClick={handleScanBankCertificate} className="gap-1.5">
                    {scanningBank ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…</> : <><ScanLine size={14} /> Read Certificate</>}
                  </Button>
                </div>
                {bankScanApplied && (
                  <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                    <p className="text-foreground font-medium flex items-center gap-1.5"><ShieldCheck size={13} className="text-success" /> Details read — please double-check below, bank certificates vary by bank.</p>
                    {bankScanWarnings.length > 0 && <p className="text-warning">Couldn't read: {bankScanWarnings.join(', ')}</p>}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs">Beneficiary Name</Label>
                  <Input value={fields.bankBeneficiaryName} onChange={(e) => update('bankBeneficiaryName', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Bank Name</Label>
                  <Input value={fields.bankName} onChange={(e) => update('bankName', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Branch</Label>
                  <Input value={fields.bankBranch} onChange={(e) => update('bankBranch', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Account Number</Label>
                  <Input value={fields.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">IBAN Number</Label>
                  <Input value={fields.bankIban} onChange={(e) => update('bankIban', e.target.value)} disabled={submitting} />
                </div>
              </div>
            </TabsContent>

            {/* ============ 6. RELATIVES & DECLARATION ============ */}
            <TabsContent value="declaration" className="mt-6 space-y-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Do you have any relatives currently working at QBC?</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={fields.hasRelativesAtQbc ? 'default' : 'outline'} onClick={() => update('hasRelativesAtQbc', true)} disabled={submitting}>Yes</Button>
                  <Button type="button" size="sm" variant={!fields.hasRelativesAtQbc ? 'default' : 'outline'} onClick={() => update('hasRelativesAtQbc', false)} disabled={submitting}>No</Button>
                </div>
                {fields.hasRelativesAtQbc && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <Label className="mb-1.5 block text-xs">Relative's Full Name</Label>
                      <Input value={fields.relativeFullName} onChange={(e) => update('relativeFullName', e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Relationship (by degree)</Label>
                      <Input value={fields.relativeRelationship} onChange={(e) => update('relativeRelationship', e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Department at QBC</Label>
                      <Input value={fields.relativeDepartment} onChange={(e) => update('relativeDepartment', e.target.value)} disabled={submitting} />
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-border p-4">
                <Label className="text-sm font-medium mb-2 block">Document Declaration</Label>
                <Textarea readOnly rows={3} className="text-xs text-muted-foreground resize-none mb-3" value={
                  'I declare that the details provided by me are true and accurate and all documents submitted for QBC are authentic and true. I understand that any false information may result in the immediate rejection of my application or termination of my contract.'
                } />
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <Checkbox checked={fields.declarationAccepted} onCheckedChange={(v) => update('declarationAccepted', v === true)} disabled={submitting} className="mt-0.5" />
                  <span className="text-sm text-foreground">I have read and agree to the above declaration. *</span>
                </label>
              </div>

              <Button className="w-full gap-1.5" disabled={submitting || !fields.declarationAccepted} onClick={handleSubmit}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Profile'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
