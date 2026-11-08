import apiClient from '@/utils/apiClient';
import type {
  AddTicketCommentBody,
  AssignTicketBody,
  BitTicketAssignee,
  BitTicketComment,
  BitTicketDetail,
  BitTicketListItem,
  BitTicketListParams,
  BitTicketReport,
  BitTicketSummary,
  CreateBitTicket,
  PagedResult,
  SetOnAirBody,
  SetTicketStatusBody,
  UpdateBitTicket,
} from '@/bit_workflow/types/ticket';

const BASE = '/api/bit/tickets';

/** Arrays become comma lists; empty / undefined values are omitted. */
function serializeParams(params: BitTicketListParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value.join(',');
    } else {
      out[key] = value as string | number | boolean;
    }
  }
  return out;
}

export const bitTicketApi = {
  list: async (params: BitTicketListParams): Promise<PagedResult<BitTicketListItem>> => {
    const response = await apiClient.get<PagedResult<BitTicketListItem>>(BASE, {
      params: serializeParams(params),
    });
    return response.data;
  },

  summary: async (): Promise<BitTicketSummary> => {
    const response = await apiClient.get<BitTicketSummary>(`${BASE}/summary`);
    return response.data;
  },

  get: async (id: number): Promise<BitTicketDetail> => {
    const response = await apiClient.get<BitTicketDetail>(`${BASE}/${id}`);
    return response.data;
  },

  create: async (body: CreateBitTicket): Promise<BitTicketDetail> => {
    const response = await apiClient.post<BitTicketDetail>(BASE, body);
    return response.data;
  },

  update: async (id: number, body: UpdateBitTicket): Promise<BitTicketDetail> => {
    const response = await apiClient.put<BitTicketDetail>(`${BASE}/${id}`, body);
    return response.data;
  },

  setStatus: async (id: number, body: SetTicketStatusBody): Promise<BitTicketDetail> => {
    const response = await apiClient.patch<BitTicketDetail>(`${BASE}/${id}/status`, body);
    return response.data;
  },

  assign: async (id: number, userId: number | null): Promise<BitTicketDetail> => {
    const body: AssignTicketBody = { userId };
    const response = await apiClient.patch<BitTicketDetail>(`${BASE}/${id}/assign`, body);
    return response.data;
  },

  addComment: async (id: number, body: AddTicketCommentBody): Promise<BitTicketComment> => {
    const response = await apiClient.post<BitTicketComment>(`${BASE}/${id}/comments`, body);
    return response.data;
  },

  setOnAir: async (id: number, body: SetOnAirBody): Promise<BitTicketDetail> => {
    const response = await apiClient.patch<BitTicketDetail>(`${BASE}/${id}/on-air`, body);
    return response.data;
  },

  follow: async (id: number): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/follow`);
  },

  unfollow: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}/follow`);
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** Uploads one file and returns its stored URL. */
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(`${BASE}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.url;
  },

  assignees: async (): Promise<BitTicketAssignee[]> => {
    const response = await apiClient.get<BitTicketAssignee[]>(`${BASE}/assignees`);
    return response.data;
  },

  reports: async (from: string, to: string): Promise<BitTicketReport> => {
    const response = await apiClient.get<BitTicketReport>(`${BASE}/reports`, { params: { from, to } });
    return response.data;
  },
};
