import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, UserCircle2, User, Briefcase, CreditCard, Phone, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { nationalities } from '../data/nameData';
import qidSample from '@/assets/qid-holder.jpg';
import { hrApi } from '../api/hrApi';
import { QidScanningModal } from '../components/QidScanningModal';
import { QidPhotoCropModal } from '../components/QidPhotoCropModal';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import type { CreateHrEmployeeDto, HrContractType, HrEmployee, HrQidScanResult } from '../types/hrApi';

const MAX_PROFILE_PICTURE_BYTES = 5 * 1024 * 1024;
const ALLOWED_PROFILE_PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_QID_SCAN_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// The QID prints the country name ("PAKISTAN"), while our nationality list uses
// demonyms ("Pakistani") — this heuristic bridges the common cases (most demonyms
// share a prefix with the country name). Falls back to the raw scanned value when
// nothing matches, which the Select below already renders safely.
function matchNationality(rawCountryName: string): string {
  const needle = rawCountryName.trim().toLowerCase();
  if (!needle) return rawCountryName;
  const match = nationalities.find((n) => {
    const name = n.name.toLowerCase();
    return name.startsWith(needle) || needle.startsWith(name);
  });
  return match ? match.name : rawCountryName;
}

function fileExtension(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i) : '';
}

function renameFile(file: File, newName: string): File {
  return new File([file], newName, { type: file.type });
}

function urlToContractType(seg: string | undefined): HrContractType {
  return seg === 'freelance' ? 'Freelance' : 'Permanent';
}

function emptyForm(contractType: HrContractType, firstDepartmentId: number): CreateHrEmployeeDto {
  return {
    contractType,
    qmcJobNo: '',
    mawaredJobNo: '',
    associateJobNo: '',
    fullNameEn: '',
    fullNameAr: '',
    jobTitleEn: '',
    jobTitleAr: '',
    departmentId: firstDepartmentId,
    sectionId: null,
    jobGroup: null,
    grade: '',
    joinDate: new Date().toISOString().slice(0, 10),
    employmentBasis: '',
    employer: '',
    gender: null,
    nationality: 'Qatari',
    dob: '',
    maritalStatus: null,
    educationLevel: '',
    fieldOfStudy: '',
    qid: '',
    qidExpiry: '',
    passportNumber: '',
    passportExpiry: '',
    mobileNumber: '',
    emergencyNumber: '',
    emailWork: '',
    emailPersonal: '',
    monthlyRate: 0,
    status: 'Active',
    statusNote: '',
    reward: '',
  };
}

function toDateInputValue(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : '';
}

function toForm(employee: HrEmployee): CreateHrEmployeeDto {
  return {
    contractType: employee.contractType,
    qmcJobNo: employee.qmcJobNo ?? '',
    mawaredJobNo: employee.mawaredJobNo ?? '',
    associateJobNo: employee.associateJobNo ?? '',
    fullNameEn: employee.fullNameEn,
    fullNameAr: employee.fullNameAr,
    jobTitleEn: employee.jobTitleEn,
    jobTitleAr: employee.jobTitleAr,
    departmentId: employee.departmentId,
    sectionId: employee.sectionId,
    jobGroup: employee.jobGroup,
    grade: employee.grade ?? '',
    joinDate: toDateInputValue(employee.joinDate),
    employmentBasis: employee.employmentBasis ?? '',
    employer: employee.employer ?? '',
    gender: employee.gender,
    nationality: employee.nationality ?? '',
    dob: toDateInputValue(employee.dob),
    maritalStatus: employee.maritalStatus,
    educationLevel: employee.educationLevel ?? '',
    fieldOfStudy: employee.fieldOfStudy ?? '',
    qid: employee.qid,
    qidExpiry: toDateInputValue(employee.qidExpiry),
    passportNumber: employee.passportNumber ?? '',
    passportExpiry: toDateInputValue(employee.passportExpiry),
    mobileNumber: employee.mobileNumber ?? '',
    emergencyNumber: employee.emergencyNumber ?? '',
    emailWork: employee.emailWork ?? '',
    emailPersonal: employee.emailPersonal ?? '',
    monthlyRate: employee.monthlyRate ?? 0,
    status: employee.status,
    statusNote: employee.statusNote ?? '',
    reward: employee.reward ?? '',
  };
}

export function EmployeeFormPage() {
  const { contractType: urlContractType, id } = useParams<{ contractType: string; id?: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useHrLanguage();
  const { showToast } = useToast();

  const defaultContractType = urlToContractType(urlContractType);
  const isEdit = !!id;
  const employeeId = id ? Number(id) : null;
  const backRoute = `/hr/employees/${urlContractType}${isEdit ? `/${id}` : ''}`;

  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });
  const departments = departmentsQuery.data ?? [];

  const employeeQuery = useQuery({
    queryKey: ['hr-employee', employeeId],
    queryFn: () => hrApi.getEmployee(employeeId as number),
    enabled: isEdit && !!employeeId,
  });

  const [form, setForm] = useState<CreateHrEmployeeDto>(() => emptyForm(defaultContractType, 0));
  const [saving, setSaving] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [initialized, setInitialized] = useState(false);

  const [qidImageFile, setQidImageFile] = useState<File | null>(null);
  const [qidImagePreview, setQidImagePreview] = useState<string | null>(null);
  const qidImageInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<HrQidScanResult | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);

  useEffect(() => {
    if (initialized || departments.length === 0) return;
    if (isEdit) {
      if (employeeQuery.data) {
        setForm(toForm(employeeQuery.data));
        setInitialized(true);
      }
    } else {
      setForm(emptyForm(defaultContractType, departments[0]?.id ?? 0));
      setInitialized(true);
    }
  }, [initialized, departments, isEdit, employeeQuery.data, defaultContractType]);

  const handlePictureSelect = (file: File | null) => {
    if (!file) {
      setProfilePictureFile(null);
      setProfilePicturePreview(null);
      return;
    }
    if (!ALLOWED_PROFILE_PICTURE_TYPES.includes(file.type)) {
      showToast(t('fileTypeNotAllowed'), 'error');
      return;
    }
    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      showToast(t('fileTooLarge'), 'error');
      return;
    }
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
  };

  const isPermanent = form.contractType === 'Permanent';
  const update = <K extends keyof CreateHrEmployeeDto>(key: K, value: CreateHrEmployeeDto[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleQidFileSelect = (file: File | null) => {
    if (file && !ALLOWED_QID_SCAN_TYPES.includes(file.type)) {
      showToast(t('fileTypeNotAllowed'), 'error');
      return;
    }
    setQidImageFile(file);
    setScanResult(null);
    setQidImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const handleScanQid = async () => {
    if (!qidImageFile) return;
    setScanning(true);
    setScanResult(null);
    try {
      const result = await hrApi.scanQid(qidImageFile);
      setScanResult(result);

      if (result.qid) update('qid', result.qid);
      if (result.dob) update('dob', toDateInputValue(result.dob));
      if (result.qidExpiry) update('qidExpiry', toDateInputValue(result.qidExpiry));
      if (result.nationality) update('nationality', matchNationality(result.nationality));
      if (result.fullNameEn) update('fullNameEn', result.fullNameEn);
      if (result.fullNameAr) update('fullNameAr', result.fullNameAr);
      if (result.passportNumber) update('passportNumber', result.passportNumber);
      if (result.passportExpiry) update('passportExpiry', toDateInputValue(result.passportExpiry));
      if (result.employer && form.contractType === 'Freelance') update('employer', result.employer);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to scan QID.'), 'error');
    } finally {
      setScanning(false);
    }
  };

  const selectedDepartment = departments.find((d) => d.id === form.departmentId);
  const sections = selectedDepartment?.sections ?? [];

  const handleSubmit = async () => {
    if (!form.fullNameEn.trim() || !form.jobTitleEn.trim() || !form.qid.trim()) {
      showToast('Full name (EN), job title (EN), and QID are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: CreateHrEmployeeDto = {
        ...form,
        qmcJobNo: form.qmcJobNo || null,
        mawaredJobNo: form.mawaredJobNo || null,
        associateJobNo: form.associateJobNo || null,
        grade: form.grade || null,
        joinDate: form.joinDate || null,
        employmentBasis: form.employmentBasis || null,
        employer: isPermanent ? null : form.employer || null,
        dob: form.dob || null,
        educationLevel: form.educationLevel || null,
        fieldOfStudy: form.fieldOfStudy || null,
        qidExpiry: form.qidExpiry || null,
        passportNumber: form.passportNumber || null,
        passportExpiry: form.passportExpiry || null,
        mobileNumber: form.mobileNumber || null,
        emergencyNumber: form.emergencyNumber || null,
        emailWork: form.emailWork || null,
        emailPersonal: form.emailPersonal || null,
        statusNote: form.statusNote || null,
        reward: isPermanent ? null : form.reward || null,
        monthlyRate: isPermanent ? null : form.monthlyRate,
      };

      const saved = isEdit && employeeId
        ? await hrApi.updateEmployee(employeeId, payload)
        : await hrApi.createEmployee(payload);

      if (profilePictureFile) {
        await hrApi.uploadProfilePicture(saved.id, profilePictureFile);
      }
      if (qidImageFile) {
        await hrApi.uploadContractAttachment(saved.id, renameFile(qidImageFile, `QID${fileExtension(qidImageFile.name)}`));
      }

      // The detail page (and the list we came from) use the same query keys this
      // page fetched under — without invalidating, the global 60s staleTime means
      // they'd keep showing the pre-edit snapshot until a manual refresh.
      await queryClient.invalidateQueries({ queryKey: ['hr-employee', saved.id] });
      await queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      await queryClient.invalidateQueries({ queryKey: ['hr-employees-stats'] });

      showToast(isEdit ? 'Employee record updated.' : 'Employee added.', 'success');
      navigate(`/hr/employees/${urlContractType}/${saved.id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to save employee record.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if ((isEdit && employeeQuery.isLoading) || departmentsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative p-6">
      <QidScanningModal open={scanning} imageUrl={qidImagePreview} />

      {saving && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg border flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">{isEdit ? 'Saving Changes...' : 'Adding Employee...'}</h3>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-2 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button variant="outline" size="icon" onClick={() => navigate(backRoute)} disabled={saving} className="shrink-0">
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-card-foreground truncate">
              {isEdit ? t('editEmployee') : t('addEmployee')}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 truncate">
              {isEdit ? 'Update employee record details.' : 'Enter details to add a new employee record.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate(backRoute)} disabled={saving}>
            {t('cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> {isEdit ? 'Saving...' : 'Adding...'}
              </>
            ) : isEdit ? (
              t('save')
            ) : (
              t('add')
            )}
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border p-6">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic" className="gap-1.5"><User size={14} /> {t('basicInfo')}</TabsTrigger>
            <TabsTrigger value="employment" className="gap-1.5"><Briefcase size={14} /> {t('employment')}</TabsTrigger>
            <TabsTrigger value="identification" className="gap-1.5"><CreditCard size={14} /> {t('identification')}</TabsTrigger>
            <TabsTrigger value="contact" className="gap-1.5"><Phone size={14} /> {t('contact')}</TabsTrigger>
          </TabsList>

          {/* ---- Basic Info: picture, name, title, contract type, org placement ---- */}
          <TabsContent value="basic" className="mt-6 space-y-6">
            <div className="rounded-lg border border-dashed border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <ScanLine size={16} className="text-primary" />
                <Label className="text-sm font-medium">{t('scanQid')}</Label>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Shows the actual uploaded QID once one is picked; otherwise falls
                    back to the blank template (no real data) so HR knows what to
                    upload — one photo with the QID front and back stacked
                    top-to-bottom, as exported by the official Qatar ID app. */}
                <img
                  src={qidImagePreview ?? qidSample}
                  alt={t('scanQidHint')}
                  className="shrink-0 w-28 rounded-md border border-border object-contain bg-black"
                />

                <div className="flex-1 space-y-3 min-w-0">
                  <p className="text-xs text-muted-foreground">{t('scanQidHint')}</p>

                  <input
                    ref={qidImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleQidFileSelect(e.target.files?.[0] ?? null)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => qidImageInputRef.current?.click()} className="max-w-full">
                      <span className="truncate">{qidImageFile ? qidImageFile.name : t('chooseFile')}</span>
                    </Button>
                    <Button type="button" size="sm" disabled={!qidImageFile || scanning} onClick={handleScanQid} className="gap-1.5">
                      {scanning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('scanning')}
                        </>
                      ) : (
                        <>
                          <ScanLine size={14} /> {t('scanQidButton')}
                        </>
                      )}
                    </Button>
                  </div>

                  {scanResult && (
                    <div className="text-xs space-y-1 rounded-md bg-muted/50 p-2.5">
                      <p className="text-foreground font-medium">{t('scanApplied')}</p>
                      {scanResult.occupation && (
                        <p className="text-muted-foreground">{t('occupationFromCard')}: {scanResult.occupation}</p>
                      )}
                      {scanResult.warnings.length > 0 && (
                        <p className="text-warning">{t('scanWarning')}: {scanResult.warnings.join(', ')}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 rounded-full bg-muted overflow-hidden flex items-center justify-center border border-border">
                {profilePicturePreview || employeeQuery.data?.profilePictureUrl ? (
                  <img
                    src={profilePicturePreview ?? employeeQuery.data?.profilePictureUrl ?? ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle2 size={40} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <Label className="mb-1.5 block">{t('profilePicture')}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handlePictureSelect(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    {employeeQuery.data?.profilePictureUrl || profilePicturePreview ? t('changePicture') : t('uploadPicture')}
                  </Button>
                  {qidImagePreview && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setCropModalOpen(true)}>
                      {t('cropPhotoButton')}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {cropModalOpen && qidImagePreview && (
              <QidPhotoCropModal
                imageUrl={qidImagePreview}
                onCancel={() => setCropModalOpen(false)}
                onConfirm={(file) => {
                  setProfilePictureFile(file);
                  setProfilePicturePreview((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(file);
                  });
                  setCropModalOpen(false);
                }}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('fullName')} (EN)</Label>
                <Input value={form.fullNameEn} onChange={(e) => update('fullNameEn', e.target.value)} placeholder="e.g. Ahmed Al-Kuwari" />
              </div>
              <div className="space-y-1.5" dir="rtl">
                <Label>{t('fullName')} (AR)</Label>
                <Input value={form.fullNameAr} onChange={(e) => update('fullNameAr', e.target.value)} placeholder="مثال: أحمد الكواري" />
              </div>

              <div className="space-y-1.5">
                <Label>{t('jobTitle')} (EN)</Label>
                <Input value={form.jobTitleEn} onChange={(e) => update('jobTitleEn', e.target.value)} placeholder="e.g. Camera Operator" />
              </div>
              <div className="space-y-1.5" dir="rtl">
                <Label>{t('jobTitle')} (AR)</Label>
                <Input value={form.jobTitleAr} onChange={(e) => update('jobTitleAr', e.target.value)} placeholder="مثال: مصور" />
              </div>

              <div className="space-y-1.5">
                <Label>Contract Type</Label>
                <Select value={form.contractType} onValueChange={(v) => update('contractType', v as HrContractType)} disabled={isEdit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Permanent">Permanent</SelectItem>
                    <SelectItem value="Freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('department')}</Label>
                <Select value={String(form.departmentId)} onValueChange={(v) => update('departmentId', Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {bilingual(language, d.nameEn, d.nameAr)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sections.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>{t('section')}</Label>
                  <Select
                    value={form.sectionId ? String(form.sectionId) : 'none'}
                    onValueChange={(v) => update('sectionId', v === 'none' ? null : Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {bilingual(language, s.nameEn, s.nameAr)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ---- Employment: job numbers, grade/group, dates, status ---- */}
          <TabsContent value="employment" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isPermanent ? (
                <>
                  <div className="space-y-1.5">
                    <Label>{t('jobNumberQmc')}</Label>
                    <Input value={form.qmcJobNo ?? ''} onChange={(e) => update('qmcJobNo', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('jobNumberMawared')}</Label>
                    <Input value={form.mawaredJobNo ?? ''} onChange={(e) => update('mawaredJobNo', e.target.value)} />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t('jobGroup')}</Label>
                    <Select value={form.jobGroup ?? ''} onValueChange={(v) => update('jobGroup', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Specialized Positions">Specialized Positions</SelectItem>
                        <SelectItem value="Technical and Clerical Positions">Technical and Clerical Positions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('grade')}</Label>
                    <Input value={form.grade ?? ''} onChange={(e) => update('grade', e.target.value)} placeholder="e.g. 05" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>{t('jobNumberAssociate')}</Label>
                    <Input value={form.associateJobNo ?? ''} onChange={(e) => update('associateJobNo', e.target.value)} placeholder="e.g. 90191" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('monthlyRate')}</Label>
                    <Input type="number" value={form.monthlyRate ?? 0} onChange={(e) => update('monthlyRate', Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>{t('employer')}</Label>
                    <Input value={form.employer ?? ''} onChange={(e) => update('employer', e.target.value)} placeholder="e.g. Self-employed, or a staffing company" />
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <Label>{t('joinDate')}</Label>
                <Input type="date" value={form.joinDate ?? ''} onChange={(e) => update('joinDate', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t('status')}</Label>
                <Select value={form.status} onValueChange={(v) => update('status', v as CreateHrEmployeeDto['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="External Secondment">External Secondment</SelectItem>
                    <SelectItem value="Retired">Retired</SelectItem>
                    <SelectItem value="End of Service">End of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('statusNote')}</Label>
                <Input value={form.statusNote ?? ''} onChange={(e) => update('statusNote', e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </TabsContent>

          {/* ---- Identification: personal details + ID documents ---- */}
          <TabsContent value="identification" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('dob')}</Label>
                <Input type="date" value={form.dob ?? ''} onChange={(e) => update('dob', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('gender')}</Label>
                <Select value={form.gender ?? ''} onValueChange={(v) => update('gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">{t('male')}</SelectItem>
                    <SelectItem value="Female">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('maritalStatus')}</Label>
                <Select value={form.maritalStatus ?? ''} onValueChange={(v) => update('maritalStatus', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Single">{t('single')}</SelectItem>
                    <SelectItem value="Married">{t('married')}</SelectItem>
                    <SelectItem value="Divorced">{t('divorced')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('nationality')}</Label>
                <Select value={form.nationality ?? ''} onValueChange={(v) => update('nationality', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* If the stored value isn't in our known list (data drift), show it
                        anyway so the dropdown never silently renders blank. */}
                    {form.nationality && !nationalities.some((n) => n.name === form.nationality) && (
                      <SelectItem value={form.nationality}>{form.nationality}</SelectItem>
                    )}
                    {nationalities.map((n) => (
                      <SelectItem key={n.name} value={n.name}>
                        {n.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>{t('educationLevel')}</Label>
                <Input value={form.educationLevel ?? ''} onChange={(e) => update('educationLevel', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('fieldOfStudy')}</Label>
                <Input value={form.fieldOfStudy ?? ''} onChange={(e) => update('fieldOfStudy', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t('qid')}</Label>
                <Input value={form.qid} onChange={(e) => update('qid', e.target.value)} placeholder="28712345678" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('qidExpiry')}</Label>
                <Input type="date" value={form.qidExpiry ?? ''} onChange={(e) => update('qidExpiry', e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t('passportNumber')}</Label>
                <Input value={form.passportNumber ?? ''} onChange={(e) => update('passportNumber', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('passportExpiry')}</Label>
                <Input type="date" value={form.passportExpiry ?? ''} onChange={(e) => update('passportExpiry', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* ---- Contact ---- */}
          <TabsContent value="contact" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('mobileNumber')}</Label>
                <Input value={form.mobileNumber ?? ''} onChange={(e) => update('mobileNumber', e.target.value)} placeholder="+974 5512 3456" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emergencyNumber')}</Label>
                <Input value={form.emergencyNumber ?? ''} onChange={(e) => update('emergencyNumber', e.target.value)} placeholder="+974 5599 8877" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailWork')}</Label>
                <Input type="email" value={form.emailWork ?? ''} onChange={(e) => update('emailWork', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('emailPersonal')}</Label>
                <Input type="email" value={form.emailPersonal ?? ''} onChange={(e) => update('emailPersonal', e.target.value)} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
