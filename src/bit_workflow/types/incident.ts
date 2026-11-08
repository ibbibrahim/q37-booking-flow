import type { ReportState, TicketPriority, TicketStatus } from './ticket';

export type IncidentReportStatus = 'new' | 'draft' | 'submitted';
export type IncidentFrequency = '' | 'one_time' | 'intermittent' | 'recurring' | 'continuous';
export type IncidentReportPriority = 'critical' | 'high' | 'normal' | 'low';

export interface IncidentEquipment {
  name: string;
  brand: string;
  model: string;
  serialNo: string;
  location: string;
}

export interface SaveIncidentReport {
  reportDate: string | null;
  department: string;
  location: string;
  reportedByName: string;
  equipment: IncidentEquipment[];
  problemObserved: string;
  conditions: string;
  frequency: IncidentFrequency;
  impact: string;
  priority: IncidentReportPriority;
  startedAt: string | null;
  restoredAt: string | null;
  immediateAction: string;
  rootCause: string;
  correctiveActions: string;
  preventiveActions: string;
  recommendations: string;
  pendingFollowups: string;
}

export interface IncidentReport extends SaveIncidentReport {
  id: number | null;
  ticketId: number;
  ticketNo: string;
  ticketTitle: string;
  reportNo: string | null;
  status: IncidentReportStatus;
  revision: number;
  downtimeMinutes: number | null;
  preparedByName: string | null;
  preparedByUserId: number | null;
  signedAt: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  pdfUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type SubmitIncidentReport = SaveIncidentReport & { confirm: true };

export interface IncidentRegisterItem {
  ticketId: number;
  ticketNo: string;
  title: string;
  ticketStatus: TicketStatus;
  priority: TicketPriority;
  incidentStartedAt: string | null;
  onAirRestoredAt: string | null;
  downtimeMinutes: number | null;
  reportState: ReportState;
  reportDueAt: string | null;
  reportNo: string | null;
  reportStatus: 'draft' | 'submitted' | null;
  revision: number | null;
  preparedByName: string | null;
  submittedAt: string | null;
  createdByName: string;
}

export interface IncidentRegisterParams {
  state?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
