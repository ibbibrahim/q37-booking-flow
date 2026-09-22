import { useRef, useState } from 'react';
import { Loader2, Plus, ScanLine, ShieldCheck, Trash2, UploadCloud, User, GraduationCap, Briefcase, Award, Landmark, Users2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { freelanceProfilePublicApi } from '../api/freelanceProfileApi';
import { QidScanningModal } from '../components/QidScanningModal';
import { HrLanguageProvider } from '../context/HrLanguageContext';
import qidSample from '@/assets/qid-holder.jpg';
import qbcLogoEn from '@/assets/QBC-light.png';
import qbcLogoAr from '@/assets/QBC-light-ar.png';
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
const MAX_CERTIFICATE_ENTRIES = 5;

const TAB_ORDER = ['personal', 'education', 'experience', 'certificates', 'bank', 'declaration'] as const;
type TabKey = (typeof TAB_ORDER)[number];

const QUALIFICATION_LEVELS = [
  'No Formal Education | بدون مؤهل',
  'غير مصنف / Unclassified',
  'Primary School | ابتدائي',
  'Middle School | إعدادي / متوسط',
  'High School | ثانوي',
  'Diploma | دبلوم',
  'Higher Diploma | دبلوم عالي',
  'Technical Diploma | دبلوم تقني',
  "Bachelor's Degree | بكالوريوس",
  "Master's Degree | ماجستير",
  'Doctorate (PhD) | دكتوراه',
];

const COUNTRY_CODES = ['+974', '+91', '+92', '+63', '+880', '+94', '+977', '+20', '+962', '+961', '+249', '+254', '+44', '+1', 'Other'];

const LANGUAGE_OPTIONS = ['English', 'Arabic', 'Hindi', 'Urdu', 'Filipino/Tagalog', 'Nepali', 'Bengali', 'Malayalam', 'Tamil', 'Sinhala', 'French', 'Indonesian', 'Other'];

// Only the fields the QID scan can actually populate get locked once
// scanned — a field the scan couldn't read stays editable so the required-
// field check never becomes an unfixable dead end.
type ScannableField = 'fullNameEn' | 'fullNameAr' | 'qid' | 'qidExpiry' | 'passportNumber' | 'passportExpiry' | 'nationality' | 'dob';
type BankScannableField = 'bankBeneficiaryName' | 'bankName' | 'bankBranch' | 'bankAccountNumber' | 'bankIban';

// Shared red-border style applied to a field once its tab has failed
// validation and that specific field is the (or a) reason why — this is
// what actually tells someone which field to fix, instead of a generic
// toast that doesn't say which of 25+ fields is empty.
const ERROR_CLASS = 'border-destructive ring-1 ring-destructive/40 focus-visible:ring-destructive';

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

const emptyFields: FreelanceProfileFormFields = {
  title: '', fullNameEn: '', fullNameAr: '', qid: '', qidExpiry: '', passportNumber: '', passportExpiry: '',
  nationality: '', dob: '', employer: '', gender: '', bloodType: '', maritalStatus: '', phoneCountryCode: '+974', phoneNumber: '',
  personalEmail: '', address: '', residenceCountry: '', languages: '',
  emergencyContactName: '', emergencyContactRelationship: '', emergencyContactPhone: '',
  hasRelativesAtQbc: null, relativeFullName: '', relativeRelationship: '', relativeDepartment: '',
  bankBeneficiaryName: '', bankName: '', bankBranch: '', bankAccountNumber: '', bankIban: '',
  declarationAccepted: false,
};

const emptyFiles: FreelanceProfileFormFiles = {
  qidImage: null, photo: null, cv: null, employerNocLetter: null, employerEstablishmentCard: null, bankCertificate: null,
};

function Req() {
  return <span className="text-destructive">*</span>;
}

function FileInputButton({
  label, file, onSelect, accept = 'image/jpeg,image/png,image/webp,application/pdf', disabled, error,
}: {
  label: string; file: File | null; onSelect: (file: File | null) => void; accept?: string; disabled?: boolean; error?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onSelect(e.target.files?.[0] ?? null)} />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => ref.current?.click()}
        disabled={disabled}
        className={cn('gap-1.5 max-w-full', error && !file && 'border-destructive text-destructive ring-1 ring-destructive/40')}
      >
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

  const [activeTab, setActiveTab] = useState<TabKey>('personal');
  const [showErrors, setShowErrors] = useState<Partial<Record<TabKey, boolean>>>({});
  const [fields, setFields] = useState<FreelanceProfileFormFields>(emptyFields);
  const [files, setFiles] = useState<FreelanceProfileFormFiles>(emptyFiles);
  const [lockedFields, setLockedFields] = useState<Partial<Record<ScannableField, boolean>>>({});
  const [language1, setLanguage1] = useState('');
  const [language2, setLanguage2] = useState('');
  const [language3, setLanguage3] = useState('');

  const [education, setEducation] = useState<FreelanceProfileEducationDraft[]>([{ qualificationLevel: '', major: '', attested: null, file: null }]);
  const [experience, setExperience] = useState<FreelanceProfileExperienceDraft[]>([{ companyName: '', country: '', jobTitle: '', file: null }]);
  const [certificates, setCertificates] = useState<FreelanceProfileCertificateDraft[]>([{ title: '', file: null }]);

  const [qidPreview, setQidPreview] = useState<string | null>(null);
  const [scanningQid, setScanningQid] = useState(false);
  const [qidScanResult, setQidScanResult] = useState<HrQidScanResult | null>(null);

  const [scanningBank, setScanningBank] = useState(false);
  const [bankScanApplied, setBankScanApplied] = useState(false);
  const [bankScanWarnings, setBankScanWarnings] = useState<string[]>([]);
  const [bankLockedFields, setBankLockedFields] = useState<Partial<Record<BankScannableField, boolean>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submittedCount, setSubmittedCount] = useState(0);

  const update = <K extends keyof FreelanceProfileFormFields>(key: K, value: FreelanceProfileFormFields[K]) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const setFile = <K extends keyof FreelanceProfileFormFiles>(key: K, file: File | null) =>
    setFiles((prev) => ({ ...prev, [key]: file }));

  const resetForm = () => {
    setFields(emptyFields);
    setFiles(emptyFiles);
    setLockedFields({});
    setShowErrors({});
    setLanguage1(''); setLanguage2(''); setLanguage3('');
    setEducation([{ qualificationLevel: '', major: '', attested: null, file: null }]);
    setExperience([{ companyName: '', country: '', jobTitle: '', file: null }]);
    setCertificates([{ title: '', file: null }]);
    setQidPreview((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    setQidScanResult(null);
    setBankScanApplied(false);
    setBankScanWarnings([]);
    setBankLockedFields({});
    setActiveTab('personal');
  };

  const handleQidFileSelect = (file: File | null) => {
    if (file && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      showToast('Only JPG, PNG, or WEBP images are allowed.', 'error');
      return;
    }
    setFile('qidImage', file);
    setQidScanResult(null);
    setLockedFields({});
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

      const locked: Partial<Record<ScannableField, boolean>> = {};
      setFields((prev) => {
        const next = { ...prev };
        if (result.fullNameEn) { next.fullNameEn = result.fullNameEn; locked.fullNameEn = true; }
        if (result.fullNameAr) { next.fullNameAr = result.fullNameAr; locked.fullNameAr = true; }
        if (result.qid) { next.qid = result.qid; locked.qid = true; }
        if (result.qidExpiry) { next.qidExpiry = toDateInputValue(result.qidExpiry); locked.qidExpiry = true; }
        if (result.passportNumber) { next.passportNumber = result.passportNumber; locked.passportNumber = true; }
        if (result.passportExpiry) { next.passportExpiry = toDateInputValue(result.passportExpiry); locked.passportExpiry = true; }
        if (result.nationality) { next.nationality = result.nationality; locked.nationality = true; }
        if (result.dob) { next.dob = toDateInputValue(result.dob); locked.dob = true; }
        if (result.employer) next.employer = result.employer;
        return next;
      });
      setLockedFields(locked);
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
    setBankLockedFields({});
  };

  const handleScanBankCertificate = async () => {
    if (!files.bankCertificate) return;
    setScanningBank(true);
    try {
      const result = await freelanceProfilePublicApi.scanBankCertificate(files.bankCertificate);

      const locked: Partial<Record<BankScannableField, boolean>> = {};
      setFields((prev) => {
        const next = { ...prev };
        if (result.beneficiaryName) { next.bankBeneficiaryName = result.beneficiaryName; locked.bankBeneficiaryName = true; }
        if (result.bankName) { next.bankName = result.bankName; locked.bankName = true; }
        if (result.branch) { next.bankBranch = result.branch; locked.bankBranch = true; }
        if (result.accountNumber) { next.bankAccountNumber = result.accountNumber; locked.bankAccountNumber = true; }
        if (result.iban) { next.bankIban = result.iban; locked.bankIban = true; }
        return next;
      });
      setBankLockedFields(locked);
      setBankScanApplied(true);
      setBankScanWarnings(result.warnings);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to scan bank certificate.'), 'error');
    } finally {
      setScanningBank(false);
    }
  };

  // ---- Per-tab completeness (drives tab-gating, final submit, AND which
  // fields get a red border once shown) ----

  const personalMissing = {
    title: !fields.title,
    fullNameEn: !fields.fullNameEn.trim(),
    fullNameAr: !fields.fullNameAr.trim(),
    qidImage: !files.qidImage,
    qid: !fields.qid.trim(),
    qidExpiry: !fields.qidExpiry,
    passportNumber: !fields.passportNumber.trim(),
    passportExpiry: !fields.passportExpiry,
    nationality: !fields.nationality.trim(),
    dob: !fields.dob,
    gender: !fields.gender,
    bloodType: !fields.bloodType,
    maritalStatus: !fields.maritalStatus,
    phoneNumber: !fields.phoneNumber.trim(),
    personalEmail: !fields.personalEmail.trim(),
    address: !fields.address.trim(),
    residenceCountry: !fields.residenceCountry.trim(),
    language1: !language1,
    photo: !files.photo,
    cv: !files.cv,
    employer: !fields.employer.trim(),
    employerNocLetter: !files.employerNocLetter,
    employerEstablishmentCard: !files.employerEstablishmentCard,
    emergencyContactName: !fields.emergencyContactName.trim(),
    emergencyContactRelationship: !fields.emergencyContactRelationship.trim(),
    emergencyContactPhone: !fields.emergencyContactPhone.trim(),
  };
  const isPersonalComplete = () => !Object.values(personalMissing).some(Boolean);

  const educationMissing = (e: FreelanceProfileEducationDraft) => ({
    qualificationLevel: !e.qualificationLevel, major: !e.major.trim(), attested: e.attested === null, file: !e.file,
  });
  const isEducationComplete = () =>
    education.length > 0 && education.every((e) => !Object.values(educationMissing(e)).some(Boolean));

  const experienceMissing = (e: FreelanceProfileExperienceDraft) => ({
    companyName: !e.companyName.trim(), country: !e.country.trim(), jobTitle: !e.jobTitle.trim(), file: !e.file,
  });
  const isExperienceComplete = () =>
    experience.length > 0 && experience.every((e) => !Object.values(experienceMissing(e)).some(Boolean));

  const isCertificatesComplete = () =>
    certificates.length > 0 && certificates.every((c) => c.file);

  const bankMissing = {
    bankBeneficiaryName: !fields.bankBeneficiaryName.trim(),
    bankName: !fields.bankName.trim(),
    bankBranch: !fields.bankBranch.trim(),
    bankAccountNumber: !fields.bankAccountNumber.trim(),
    bankIban: !fields.bankIban.trim(),
    bankCertificate: !files.bankCertificate,
  };
  const isBankComplete = () => !Object.values(bankMissing).some(Boolean);

  const isDeclarationComplete = () => {
    if (fields.hasRelativesAtQbc === null) return false;
    if (fields.hasRelativesAtQbc && !(fields.relativeFullName.trim() && fields.relativeRelationship.trim() && fields.relativeDepartment.trim())) return false;
    return fields.declarationAccepted;
  };

  const TAB_VALIDATORS: Record<TabKey, () => boolean> = {
    personal: isPersonalComplete,
    education: isEducationComplete,
    experience: isExperienceComplete,
    certificates: isCertificatesComplete,
    bank: isBankComplete,
    declaration: isDeclarationComplete,
  };

  const TAB_LABELS: Record<TabKey, string> = {
    personal: 'Personal Info', education: 'Education', experience: 'Experience',
    certificates: 'Certificates', bank: 'Bank Account', declaration: 'Relatives & Declaration',
  };

  const err = (tab: TabKey, missing: boolean) => (showErrors[tab] && missing ? ERROR_CLASS : undefined);

  // Wizard-style gating: moving to a LATER tab requires the tab you're
  // leaving to be fully complete; moving backward to review is always fine.
  const handleTabChange = (next: string) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = TAB_ORDER.indexOf(next as TabKey);
    if (nextIndex > currentIndex && !TAB_VALIDATORS[activeTab]()) {
      setShowErrors((prev) => ({ ...prev, [activeTab]: true }));
      showToast(`Please complete every highlighted field in "${TAB_LABELS[activeTab]}" before continuing.`, 'error');
      return;
    }
    setActiveTab(next as TabKey);
  };

  const handleSubmit = async () => {
    const firstIncomplete = TAB_ORDER.find((t) => !TAB_VALIDATORS[t]());
    if (firstIncomplete) {
      setShowErrors((prev) => ({ ...prev, [firstIncomplete]: true }));
      showToast(`Please complete every highlighted field in "${TAB_LABELS[firstIncomplete]}" first.`, 'error');
      setActiveTab(firstIncomplete);
      return;
    }

    setSubmitting(true);
    try {
      const languages = [language1, language2, language3].filter(Boolean).join(', ');
      await freelanceProfilePublicApi.submit({ ...fields, languages }, files, education, experience, certificates);
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
    <div className="h-screen overflow-y-auto bg-muted/30 py-8 px-4">
      <QidScanningModal open={scanningQid} imageUrl={qidPreview} />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
          <img src={qbcLogoEn} alt="QBC" className="h-10 sm:h-12 w-auto object-contain" />
          <img src={qbcLogoAr} alt="كيوبي سي" className="h-10 sm:h-12 w-auto object-contain" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">Freelancer Profile Form</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete each section fully before moving to the next — every field is required, unless marked optional.
            {submittedCount > 0 && <span className="ml-1 font-medium text-foreground">{submittedCount} submitted this session.</span>}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
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
              <div className="flex flex-wrap gap-3">
                <FileInputButton label="Upload updated CV *" file={files.cv} onSelect={(f) => setFile('cv', f)} disabled={submitting} error={showErrors.personal && personalMissing.cv} />
                <FileInputButton label="Upload passport-size photograph *" file={files.photo} onSelect={(f) => setFile('photo', f)} disabled={submitting} error={showErrors.personal && personalMissing.photo} />
              </div>

              <div className={cn('rounded-lg border border-dashed border-border p-4', showErrors.personal && personalMissing.qidImage && 'border-destructive')}>
                <div className="flex items-center gap-2 mb-2">
                  <ScanLine size={16} className="text-destructive" />
                  <Label className="text-sm font-medium text-destructive">Scan your QID (front &amp; back, one photo, as exported by Metrash) <Req /></Label>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <img src={qidPreview ?? qidSample} alt="QID preview" className="shrink-0 w-28 rounded-md border border-border object-contain bg-black" />
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileInputButton label="Choose QID image" file={files.qidImage} onSelect={handleQidFileSelect} accept="image/jpeg,image/png,image/webp" disabled={submitting} error={showErrors.personal && personalMissing.qidImage} />
                      <Button type="button" size="sm" disabled={!files.qidImage || scanningQid || submitting} onClick={handleScanQid} className="gap-1.5">
                        {scanningQid ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning…</> : <><ScanLine size={14} /> Scan QID</>}
                      </Button>
                    </div>
                    {qidScanResult && (
                      <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                        <p className="text-foreground font-medium flex items-center gap-1.5"><ShieldCheck size={13} className="text-success" /> Details scanned and locked below.</p>
                        {qidScanResult.warnings.length > 0 && <p className="text-warning">Couldn't read (fill manually): {qidScanResult.warnings.join(', ')}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs">Title <Req /></Label>
                  <Select value={fields.title} onValueChange={(v) => update('title', v)} disabled={submitting}>
                    <SelectTrigger className={err('personal', personalMissing.title)}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Eng.'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs">Full Name (English) <Req /></Label>
                  <Input className={err('personal', personalMissing.fullNameEn)} value={fields.fullNameEn} onChange={(e) => update('fullNameEn', e.target.value)} disabled={submitting || lockedFields.fullNameEn} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Full Name (Arabic) <Req /></Label>
                  <Input className={err('personal', personalMissing.fullNameAr)} value={fields.fullNameAr} onChange={(e) => update('fullNameAr', e.target.value)} disabled={submitting || lockedFields.fullNameAr} dir="rtl" />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">QID No. <Req /></Label>
                  <Input className={err('personal', personalMissing.qid)} value={fields.qid} onChange={(e) => update('qid', e.target.value)} disabled={submitting || lockedFields.qid} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">QID Expiry Date <Req /></Label>
                  <Input className={err('personal', personalMissing.qidExpiry)} type="date" value={fields.qidExpiry} onChange={(e) => update('qidExpiry', e.target.value)} disabled={submitting || lockedFields.qidExpiry} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Passport No. <Req /></Label>
                  <Input className={err('personal', personalMissing.passportNumber)} value={fields.passportNumber} onChange={(e) => update('passportNumber', e.target.value)} disabled={submitting || lockedFields.passportNumber} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Passport Expiry Date <Req /></Label>
                  <Input className={err('personal', personalMissing.passportExpiry)} type="date" value={fields.passportExpiry} onChange={(e) => update('passportExpiry', e.target.value)} disabled={submitting || lockedFields.passportExpiry} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Nationality <Req /></Label>
                  <Input className={err('personal', personalMissing.nationality)} value={fields.nationality} onChange={(e) => update('nationality', e.target.value)} disabled={submitting || lockedFields.nationality} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Date of Birth <Req /></Label>
                  <Input className={err('personal', personalMissing.dob)} type="date" value={fields.dob} onChange={(e) => update('dob', e.target.value)} disabled={submitting || lockedFields.dob} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Gender <Req /></Label>
                  <Select value={fields.gender} onValueChange={(v) => update('gender', v)} disabled={submitting}>
                    <SelectTrigger className={err('personal', personalMissing.gender)}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Blood Type <Req /></Label>
                  <Select value={fields.bloodType} onValueChange={(v) => update('bloodType', v)} disabled={submitting}>
                    <SelectTrigger className={err('personal', personalMissing.bloodType)}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Marital Status <Req /></Label>
                  <Select value={fields.maritalStatus} onValueChange={(v) => update('maritalStatus', v)} disabled={submitting}>
                    <SelectTrigger className={err('personal', personalMissing.maritalStatus)}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{['Single', 'Married', 'Divorced', 'Widowed'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Phone Number <Req /></Label>
                  <div className="flex gap-1.5">
                    <Select value={fields.phoneCountryCode} onValueChange={(v) => update('phoneCountryCode', v)} disabled={submitting}>
                      <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                      <SelectContent>{COUNTRY_CODES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className={err('personal', personalMissing.phoneNumber)} value={fields.phoneNumber} onChange={(e) => update('phoneNumber', e.target.value)} disabled={submitting} />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Personal Email <Req /></Label>
                  <Input className={err('personal', personalMissing.personalEmail)} type="email" value={fields.personalEmail} onChange={(e) => update('personalEmail', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Residence Country <Req /></Label>
                  <Input className={err('personal', personalMissing.residenceCountry)} value={fields.residenceCountry} onChange={(e) => update('residenceCountry', e.target.value)} disabled={submitting} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block text-xs">Address <Req /></Label>
                  <Input className={err('personal', personalMissing.address)} value={fields.address} onChange={(e) => update('address', e.target.value)} disabled={submitting} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Language 1 <Req /></Label>
                  <Select value={language1} onValueChange={setLanguage1} disabled={submitting}>
                    <SelectTrigger className={err('personal', personalMissing.language1)}><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Language 2 (optional)</Label>
                  <Select value={language2} onValueChange={setLanguage2} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Language 3 (optional)</Label>
                  <Select value={language3} onValueChange={setLanguage3} disabled={submitting}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{LANGUAGE_OPTIONS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Employer <Req /></Label>
                <Input className={err('personal', personalMissing.employer)} value={fields.employer} onChange={(e) => update('employer', e.target.value)} disabled={submitting} placeholder="Sponsoring/staffing company" />
                <div className="flex flex-wrap gap-2">
                  <FileInputButton label="Attach NOC letter *" file={files.employerNocLetter} onSelect={(f) => setFile('employerNocLetter', f)} disabled={submitting} error={showErrors.personal && personalMissing.employerNocLetter} />
                  <FileInputButton label="Attach company establishment card *" file={files.employerEstablishmentCard} onSelect={(f) => setFile('employerEstablishmentCard', f)} disabled={submitting} error={showErrors.personal && personalMissing.employerEstablishmentCard} />
                </div>
              </div>

              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Emergency Contact <Req /></Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="mb-1.5 block text-xs">Name</Label>
                    <Input className={err('personal', personalMissing.emergencyContactName)} value={fields.emergencyContactName} onChange={(e) => update('emergencyContactName', e.target.value)} disabled={submitting} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Relationship</Label>
                    <Input className={err('personal', personalMissing.emergencyContactRelationship)} value={fields.emergencyContactRelationship} onChange={(e) => update('emergencyContactRelationship', e.target.value)} disabled={submitting} />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Phone Number</Label>
                    <Input className={err('personal', personalMissing.emergencyContactPhone)} value={fields.emergencyContactPhone} onChange={(e) => update('emergencyContactPhone', e.target.value)} disabled={submitting} />
                  </div>
                </div>
              </div>

              {showErrors.personal && !isPersonalComplete() && (
                <p className="text-sm text-destructive font-medium">Please fill in every field outlined in red above.</p>
              )}

              <Button className="w-full gap-1.5" onClick={() => handleTabChange('education')}>Next: Education</Button>
            </TabsContent>

            {/* ============ 2. EDUCATION ============ */}
            <TabsContent value="education" className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-destructive">Upload each qualification separately — don't merge them into one file. You can add up to {MAX_EDUCATION_ENTRIES} (e.g. Bachelor's, Master's, Doctorate).</p>
              {education.map((entry, i) => {
                const missing = educationMissing(entry);
                return (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Qualification {i + 1} <Req /></Label>
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
                          <SelectTrigger className={err('education', missing.qualificationLevel)}><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{QUALIFICATION_LEVELS.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">Major</Label>
                        <Input className={err('education', missing.major)} value={entry.major} onChange={(e) => setEducation((prev) => prev.map((x, idx) => idx === i ? { ...x, major: e.target.value } : x))} disabled={submitting} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <Label className={cn('mb-1.5 block text-xs', err('education', missing.attested) && 'text-destructive')}>Attested?</Label>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant={entry.attested === true ? 'default' : 'outline'} onClick={() => setEducation((prev) => prev.map((x, idx) => idx === i ? { ...x, attested: true } : x))} disabled={submitting}>Yes</Button>
                          <Button type="button" size="sm" variant={entry.attested === false ? 'default' : 'outline'} onClick={() => setEducation((prev) => prev.map((x, idx) => idx === i ? { ...x, attested: false } : x))} disabled={submitting}>No</Button>
                        </div>
                      </div>
                      <div className="flex-1 min-w-[180px]">
                        <Label className="mb-1.5 block text-xs">Attach qualification file</Label>
                        <FileInputButton label="Attach file" file={entry.file} onSelect={(f) => setEducation((prev) => prev.map((e, idx) => idx === i ? { ...e, file: f } : e))} disabled={submitting} error={showErrors.education && missing.file} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {education.length < MAX_EDUCATION_ENTRIES && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setEducation((prev) => [...prev, { qualificationLevel: '', major: '', attested: null, file: null }])} disabled={submitting}>
                  <Plus size={14} /> Add Qualification
                </Button>
              )}
              {showErrors.education && !isEducationComplete() && (
                <p className="text-sm text-destructive font-medium">Please fill in every field outlined in red above.</p>
              )}
              <Button className="w-full gap-1.5" onClick={() => handleTabChange('experience')}>Next: Experience</Button>
            </TabsContent>

            {/* ============ 3. WORK EXPERIENCE ============ */}
            <TabsContent value="experience" className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-destructive">Please upload your official experience certificate issued by the employer — a summary from your CV is not accepted — and it must include an Arabic translation.</p>
              {experience.map((entry, i) => {
                const missing = experienceMissing(entry);
                return (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Experience {i + 1} <Req /></Label>
                      {experience.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setExperience((prev) => prev.filter((_, idx) => idx !== i))} disabled={submitting}>
                          <Trash2 size={13} /> Remove
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="mb-1.5 block text-xs">Company Name</Label>
                        <Input className={err('experience', missing.companyName)} value={entry.companyName} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, companyName: e.target.value } : x))} disabled={submitting} />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">Country</Label>
                        <Input className={err('experience', missing.country)} value={entry.country} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, country: e.target.value } : x))} disabled={submitting} />
                      </div>
                      <div>
                        <Label className="mb-1.5 block text-xs">Job Title</Label>
                        <Input className={err('experience', missing.jobTitle)} value={entry.jobTitle} onChange={(e) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, jobTitle: e.target.value } : x))} disabled={submitting} />
                      </div>
                    </div>
                    <FileInputButton label="Attach experience certificate" file={entry.file} onSelect={(f) => setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, file: f } : x))} disabled={submitting} error={showErrors.experience && missing.file} />
                  </div>
                );
              })}
              <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setExperience((prev) => [...prev, { companyName: '', country: '', jobTitle: '', file: null }])} disabled={submitting}>
                <Plus size={14} /> Add Experience
              </Button>
              {showErrors.experience && !isExperienceComplete() && (
                <p className="text-sm text-destructive font-medium">Please fill in every field outlined in red above.</p>
              )}
              <Button className="w-full gap-1.5" onClick={() => handleTabChange('certificates')}>Next: Certificates</Button>
            </TabsContent>

            {/* ============ 4. CERTIFICATES & TRAINING ============ */}
            <TabsContent value="certificates" className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-destructive">You can add up to {MAX_CERTIFICATE_ENTRIES} certificates or training records.</p>
              {certificates.map((entry, i) => (
                <div key={i} className="rounded-lg border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Certificate {i + 1} <Req /></Label>
                    {certificates.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => setCertificates((prev) => prev.filter((_, idx) => idx !== i))} disabled={submitting}>
                        <Trash2 size={13} /> Remove
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input placeholder="Title (optional)" value={entry.title} onChange={(e) => setCertificates((prev) => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} disabled={submitting} />
                    <FileInputButton label="Attach file" file={entry.file} onSelect={(f) => setCertificates((prev) => prev.map((x, idx) => idx === i ? { ...x, file: f } : x))} disabled={submitting} error={showErrors.certificates && !entry.file} />
                  </div>
                </div>
              ))}
              {certificates.length < MAX_CERTIFICATE_ENTRIES && (
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCertificates((prev) => [...prev, { title: '', file: null }])} disabled={submitting}>
                  <Plus size={14} /> Add Certificate/Training
                </Button>
              )}
              {showErrors.certificates && !isCertificatesComplete() && (
                <p className="text-sm text-destructive font-medium">Please attach a file for every certificate above.</p>
              )}
              <Button className="w-full gap-1.5" onClick={() => handleTabChange('bank')}>Next: Bank Account</Button>
            </TabsContent>

            {/* ============ 5. BANK ACCOUNT ============ */}
            <TabsContent value="bank" className="mt-6 space-y-4">
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Bank Account Certificate <Req /></Label>
                <div className="flex flex-wrap items-center gap-2">
                  <FileInputButton label="Attach bank certificate" file={files.bankCertificate} onSelect={handleBankCertificateSelect} disabled={submitting} error={showErrors.bank && bankMissing.bankCertificate} />
                  <Button type="button" size="sm" disabled={!files.bankCertificate || scanningBank || submitting} onClick={handleScanBankCertificate} className="gap-1.5">
                    {scanningBank ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading…</> : <><ScanLine size={14} /> Read Certificate</>}
                  </Button>
                </div>
                {bankScanApplied && (
                  <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                    <p className="text-foreground font-medium flex items-center gap-1.5"><ShieldCheck size={13} className="text-success" /> Fields the scan could read are filled in and locked below — fields it couldn't read stay open for you to type in.</p>
                    {bankScanWarnings.length > 0 && <p className="text-warning">Couldn't read: {bankScanWarnings.join(', ')}</p>}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Locked fields came from the certificate scan. Bank certificates vary by bank, so double-check them — if one is wrong, click Edit to fix it.</p>
                {Object.values(bankLockedFields).some(Boolean) && (
                  <Button type="button" variant="outline" size="sm" className="shrink-0 ml-3" onClick={() => setBankLockedFields({})} disabled={submitting}>
                    Edit
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block text-xs">Beneficiary Name <Req /></Label>
                  <Input className={err('bank', bankMissing.bankBeneficiaryName)} value={fields.bankBeneficiaryName} onChange={(e) => update('bankBeneficiaryName', e.target.value)} disabled={submitting || bankLockedFields.bankBeneficiaryName} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Bank Name <Req /></Label>
                  <Input className={err('bank', bankMissing.bankName)} value={fields.bankName} onChange={(e) => update('bankName', e.target.value)} disabled={submitting || bankLockedFields.bankName} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Branch <Req /></Label>
                  <Input className={err('bank', bankMissing.bankBranch)} value={fields.bankBranch} onChange={(e) => update('bankBranch', e.target.value)} disabled={submitting || bankLockedFields.bankBranch} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">Account Number <Req /></Label>
                  <Input className={err('bank', bankMissing.bankAccountNumber)} value={fields.bankAccountNumber} onChange={(e) => update('bankAccountNumber', e.target.value)} disabled={submitting || bankLockedFields.bankAccountNumber} />
                </div>
                <div>
                  <Label className="mb-1.5 block text-xs">IBAN Number <Req /></Label>
                  <Input className={err('bank', bankMissing.bankIban)} value={fields.bankIban} onChange={(e) => update('bankIban', e.target.value)} disabled={submitting || bankLockedFields.bankIban} />
                </div>
              </div>
              {showErrors.bank && !isBankComplete() && (
                <p className="text-sm text-destructive font-medium">Please fill in every field outlined in red above.</p>
              )}
              <Button className="w-full gap-1.5" onClick={() => handleTabChange('declaration')}>Next: Relatives &amp; Declaration</Button>
            </TabsContent>

            {/* ============ 6. RELATIVES & DECLARATION ============ */}
            <TabsContent value="declaration" className="mt-6 space-y-6">
              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-medium">Do you have any relatives currently working at QBC? <Req /></Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant={fields.hasRelativesAtQbc === true ? 'default' : 'outline'} onClick={() => update('hasRelativesAtQbc', true)} disabled={submitting}>Yes</Button>
                  <Button type="button" size="sm" variant={fields.hasRelativesAtQbc === false ? 'default' : 'outline'} onClick={() => update('hasRelativesAtQbc', false)} disabled={submitting}>No</Button>
                </div>
                {fields.hasRelativesAtQbc && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div>
                      <Label className="mb-1.5 block text-xs">Relative's Full Name</Label>
                      <Input className={err('declaration', !fields.relativeFullName.trim())} value={fields.relativeFullName} onChange={(e) => update('relativeFullName', e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Relationship (by degree)</Label>
                      <Input className={err('declaration', !fields.relativeRelationship.trim())} value={fields.relativeRelationship} onChange={(e) => update('relativeRelationship', e.target.value)} disabled={submitting} />
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs">Department at QBC</Label>
                      <Input className={err('declaration', !fields.relativeDepartment.trim())} value={fields.relativeDepartment} onChange={(e) => update('relativeDepartment', e.target.value)} disabled={submitting} />
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
                  <Checkbox checked={fields.declarationAccepted} onCheckedChange={(v) => update('declarationAccepted', v === true)} disabled={submitting} className={cn('mt-0.5', showErrors.declaration && !fields.declarationAccepted && 'border-destructive')} />
                  <span className="text-sm text-foreground">I have read and agree to the above declaration. <Req /></span>
                </label>
              </div>

              {showErrors.declaration && !isDeclarationComplete() && (
                <p className="text-sm text-destructive font-medium">Please answer the relatives question and accept the declaration above.</p>
              )}

              <Button className="w-full gap-1.5" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : 'Submit Profile'}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
