export type BookingType = 'Incoming Feed' | 'Invite Guest for News' | 'Invite Guest for Program' | 'Download and Ingest' | 'Camera Card and Ingest';

export type WorkflowStatus =
  | 'Draft'
  | 'Submitted'
  | 'With NOC'
  | 'Clarification Requested'
  | 'Resources Added'
  | 'With Ingest'
  | 'Completed'
  | 'Not Done';

export type UserRole = 'Booking' | 'NOC' | 'Ingest' | 'Admin' | 'Callsheet' | 'TechnicalStore';

export type Priority = 'Normal' | 'High' | 'Urgent';
export type Language = 'English' | 'Arabic';
export type SourceType =
  | 'Earth Stations'
  | 'Qatar TV'
  | 'Haivision'
  | 'Galley'
  | 'Streaming'
  | 'ISO Recording';

export type QMCSource =
  | 'CONV1 - up'
  | 'CONV2 - up'
  | 'CONV3 - up'
  | 'CONV4 - up'
  | 'CONV5 - up'
  | 'CONV6 - up'
  | 'CONV7 - up'
  | 'CONV8 - up'
  | 'CONV9 - up'
  | 'CONV10 - up'
  | 'RX4K-7'
  | 'RX4K-8'
  | 'RX4K-9'
  | 'RX4K-10'
  | 'PGM QA-1'
  | 'PGM QA-2'
  | 'GA-1 CLN'
  | 'GA-2 CLN'
  | 'IRD-2 UHD'
  | 'CAM 1 ISO QA1';

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
  studio?: string;
  airDateTime: string;
  feedStartTime?: string;
  feedEndTime?: string;
  language: Language;
  priority: Priority;
  nocRequired: YesNo;
  resourcesNeeded?: string;
  notes?: string;
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
  resourceName: string;
  type: 'Main' | 'Backup';
  assignedBy?: string;
  assignedAt?: string;
}


export const SOURCE_MAP: Record<string, string[]> = {
  "Earth Stations": [
    "CONV1 - up","CONV2 - up","CONV3 - up","CONV4 - up","CONV5 - up",
    "CONV6 - up","CONV7 - up","CONV8 - up","CONV9 - up","CONV10 - up",
  ],
  "Qatar TV": [
    "CONV1 - up","CONV2 - up","CONV3 - up","CONV4 - up","CONV5 - up",
    "CONV6 - up","CONV7 - up","CONV8 - up","CONV9 - up","CONV10 - up",
  ],
  "Haivision": ["RX4K-7", "RX4K-8", "RX4K-9", "RX4K-10"],
  "Galley": ["PGM QA-1", "PGM QA-2", "GA-1 CLN", "GA-2 CLN"],
  "Streaming": ["IRD-2"],
  "ISO Recording": ["CAM 1 ISO GA1"],
};