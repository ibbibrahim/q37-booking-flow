import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Pencil, Phone, CreditCard, User, History,
  FileText, Upload, Trash2, Download, Eye, Briefcase,
  Home, Landmark, Users2, ShieldCheck,
  GraduationCap, Award, UploadCloud, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { DetailSection, DetailFieldGrid, DetailField } from '../components/DetailSection';
import { EmployeeHistoryTimeline } from '../components/EmployeeHistoryTimeline';
import { EmployeeAvatar } from '../components/EmployeeAvatar';
import { hrApi } from '../api/hrApi';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { formatDate, formatCurrencyQAR, hrEmployeeStatusBadgeClass } from '../utils/hrUtils';

const MAX_CONTRACT_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_CONTRACT_FILE_TYPES = [
  'application/pdf', 'image/jpeg', 'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** A single document row — a link when the file is on file, a red "Missing"
 * state when it's an important document that isn't. Used throughout the
 * Documents tab instead of silently omitting whatever wasn't uploaded. */
function FileRow({ label, url, important }: { label: string; url: string | null; important?: boolean }) {
  if (!url) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm">
        <span className="text-muted-foreground">{label}</span>
        {important ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
            <AlertTriangle size={12} /> Missing
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not provided</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-1 shrink-0">
        <a href={url} target="_blank" rel="noopener noreferrer" title="View">
          <Button size="sm" variant="ghost"><Eye size={14} /></Button>
        </a>
        <a href={url} download target="_blank" rel="noopener noreferrer" title="Download">
          <Button size="sm" variant="ghost"><Download size={14} /></Button>
        </a>
      </div>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { contractType: urlContractType, id } = useParams<{ contractType: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { language, t } = useHrLanguage();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const contractFileInputRef = useRef<HTMLInputElement>(null);

  const backRoute = `/hr/employees/${urlContractType}`;
  const employeeId = Number(id);

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['hr-employee', employeeId],
    queryFn: () => hrApi.getEmployee(employeeId),
    enabled: Number.isFinite(employeeId),
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['hr-employee', employeeId] });

  const handleContractFileSelect = async (file: File | null) => {
    if (!file || !employee) return;
    if (!ALLOWED_CONTRACT_FILE_TYPES.includes(file.type)) {
      showToast(t('fileTypeNotAllowed'), 'error');
      return;
    }
    if (file.size > MAX_CONTRACT_FILE_BYTES) {
      showToast(t('fileTooLarge'), 'error');
      return;
    }

    setUploading(true);
    try {
      await hrApi.uploadContractAttachment(employee.id, file);
      refetch();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to upload contract file.'), 'error');
    } finally {
      setUploading(false);
      if (contractFileInputRef.current) contractFileInputRef.current.value = '';
    }
  };

  const handleDeleteContract = async (attachmentId: number) => {
    if (!employee) return;
    setDeletingId(attachmentId);
    try {
      await hrApi.deleteContractAttachment(employee.id, attachmentId);
      refetch();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to delete contract file.'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Employee record not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(backRoute)}>
          Back to List
        </Button>
      </div>
    );
  }

  const isPermanent = employee.contractType === 'Permanent';

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => navigate(backRoute)}>
          <ArrowLeft size={20} />
        </Button>

        <div className="flex-1 min-w-0 flex items-center gap-3">
          <EmployeeAvatar
            profilePictureUrl={employee.profilePictureUrl}
            gender={employee.gender}
            name={employee.fullNameEn}
            size="lg"
            className="border border-border"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-card-foreground truncate">
                {bilingual(language, employee.fullNameEn, employee.fullNameAr)}
              </h1>
              <Badge className="border-transparent bg-primary/15 text-primary">{employee.contractType}</Badge>
              <Badge className={hrEmployeeStatusBadgeClass(employee.status)}>{employee.status}</Badge>
              {employee.recentlyConvertedToPermanent && (
                <Badge className="border-transparent bg-yellow-400/20 text-yellow-700 dark:text-yellow-300">
                  Freelance → Permanent
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {bilingual(language, employee.jobTitleEn, employee.jobTitleAr)} ·{' '}
              {bilingual(language, employee.departmentNameEn, employee.departmentNameAr)}
              {employee.sectionNameEn && ` · ${bilingual(language, employee.sectionNameEn, employee.sectionNameAr)}`}
            </p>
            {employee.statusNote && (
              <p className="text-xs text-muted-foreground mt-0.5">{employee.statusNote}</p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => navigate(`/hr/employees/${urlContractType}/${employee.id}/edit`)}
        >
          <Pencil size={16} /> {t('edit')}
        </Button>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User size={14} /> {t('profile')}
          </TabsTrigger>
          <TabsTrigger value="contracts" className="gap-1.5">
            <FileText size={14} /> {t('documents')}
            {employee.contractAttachments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
                {employee.contractAttachments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History size={14} /> {t('history')}
            {employee.historyEvents.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[11px]">
                {employee.historyEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6 mt-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DetailSection icon={Phone} title={t('contact')}>
          <DetailFieldGrid>
            <DetailField label={t('mobileNumber')} value={employee.mobileNumber} important />
            <DetailField label={t('emergencyNumber')} value={employee.emergencyNumber} />
            <DetailField label={t('emailWork')} value={employee.emailWork} />
            <DetailField label={t('emailPersonal')} value={employee.emailPersonal} important />
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection icon={Briefcase} title={t('employment')}>
          <DetailFieldGrid>
            {isPermanent ? (
              <>
                <DetailField label={t('jobNumberQmc')} value={employee.qmcJobNo} />
                <DetailField label={t('jobNumberMawared')} value={employee.mawaredJobNo} />
                <DetailField label={t('jobGroup')} value={employee.jobGroup} />
                <DetailField label={t('grade')} value={employee.grade} />
              </>
            ) : (
              <>
                <DetailField label={t('jobNumberAssociate')} value={employee.associateJobNo} />
                <DetailField label={t('employer')} value={employee.employer} />
              </>
            )}
            <DetailField label={t('joinDate')} value={employee.joinDate ? formatDate(employee.joinDate) : null} />
            {!isPermanent && (
              <>
                <DetailField label={t('reward')} value={employee.reward} />
                <DetailField
                  label={t('monthlyRate')}
                  value={employee.monthlyRate ? formatCurrencyQAR(employee.monthlyRate) : null}
                />
              </>
            )}
          </DetailFieldGrid>
        </DetailSection>

        <DetailSection icon={CreditCard} title={t('identification')}>
          <DetailFieldGrid>
            <DetailField label={t('title')} value={employee.title} />
            <DetailField label={t('qid')} value={employee.qid} important />
            <DetailField label={t('qidExpiry')} value={employee.qidExpiry ? formatDate(employee.qidExpiry) : null} important />
            <DetailField label={t('passportNumber')} value={employee.passportNumber} important />
            <DetailField
              label={t('passportExpiry')}
              value={employee.passportExpiry ? formatDate(employee.passportExpiry) : null}
              important
            />
            <DetailField label={t('nationality')} value={employee.nationality} important />
            <DetailField
              label={t('dob')}
              value={
                employee.dob
                  ? `${formatDate(employee.dob)}${employee.age !== null ? ` (${t('age')} ${employee.age})` : ''}`
                  : null
              }
              important
            />
            <DetailField label={t('gender')} value={employee.gender} important />
            <DetailField label={t('maritalStatus')} value={employee.maritalStatus} />
            <DetailField label={t('bloodType')} value={employee.bloodType} />
            <DetailField label={t('educationLevel')} value={employee.educationLevel} />
            <DetailField label={t('fieldOfStudy')} value={employee.fieldOfStudy} />
          </DetailFieldGrid>
        </DetailSection>

        {!isPermanent && (
          <DetailSection icon={Home} title={t('addressResidence')}>
            <DetailFieldGrid>
              <DetailField label={t('address')} value={employee.address} important />
              <DetailField label={t('residenceCountry')} value={employee.residenceCountry} important />
              <DetailField label={t('languages')} value={employee.languages} />
            </DetailFieldGrid>
          </DetailSection>
        )}

        {!isPermanent && (
          <DetailSection icon={Users2} title={t('emergencyContact')}>
            <DetailFieldGrid>
              <DetailField label={t('emergencyContactName')} value={employee.emergencyContactName} important />
              <DetailField label={t('emergencyContactRelationship')} value={employee.emergencyContactRelationship} />
              <DetailField label={t('emergencyContactPhone')} value={employee.emergencyContactPhone} important />
            </DetailFieldGrid>
          </DetailSection>
        )}

        {!isPermanent && (
          <DetailSection icon={Landmark} title={t('bankDetails')}>
            <DetailFieldGrid>
              <DetailField label={t('bankBeneficiaryName')} value={employee.bankBeneficiaryName} important />
              <DetailField label={t('bankName')} value={employee.bankName} important />
              <DetailField label={t('bankBranch')} value={employee.bankBranch} important />
              <DetailField label={t('bankAccountNumber')} value={employee.bankAccountNumber} important />
              <DetailField label={t('bankIban')} value={employee.bankIban} important />
            </DetailFieldGrid>
          </DetailSection>
        )}

        {!isPermanent && (
          <DetailSection icon={Users2} title={t('relativesAtQbc')}>
            <DetailFieldGrid>
              <DetailField
                label={t('hasRelativesAtQbc')}
                value={employee.hasRelativesAtQbc === null ? null : employee.hasRelativesAtQbc ? t('yes') : t('no')}
              />
              {employee.hasRelativesAtQbc && (
                <>
                  <DetailField label={t('relativeFullName')} value={employee.relativeFullName} />
                  <DetailField label={t('relativeRelationship')} value={employee.relativeRelationship} />
                  <DetailField label={t('department')} value={employee.relativeDepartment} />
                </>
              )}
            </DetailFieldGrid>
          </DetailSection>
        )}

        {!isPermanent && (
          <DetailSection icon={ShieldCheck} title={t('declaration')}>
            <DetailFieldGrid>
              <DetailField
                label={t('declarationStatus')}
                value={employee.declarationAccepted ? t('declarationAccepted') : t('declarationNotAccepted')}
                important
              />
              <DetailField
                label={t('date')}
                value={employee.declarationAcceptedAt ? formatDate(employee.declarationAcceptedAt) : null}
              />
            </DetailFieldGrid>
          </DetailSection>
        )}

      </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-6 mt-4">
        {!isPermanent && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DetailSection icon={FileText} title={t('cv')}>
              <FileRow label={t('cv')} url={employee.cvUrl} important />
            </DetailSection>

            <DetailSection icon={FileText} title={t('employerDocuments')}>
              <div className="space-y-2">
                <FileRow label={t('employerNocLetter')} url={employee.employerNocLetterUrl} />
                <FileRow label={t('employerEstablishmentCard')} url={employee.employerEstablishmentCardUrl} />
              </div>
            </DetailSection>

            <DetailSection icon={Landmark} title={t('bankCertificate')}>
              <FileRow label={t('bankCertificate')} url={employee.bankCertificateUrl} important />
            </DetailSection>

            <DetailSection icon={GraduationCap} title={t('education')}>
              {employee.educations.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noEducation')}</p>
              ) : (
                <div className="space-y-2">
                  {employee.educations.map((e) => (
                    <FileRow
                      key={e.id}
                      label={`${e.qualificationLevel}${e.major ? ` — ${e.major}` : ''}${e.attested ? ` (${t('attested')})` : ''}`}
                      url={e.fileUrl}
                    />
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection icon={Briefcase} title={t('experience')}>
              {employee.experiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noExperience')}</p>
              ) : (
                <div className="space-y-2">
                  {employee.experiences.map((e) => (
                    <FileRow
                      key={e.id}
                      label={[e.jobTitle, e.companyName, e.country].filter(Boolean).join(' · ') || t('experience')}
                      url={e.fileUrl}
                    />
                  ))}
                </div>
              )}
            </DetailSection>

            <DetailSection icon={Award} title={t('certificates')}>
              {employee.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noCertificates')}</p>
              ) : (
                <div className="space-y-2">
                  {employee.certificates.map((c) => (
                    <FileRow key={c.id} label={c.title || t('certificates')} url={c.fileUrl} />
                  ))}
                </div>
              )}
            </DetailSection>
          </div>
        )}

            <DetailSection
              icon={UploadCloud}
              title={t('contracts')}
              actions={
                <>
                  <input
                    ref={contractFileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => handleContractFileSelect(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => contractFileInputRef.current?.click()}
                  >
                    <Upload size={14} className="mr-1" /> {uploading ? t('uploading') : t('uploadFile')}
                  </Button>
                </>
              }
            >
              {employee.contractAttachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noDocuments')}</p>
              ) : (
                <ul className="space-y-2">
                  {employee.contractAttachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{a.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(a.createdAt)}{a.fileSizeBytes ? ` · ${formatFileSize(a.fileSizeBytes)}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" title={t('view')}>
                          <Button size="sm" variant="ghost"><Eye size={14} /></Button>
                        </a>
                        <a href={a.fileUrl} download={a.fileName} target="_blank" rel="noopener noreferrer" title={t('download')}>
                          <Button size="sm" variant="ghost"><Download size={14} /></Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deletingId === a.id}
                          onClick={() => handleDeleteContract(a.id)}
                          title={t('delete')}
                        >
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <EmployeeHistoryTimeline events={employee.historyEvents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
