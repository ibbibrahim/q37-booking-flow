import { User } from "@/contexts/AuthContext";

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

export interface DownloadLinkDto {
  id: number;
  requestId: number;
  source: string;
  url: string;
  ingestStatus: string;
  ingestNotes?: string;
  updatedBy?: number;
  updatedAt: string;
}

export interface CameraCardDetailDto {
  id: number;
  requestId: number;
  videoQuantity: number;
  audioQuantity: number;
}

export interface GuestDetailDto {
  id: number;
  requestId: number;
  guestName: string;
  guestContact: string;
}

export interface NocResourceDto {
  id: number;
  requestId: number;
  sourceType: string;
  source: string;
  resolution?: string;
  resourceType: string;
  assignedByUser?: User;
  assignedAt: string;
}

export interface WorkflowRequest {
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
  status: WorkflowStatus;
  resourcesNeeded?: string;
  notes?: string;
  nocAcknowledged: boolean;
  nocClarification?: string;
  nocForwardToIngest: YesNo;
  ingestStatus?: string;
  ingestNotes?: string;
  ingestNotDoneReason?: string;
  ingestFolderPath?: string;
  ingestAcknowledged: boolean;
  createdBy: string;
  createdByUser?: User | null;
  createdAt: string;
  updatedAt: string;
  transitions?: WorkflowTransition[];
  downloadLinks?: DownloadLinkDto[];
  cameraCardDetail?: CameraCardDetailDto;
  guestDetail?: GuestDetailDto;
  nocResources?: NocResourceDto[];
}

export interface WorkflowTransition {
  id: string;
  requestId: string;
  fromStatus: WorkflowStatus;
  toStatus: WorkflowStatus;
  changedBy: string;
  changedByUser?: User | null;
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
    "CONV 1 - up","CONV 2 - up","CONV 3 - up","CONV 4 - up","CONV 5 - up",
    "CONV 6 - up","CONV 7 - up","CONV 8 - up","CONV 9 - up","CONV 10 - up",
  ],
  "Qatar TV": [
    "CONV 1 - up","CONV 2 - up","CONV 3 - up","CONV 4 - up","CONV 5 - up",
    "CONV 6 - up","CONV 7 - up","CONV 8 - up","CONV 9 - up","CONV 10 - up",
  ],
  "Haivision": ["RX4K-7", "RX4K-8", "RX4K-9", "RX4K-10"],
  "Gallery": ["PGM GA-1", "PGM GA-2", "GA-1 CLN", "GA-2 CLN"],
  "Streaming": ["IRD-2" , "CONV 1 - up","CONV 2 - up","CONV 3 - up","CONV 4 - up","CONV 5 - up",
    "CONV 6 - up","CONV 7 - up","CONV 8 - up","CONV 9 - up","CONV 10 - up"],
  "ISO Recording": [
    "CAM 1 ISO GA1","CAM 1 ISO GA2",
    "CAM 2 ISO GA1","CAM 2 ISO GA2",
    "CAM 3 ISO GA1","CAM 3 ISO GA2",
    "CAM 4 ISO GA1","CAM 4 ISO GA2",
    "CAM 5 ISO GA1","CAM 5 ISO GA2",
    "CAM 6 ISO GA1","CAM 6 ISO GA2",
    "CAM 7 ISO GA1","CAM 7 ISO GA2",
    "CAM 8 ISO GA1","CAM 8 ISO GA2",
    "CAM 9 ISO GA1","CAM 9 ISO GA2",
    "CAM 10 ISO GA1","CAM 10 ISO GA2",
    "CAM 11 ISO GA1","CAM 11 ISO GA2",
  ],
};
