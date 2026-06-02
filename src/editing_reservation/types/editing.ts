// Session entity (editor assignment per session)
export interface EditingSession {
  id: number;
  editingRequestId: number;
  sessionNumber: number; // 1, 2, or 3
  requestedDate?: string; // ISO string (date only) - producer's preferred date
  editorId?: number;
  editorName?: string; // Display name from backend
  editRoomNumber?: string;
  availableDatetime?: string; // ISO string
  sessionDurationMinutes?: number;
  editorComments?: string;
  createdBy?: number;
  createdAt: string;
  updatedBy?: number;
  updatedAt: string;
  // Assignment metadata
  assignedBy?: number;
  assignedByName?: string;
  assignedAt?: string;
  // Report fields
  actualStartTime?: string; // HH:mm format
  actualEndTime?: string;
  workCompletedPercentage?: number;
  workDescription?: string;
  hadDelay?: boolean;
  delayReason?: string;
  hadTechnicalIssues?: boolean;
  technicalIssueDescription?: string;
  sessionComments?: string;
  reportSubmittedAt?: string;
  reportSubmittedBy?: number;
  reportSubmitterName?: string;
}

export interface SubmitSessionReportDto {
  actualStartTime: string; // HH:mm:ss (TimeSpan format)
  actualEndTime: string;
  workCompletedPercentage: number;
  workDescription?: string;
  hadDelay: boolean;
  delayReason?: string;
  hadTechnicalIssues: boolean;
  technicalIssueDescription?: string;
  sessionComments?: string;
}

export interface SessionRequest {
  sessionNumber: number; // 1, 2, or 3
  requestedDate: string;
}

// Main entity
export interface EditingRequest {
  id: number;

  // Producer fields
  programName: string;
  producerName: string;
  producerContact: string;
  rushesSelectedCloudUx: boolean;
  approximateDuration: string;
  gfxReady: boolean;
  producerComments?: string;

  // Sessions support
  sessionsPerWeek?: number; // 1, 2, or 3 (default 1 for backward compat)
  editingSessions?: EditingSession[];

  // Legacy editor fields (kept for backward compatibility with existing API)
  editorId?: number;
  editorName?: string;
  editRoomNumber?: string;
  availableDatetime?: string;
  editorComments?: string;

  // Status
  status: 'Pending' | 'Acknowledged' | 'Completed' | 'Cancelled' | 'Rejected';

  // Manual block
  isManualBlock?: boolean;

  // Rejection
  rejectionReason?: string;
  rejectedBy?: number;
  rejectedByName?: string;
  rejectedAt?: string;

  // Cancellation
  cancellationReason?: string;

  // Audit
  createdBy?: number;
  createdByUser?: {
    id: number;
    username: string;
    displayName?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
}

// DTOs for API calls
export interface CreateEditingRequestDto {
  programName: string;
  producerName: string;
  producerContact: string;
  rushesSelectedCloudUx: boolean;
  approximateDuration?: string;
  gfxReady: boolean;
  producerComments?: string;
  sessionsPerWeek?: number;
  sessionRequests: SessionRequest[];
  createdBy?: number;
}

export interface UpdateEditorAssignmentDto {
  sessionNumber: number;
  editorId?: number;
  editRoomNumber?: string;
  availableDatetime?: string;
  sessionDurationMinutes?: number;
  editorComments?: string;
  unassign?: boolean;
}

export interface UpdateEditingStatusDto {
  status: string;
  comment?: string;
  changedBy?: number;
}

export interface CancelEditingRequestDto {
  cancellationReason: string;
  cancelledBy?: number;
}

export interface EditingSearchRequest {
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
  status?: string;
  /** When set, limits results to requests assigned to this editor (edit suite search). */
  editorId?: number;
  page?: number;
  pageSize?: number;
}

export interface EditingSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: EditingRequest[];
}

export interface CheckAvailabilityDto {
  editorId: number;
  editRoomNumber: string;
  sessionStartDatetime: string;
  sessionDurationMinutes: number;
  excludeSessionId?: number;
}

export interface ConflictDto {
  type: 'room' | 'editor';
  message: string;
}

export interface AvailabilityResultDto {
  isAvailable: boolean;
  conflicts: ConflictDto[];
}

export interface ManualBlockSessionDto {
  sessionNumber: number;
  editorId: number;
  editRoomNumber: string;
  availableDatetime: string;
  sessionDurationMinutes: number;
  editorComments?: string;
}

export interface CreateManualBlockDto {
  programName: string;
  approximateDuration: string;
  sessionsPerWeek: number;
  sessions: ManualBlockSessionDto[];
}

export interface UpdateManualBlockDto {
  programName: string;
  approximateDuration: string;
  sessionsPerWeek: number;
  sessions: ManualBlockSessionDto[];
}

export interface RejectEditingRequestDto {
  rejectionReason: string;
}
