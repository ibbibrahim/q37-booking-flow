export type ContractType = 'Permanent' | 'Freelance';

export type EmployeeStatus = 'Active' | 'Retired' | 'End of Service';

export interface Department {
  id: number;
  name: string;
}

export interface EmploymentHistoryEntry {
  id: string;
  date: string; // ISO date
  fromType: ContractType | null;
  toType: ContractType;
  reason: string;
  note?: string;
}

export interface Employee {
  id: number;
  fullName: string;
  jobNumber: string;
  jobTitle: string;
  departmentId: number;
  joinDate: string; // ISO date
  contractType: ContractType;
  reward: string;
  qid: string;
  qidExpiry: string; // ISO date
  nationality: string;
  isQatari: boolean;
  mobileNumber: string;
  emailPersonal: string;
  emailWork: string;
  status: EmployeeStatus;
  dob: string; // ISO date
  onLeave: boolean;
  monthlyRate: number; // used for freelance finance reporting
  recentlyConvertedToPermanent: boolean;
  employmentHistory: EmploymentHistoryEntry[];
}

export type LeaveRequestStatus =
  | 'Pending Department'
  | 'Pending HR'
  | 'Approved'
  | 'Rejected';

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName: string;
  departmentId: number;
  jobTitle: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: LeaveRequestStatus;
  requestedAt: string;
  departmentApproved: boolean;
  hrApproved: boolean;
  notifiedByEmail: boolean;
  notifiedByPortal: boolean;
  payrollNoted: boolean;
}

export interface FinanceMonthEntry {
  month: string; // e.g. "2026-01"
  departmentId: number;
  freelanceSpend: number;
}
