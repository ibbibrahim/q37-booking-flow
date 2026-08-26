export type HrContractType = 'Permanent' | 'Freelance';

export type HrEmployeeStatus = 'Active' | 'External Secondment' | 'On Leave' | 'Retired' | 'End of Service';

export interface HrSection {
  id: number;
  departmentId: number;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
}

export interface HrDepartment {
  id: number;
  nameEn: string;
  nameAr: string;
  sortOrder: number;
  sections: HrSection[];
}

export type HrHistoryEventType =
  | 'Hired'
  | 'ContractType'
  | 'Department'
  | 'Section'
  | 'JobTitle'
  | 'Grade'
  | 'Status';

export interface HrEmployeeHistoryEvent {
  id: number;
  eventType: HrHistoryEventType;
  changeDate: string;

  fromContractType: HrContractType | null;
  toContractType: HrContractType | null;

  fromDepartmentId: number | null;
  fromDepartmentNameEn: string | null;
  fromDepartmentNameAr: string | null;
  toDepartmentId: number | null;
  toDepartmentNameEn: string | null;
  toDepartmentNameAr: string | null;

  fromSectionId: number | null;
  fromSectionNameEn: string | null;
  fromSectionNameAr: string | null;
  toSectionId: number | null;
  toSectionNameEn: string | null;
  toSectionNameAr: string | null;

  fromJobTitleEn: string | null;
  fromJobTitleAr: string | null;
  toJobTitleEn: string | null;
  toJobTitleAr: string | null;

  fromGrade: string | null;
  toGrade: string | null;

  fromStatus: string | null;
  toStatus: string | null;

  reason: string | null;
  note: string | null;
}

export interface HrContractAttachment {
  id: number;
  fileUrl: string;
  fileName: string;
  contentType: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export interface HrEmployee {
  id: number;
  contractType: HrContractType;

  qmcJobNo: string | null;
  mawaredJobNo: string | null;
  associateJobNo: string | null;

  fullNameEn: string;
  fullNameAr: string;
  jobTitleEn: string;
  jobTitleAr: string;

  departmentId: number;
  departmentNameEn: string | null;
  departmentNameAr: string | null;
  sectionId: number | null;
  sectionNameEn: string | null;
  sectionNameAr: string | null;

  jobGroup: string | null;
  grade: string | null;
  joinDate: string | null;
  employmentBasis: string | null;
  employer: string | null;

  gender: string | null;
  nationality: string | null;
  isQatari: boolean | null;
  dob: string | null;
  age: number | null;
  maritalStatus: string | null;
  educationLevel: string | null;
  fieldOfStudy: string | null;

  qid: string;
  qidExpiry: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  mobileNumber: string | null;
  emergencyNumber: string | null;
  emailWork: string | null;
  emailPersonal: string | null;

  monthlyRate: number | null;

  status: HrEmployeeStatus;
  statusNote: string | null;

  reward: string | null;
  profilePictureUrl: string | null;
  recentlyConvertedToPermanent: boolean;

  historyEvents: HrEmployeeHistoryEvent[];
  contractAttachments: HrContractAttachment[];

  createdAt: string;
  updatedAt: string;
}

export interface CreateHrEmployeeDto {
  contractType: HrContractType;
  qmcJobNo?: string | null;
  mawaredJobNo?: string | null;
  associateJobNo?: string | null;
  fullNameEn: string;
  fullNameAr: string;
  jobTitleEn: string;
  jobTitleAr: string;
  departmentId: number;
  sectionId?: number | null;
  jobGroup?: string | null;
  grade?: string | null;
  joinDate?: string | null;
  employmentBasis?: string | null;
  employer?: string | null;
  gender?: string | null;
  nationality?: string | null;
  dob?: string | null;
  maritalStatus?: string | null;
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
  qid: string;
  qidExpiry?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  mobileNumber?: string | null;
  emergencyNumber?: string | null;
  emailWork?: string | null;
  emailPersonal?: string | null;
  monthlyRate?: number | null;
  status: HrEmployeeStatus;
  statusNote?: string | null;
  reward?: string | null;
}

export interface HrEmployeeQuery {
  contractType?: HrContractType;
  departmentId?: number;
  status?: HrEmployeeStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface HrEmployeeListResult {
  total: number;
  page: number;
  pageSize: number;
  items: HrEmployee[];
}

export interface UpdateHrEmployeeStatusDto {
  status: HrEmployeeStatus;
  statusNote?: string | null;
}

export interface HrQidScanResult {
  qid: string | null;
  dob: string | null;
  qidExpiry: string | null;
  nationality: string | null;
  fullNameEn: string | null;
  fullNameAr: string | null;
  // Government-listed visa occupation — reference only, never auto-applied to job title.
  occupation: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  employer: string | null;
  residencyType: string | null;
  warnings: string[];
}

export interface ConvertToPermanentDto {
  changeDate: string;
  reason: string;
  note?: string | null;
  qmcJobNo?: string | null;
  mawaredJobNo?: string | null;
  jobGroup?: string | null;
  grade?: string | null;
  joinDate?: string | null;
  gender?: string | null;
  nationality?: string | null;
  dob?: string | null;
  maritalStatus?: string | null;
  educationLevel?: string | null;
  fieldOfStudy?: string | null;
}
