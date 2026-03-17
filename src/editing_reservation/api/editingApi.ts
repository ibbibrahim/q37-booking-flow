import apiClient from '@/utils/apiClient';
import type {
  EditingRequest,
  CreateEditingRequestDto,
  UpdateEditorAssignmentDto,
  UpdateEditingStatusDto,
  CancelEditingRequestDto,
  EditingSearchRequest,
  EditingSearchResult,
  CheckAvailabilityDto,
  AvailabilityResultDto,
  SubmitSessionReportDto,
} from '../types/editing';

const API_BASE = '/api/editing/requests';

const serializeSearchRequest = (dto: EditingSearchRequest): Record<string, unknown> => {
  const payload: Record<string, unknown> = { ...dto };
  if (dto.dateFrom) payload.dateFrom = dto.dateFrom.toISOString();
  if (dto.dateTo) payload.dateTo = dto.dateTo.toISOString();
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

  // Editor assignment
  updateEditorAssignment: async (
    id: number,
    dto: UpdateEditorAssignmentDto
  ): Promise<EditingRequest> => {
    const { data } = await apiClient.patch(`${API_BASE}/${id}/editor-assignment`, dto);
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
};
