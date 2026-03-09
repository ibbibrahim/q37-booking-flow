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

  // Editor fields
  editorAssigned?: string;
  editRoomNumber?: string;
  availableDatetime?: string; // ISO string
  editorComments?: string;

  // Status
  status: 'Pending' | 'Acknowledged' | 'Completed' | 'Cancelled';

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
  createdBy?: number;
}

export interface UpdateEditorAssignmentDto {
  editorAssigned: string;
  editRoomNumber: string;
  availableDatetime: string;
  editorComments?: string;
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
  page?: number;
  pageSize?: number;
}

export interface EditingSearchResult {
  total: number;
  page: number;
  pageSize: number;
  items: EditingRequest[];
}
