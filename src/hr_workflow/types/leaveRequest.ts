export type LeaveRequestStatus =
  | 'Draft'
  | 'AwaitingDepartmentHeadSignature'
  | 'AwaitingFreelancerAcknowledgment'
  | 'Completed';

export type SuspensionType = 'Full' | 'Partial';

export interface LeaveRequestSummary {
  id: number;
  status: LeaveRequestStatus;
  employeeId: number;
  employeeFullNameEn: string | null;
  employeeFullNameAr: string | null;
  departmentId: number | null;
  departmentNameEn: string | null;
  suspensionType: SuspensionType | null;
  startDate: string | null;
  endDate: string | null;
  totalDays: number | null;
  createdAt: string;
}

export interface LeaveRequestDetail extends LeaveRequestSummary {
  pdfUrl: string;
  noticeReferenceNo: string | null;
  dateOfNotice: string | null;
  partialScope: string | null;
  reason: string | null;
  deptHeadSignedByName: string | null;
  deptHeadSignedAt: string | null;
  freelancerSignedByName: string | null;
  freelancerAcknowledgedAt: string | null;
}

export interface LeaveRequestEvent {
  id: number;
  eventType: string;
  actorName: string | null;
  metadata: string | null;
  createdAt: string;
}

export interface LeaveRequestFieldsPayload {
  noticeReferenceNo?: string;
  dateOfNotice?: string;
  suspensionType?: SuspensionType;
  partialScope?: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  reason?: string;
}

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  Draft: 'Draft',
  AwaitingDepartmentHeadSignature: 'Awaiting Department Head Signature',
  AwaitingFreelancerAcknowledgment: 'Awaiting Freelancer Acknowledgment',
  Completed: 'Completed',
};
