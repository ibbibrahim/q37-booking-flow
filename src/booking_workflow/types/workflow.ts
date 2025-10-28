export type BookingType = 'Incoming Feed' | 'Invite Guest for News' | 'Invite Guest for Program' | 'Download and Ingest';

export type WorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'With NOC'
  | 'Clarification Requested'
  | 'Resources Added'
  | 'With Ingest'
  | 'Completed'
  | 'Not Done';

export type UserRole = 'Booking' | 'NOC' | 'Ingest' | 'Admin';

export type Priority = 'Normal' | 'High' | 'Urgent';
export type Language = 'English' | 'Arabic';
export type SourceType = 'QMC Earth Station' | 'vMix' | 'SRT';
export type QMCSource = 'Ext-1' | 'Ext-2' | 'Ext-3' | 'Ext-4' | 'Ext-5' | 'Ext-6' | 'Ext-7' | 'Ext-8' | 'Ext-9' | 'Ext-10';
export type ResourceAssignmentType = 'Main' | 'Backup';
export type Resolution = 'HD' | 'UHD';
export type ReturnPath = 'Enabled' | 'Disabled';
export type KeyFill = 'None' | 'Key' | 'Fill';
export type YesNo = 'Yes' | 'No';

export interface BaseWorkflowRequest {
  id: string;
  bookingType: BookingType;
  title: string;
  program: string;
  airDateTime: string;
  feedStartTime?: string;
  feedEndTime?: string;
  language: Language;
  priority: Priority;
  nocRequired: YesNo;
  resourcesNeeded: string;
  newsroomTicket: string;
  complianceTags: string;
  notes: string;
  status: WorkflowStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncomingFeedRequest extends BaseWorkflowRequest {
  bookingType: 'Incoming Feed';
  sourceType?: SourceType;
  qmcSource?: QMCSource;
  vmixInputNumber?: string;
  resourceAssignmentType?: ResourceAssignmentType;
  resolution?: Resolution;
  returnPath?: ReturnPath;
  keyFill?: KeyFill;
}

export interface InviteGuestNewsRequest extends BaseWorkflowRequest {
  bookingType: 'Invite Guest for News';
  guestName: string;
  guestContact: string;
  inewsRundownId: string;
  storySlug: string;
  rundownPosition: string;
}

export interface InviteGuestProgramRequest extends BaseWorkflowRequest {
  bookingType: 'Invite Guest for Program';
  guestName: string;
  guestContact: string;
  inewsRundownId: string;
  storySlug: string;
  rundownPosition: string;
}

export interface DownloadIngestRequest extends BaseWorkflowRequest {
  bookingType: 'Download and Ingest';
  downloadSource: 'YouTube' | 'WeTransfer' | 'FTP' | 'Other';
  downloadLink: string;
}

export type WorkflowRequest = IncomingFeedRequest | InviteGuestNewsRequest | InviteGuestProgramRequest | DownloadIngestRequest;

export interface WorkflowTransition {
  id: string;
  requestId: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  changedBy: string;
  changedAt: string;
  comment: string;
}

export interface ResourceAssignment {
  id: string;
  requestId: string;
  resourceType: string;
  resourceName: string;
  assignedBy: string;
  assignedAt: string;
}
