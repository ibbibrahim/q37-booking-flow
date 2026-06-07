import apiClient from '@/utils/apiClient';
import type {
  EditingRequest,
  CreateEditingRequestDto,
  BatchUpdateEditorAssignmentDto,
  UpdateEditingStatusDto,
  CancelEditingRequestDto,
  EditingSearchRequest,
  EditingSearchResult,
  CheckAvailabilityDto,
  AvailabilityResultDto,
  SubmitSessionReportDto,
  CreateManualBlockDto,
  UpdateManualBlockDto,
  RejectEditingRequestDto,
} from '../types/editing';

const API_BASE = '/api/editing/requests';

const serializeSearchRequest = (dto: EditingSearchRequest): Record<string, unknown> => {
  const payload: Record<string, unknown> = { ...dto };
  if (dto.dateFrom) payload.dateFrom = dto.dateFrom.toISOString();
  if (dto.dateTo) payload.dateTo = dto.dateTo.toISOString();
  if (dto.includeManualBlocks !== undefined) {
    payload.includeManualBlocks = dto.includeManualBlocks;
  }
  return payload;
};

const serializeCreateDto = (dto: CreateEditingRequestDto): Record<string, unknown> => {
  return {
    ...dto,
    sessionRequests: dto.sessionRequests.map((sr) => ({
      sessionNumber: sr.sessionNumber,
      requestedDate: `${sr.requestedDate}:00.000Z`,
    })),
  };
};

const serializeManualBlockDto = (
  dto: CreateManualBlockDto | UpdateManualBlockDto
): Record<string, unknown> => {
  return {
    ...dto,
    sessions: dto.sessions.map((s) => ({
      ...s,
      availableDatetime: s.availableDatetime.includes('Z')
        ? s.availableDatetime
        : `${s.availableDatetime}:00.000Z`,
    })),
  };
};

export const editingApi = {
  // Get all requests
  getAll: async (): Promise<EditingRequest[]> => {
    const { data } = await apiClient.get(API_BASE);
    return data as EditingRequest[];
  },

  // Search for dashboard (uses editing search API)
  searchForDashboard: async (dateFrom: Date, dateTo: Date): Promise<EditingRequest[]> => {
    const payload = serializeSearchRequest({
      dateFrom,
      dateTo,
      page: 1,
      pageSize: 100,
    });
    const { data } = await apiClient.post<EditingSearchResult>(
      `${API_BASE}/search`,
      payload
    );
    return (data?.items ?? []) as EditingRequest[];
  },

  // Get by ID
  getById: async (id: number): Promise<EditingRequest> => {
    const { data } = await apiClient.get(`${API_BASE}/${id}`);
    return data as EditingRequest;
  },

  // Create (Producer)
  create: async (dto: CreateEditingRequestDto): Promise<EditingRequest> => {
    const payload = serializeCreateDto(dto);
    const { data } = await apiClient.post(API_BASE, payload);
    return data as EditingRequest;
  },

  // Update (Producer)
  update: async (id: number, dto: CreateEditingRequestDto): Promise<EditingRequest> => {
    const payload = serializeCreateDto(dto);
    const { data } = await apiClient.put(`${API_BASE}/${id}`, payload);
    return data as EditingRequest;
  },

  // Delete
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`${API_BASE}/${id}`);
  },

  // Update status
  updateStatus: async (id: number, dto: UpdateEditingStatusDto): Promise<EditingRequest> => {
    const { data } = await apiClient.patch(`${API_BASE}/${id}/status`, dto);
    return data as EditingRequest;
  },

  // Editor assignment (batch — one email per save)
  updateEditorAssignments: async (
    id: number,
    dto: BatchUpdateEditorAssignmentDto
  ): Promise<EditingRequest> => {
    const { data } = await apiClient.patch(`${API_BASE}/${id}/editor-assignments`, dto);
    return data as EditingRequest;
  },

  // Cancel
  cancel: async (id: number, dto: CancelEditingRequestDto): Promise<EditingRequest> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/cancel`, dto);
    return data as EditingRequest;
  },

  // Search
  search: async (dto: EditingSearchRequest): Promise<EditingSearchResult> => {
    const payload = serializeSearchRequest(dto);
    const { data } = await apiClient.post(`${API_BASE}/search`, payload);
    return data as EditingSearchResult;
  },

  // Editor queue
  getEditorQueue: async (): Promise<EditingRequest[]> => {
    const { data } = await apiClient.get(`${API_BASE}/editor-queue`);
    return data as EditingRequest[];
  },

  // Check availability
  checkAvailability: async (dto: CheckAvailabilityDto): Promise<AvailabilityResultDto> => {
    const { data } = await apiClient.post<AvailabilityResultDto>(`${API_BASE}/check-availability`, dto);
    return data;
  },

  // Submit session report
  submitSessionReport: async (
    requestId: number,
    sessionNumber: number,
    dto: SubmitSessionReportDto
  ): Promise<EditingRequest> => {
    const { data } = await apiClient.post(
      `${API_BASE}/${requestId}/sessions/${sessionNumber}/submit-report`,
      dto
    );
    return data as EditingRequest;
  },

  // Manual block
  createManualBlock: async (dto: CreateManualBlockDto): Promise<EditingRequest> => {
    const payload = serializeManualBlockDto(dto);
    const { data } = await apiClient.post(`${API_BASE}/manual-block`, payload);
    return data as EditingRequest;
  },

  updateManualBlock: async (id: number, dto: UpdateManualBlockDto): Promise<EditingRequest> => {
    const payload = serializeManualBlockDto(dto);
    const { data } = await apiClient.put(`${API_BASE}/manual-block/${id}`, payload);
    return data as EditingRequest;
  },

  // Reject request
  rejectRequest: async (id: number, dto: RejectEditingRequestDto): Promise<EditingRequest> => {
    const { data } = await apiClient.post(`${API_BASE}/${id}/reject`, dto);
    return data as EditingRequest;
  },
};
