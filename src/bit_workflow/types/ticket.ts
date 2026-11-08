import type { UploadedFileRef } from '@/components/ui/multi-file-upload-field';
import type { BitVendorContact } from './vendor';

export type TicketStatus = 'new' | 'in_progress' | 'on_hold' | 'resolved' | 'closed';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketCategory =
  | 'playout'
  | 'graphics'
  | 'video_server'
  | 'mam_storage'
  | 'audio'
  | 'network'
  | 'hardware'
  | 'software'
  | 'access'
  | 'other';
export type CommentKind = 'update' | 'note';
export type SlaState = 'on_track' | 'at_risk' | 'breached' | 'met' | 'paused';
export type ReportState = 'none' | 'in_progress' | 'due' | 'overdue' | 'submitted';

export interface SlaInfo {
  dueAt: string;
  metAt: string | null;
  state: SlaState;
}

export type AttachmentRef = UploadedFileRef;

export interface BitTicketListItem {
  id: number;
  ticketNo: string;
  title: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  affectedSystem: string | null;
  vendorId: number | null;
  vendorName: string | null;
  vendorCaseRef: string | null;
  assigneeUserId: number | null;
  assigneeName: string | null;
  createdByUserId: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  responseSla: SlaInfo;
  resolveSla: SlaInfo;
  commentCount: number;
  attachmentCount: number;
  isFollowing: boolean;
  onAirImpact: boolean;
  incidentStartedAt: string | null;
  onAirRestoredAt: string | null;
  escalatedAt: string | null;
  reportDueAt: string | null;
  reportState: ReportState;
  reportNo: string | null;
  reportStatus: 'draft' | 'submitted' | null;
}

export interface BitTicketAttachment {
  id: number;
  commentId: number | null;
  fileName: string;
  url: string;
  contentType: string | null;
  sizeBytes: number;
  uploadedByName: string;
  createdAt: string;
}

export interface BitTicketComment {
  id: number;
  kind: CommentKind;
  body: string;
  authorUserId: number;
  authorName: string;
  createdAt: string;
  attachments: BitTicketAttachment[];
}

export interface BitTicketEvent {
  id: number;
  eventType: string;
  fromValue: string | null;
  toValue: string | null;
  actorName: string;
  createdAt: string;
}

export interface BitTicketFollower {
  userId: number;
  userName: string;
}

export interface BitTicketVendorSummary {
  id: number;
  name: string;
  portalUrl: string | null;
  supportEmail: string | null;
  contacts: BitVendorContact[];
}

export interface BitTicketDetail extends BitTicketListItem {
  description: string;
  resolutionSummary: string | null;
  slaPausedAt: string | null;
  attachments: BitTicketAttachment[];
  comments: BitTicketComment[];
  events: BitTicketEvent[];
  followers: BitTicketFollower[];
  vendor: BitTicketVendorSummary | null;
}

export interface CreateBitTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  affectedSystem?: string | null;
  vendorId?: number | null;
  vendorCaseRef?: string | null;
  assigneeUserId?: number | null;
  attachments: AttachmentRef[];
  onAirImpact?: boolean;
  incidentStartedAt?: string | null;
}

export interface SetOnAirBody {
  onAirImpact: boolean;
  incidentStartedAt?: string | null;
}

export interface UpdateBitTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  affectedSystem: string | null;
  vendorId: number | null;
  vendorCaseRef: string | null;
}

export interface SetTicketStatusBody {
  status: TicketStatus;
  resolutionSummary?: string;
}

export interface AssignTicketBody {
  userId: number | null;
}

export interface AddTicketCommentBody {
  kind: CommentKind;
  body: string;
  attachments: AttachmentRef[];
  notifyManager?: boolean;
}

export interface BitTicketListParams {
  status?: TicketStatus[];
  priority?: TicketPriority[];
  category?: TicketCategory;
  /** 'me' | 'unassigned' | user id */
  assignee?: string;
  /** 'me' | user id */
  createdBy?: string;
  following?: boolean;
  vendorId?: number;
  sla?: 'breached' | 'at_risk';
  onAir?: boolean;
  reportState?: ReportState[];
  search?: string;
  sort?: 'updated' | 'created' | 'priority' | 'sla';
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface BitTicketSummary {
  open: number;
  assignedToMe: number;
  createdByMe: number;
  following: number;
  unassigned: number;
  breached: number;
  onHold: number;
  incidentsOpen: number;
  reportsDue: number;
  reportsOverdue: number;
}

export interface BitTicketAssignee {
  userId: number;
  name: string;
}

export interface BitTicketReport {
  totals: {
    created: number;
    resolved: number;
    open: number;
    avgFirstResponseMinutes: number | null;
    avgResolutionMinutes: number | null;
    slaCompliancePercent: number | null;
    onAirIncidents: number;
    onAirDowntimeMinutes: number;
    reportsOnTimePercent: number | null;
  };
  daily: { date: string; created: number; resolved: number }[];
  byCategory: { key: string; count: number }[];
  byPriority: { key: string; count: number }[];
  byVendor: { vendorId: number; vendorName: string; count: number }[];
  byAssignee: {
    userId: number;
    name: string;
    open: number;
    resolved: number;
    avgResolutionMinutes: number | null;
  }[];
}
