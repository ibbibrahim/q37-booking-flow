export interface HrBankCertificateScanResult {
  beneficiaryName: string | null;
  bankName: string | null;
  branch: string | null;
  accountNumber: string | null;
  iban: string | null;
  warnings: string[];
}

export interface FreelanceProfileEntry {
  id: number;
  title: string | null;
  companyName: string | null;
  country: string | null;
  jobTitle: string | null;
  qualificationLevel: string | null;
  major: string | null;
  attested: boolean;
  fileUrl: string;
}

export type FreelanceProfileStatus = 'Pending' | 'Approved' | 'Rejected';

export interface FreelanceProfileSubmission {
  id: number;
  status: FreelanceProfileStatus;
  title: string | null;
  fullNameEn: string;
  fullNameAr: string | null;
  qid: string;
  qidExpiry: string | null;
  qidImageUrl: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  nationality: string | null;
  dob: string | null;
  employer: string | null;
  employerNocLetterUrl: string | null;
  employerEstablishmentCardUrl: string | null;
  gender: string | null;
  bloodType: string | null;
  maritalStatus: string | null;
  phoneNumber: string | null;
  personalEmail: string | null;
  address: string | null;
  residenceCountry: string | null;
  languages: string | null;
  photoUrl: string | null;
  cvUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  education: FreelanceProfileEntry[];
  experience: FreelanceProfileEntry[];
  certificates: FreelanceProfileEntry[];
  hasRelativesAtQbc: boolean;
  relativeFullName: string | null;
  relativeRelationship: string | null;
  relativeDepartment: string | null;
  bankCertificateUrl: string | null;
  bankBeneficiaryName: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNumber: string | null;
  bankIban: string | null;
  declarationAccepted: boolean;
  declarationAcceptedAt: string | null;
  matchedEmployeeId: number | null;
  matchedEmployeeName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface FreelanceProfileSubmissionSummary {
  id: number;
  status: FreelanceProfileStatus;
  fullNameEn: string;
  qid: string;
  matchedEmployeeId: number | null;
  matchedEmployeeName: string | null;
  createdAt: string;
}

// ---- Form-side working state (before submission) ----

export interface FreelanceProfileEducationDraft {
  qualificationLevel: string;
  major: string;
  attested: boolean | null; // null = not yet chosen — an explicit answer is required
  file: File | null;
}

export interface FreelanceProfileExperienceDraft {
  companyName: string;
  country: string;
  jobTitle: string;
  file: File | null;
}

export interface FreelanceProfileCertificateDraft {
  title: string;
  file: File | null;
}

export interface FreelanceProfileFormFields {
  title: string;
  fullNameEn: string;
  fullNameAr: string;
  qid: string;
  qidExpiry: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  dob: string;
  employer: string;
  gender: string;
  bloodType: string;
  maritalStatus: string;
  phoneCountryCode: string;
  phoneNumber: string;
  personalEmail: string;
  address: string;
  residenceCountry: string;
  languages: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  hasRelativesAtQbc: boolean | null; // null = not yet chosen — an explicit answer is required
  relativeFullName: string;
  relativeRelationship: string;
  relativeDepartment: string;
  bankBeneficiaryName: string;
  bankName: string;
  bankBranch: string;
  bankAccountNumber: string;
  bankIban: string;
  declarationAccepted: boolean;
}

export interface FreelanceProfileFormFiles {
  qidImage: File | null;
  photo: File | null;
  cv: File | null;
  employerNocLetter: File | null;
  employerEstablishmentCard: File | null;
  bankCertificate: File | null;
}
