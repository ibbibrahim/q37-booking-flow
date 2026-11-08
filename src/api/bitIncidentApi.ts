import apiClient from '@/utils/apiClient';
import type {
  IncidentRegisterItem,
  IncidentRegisterParams,
  IncidentReport,
  SaveIncidentReport,
} from '@/bit_workflow/types/incident';
import type { PagedResult } from '@/bit_workflow/types/ticket';

const TICKETS = '/api/bit/tickets';
const REGISTER = '/api/bit/incident-reports';

function reportPath(ticketId: number): string {
  return `${TICKETS}/${ticketId}/incident-report`;
}

export const bitIncidentApi = {
  getReport: async (ticketId: number): Promise<IncidentReport> => {
    const response = await apiClient.get<IncidentReport>(reportPath(ticketId));
    return response.data;
  },

  saveReport: async (ticketId: number, body: SaveIncidentReport): Promise<IncidentReport> => {
    const response = await apiClient.put<IncidentReport>(reportPath(ticketId), body);
    return response.data;
  },

  submitReport: async (ticketId: number, body: SaveIncidentReport): Promise<IncidentReport> => {
    const response = await apiClient.post<IncidentReport>(`${reportPath(ticketId)}/submit`, { ...body, confirm: true });
    return response.data;
  },

  /** Fetched through apiClient so the Bearer header is sent. */
  fetchPdfBlob: async (ticketId: number): Promise<Blob> => {
    const response = await apiClient.get<Blob>(`${reportPath(ticketId)}/pdf`, { responseType: 'blob' });
    return response.data;
  },

  downloadPdf: async (ticketId: number, fileBase: string): Promise<void> => {
    const blob = await bitIncidentApi.fetchPdfBlob(ticketId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileBase}-incident-report.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  },

  previewPdf: async (ticketId: number, target?: Window | null): Promise<void> => {
    const blob = await bitIncidentApi.fetchPdfBlob(ticketId);
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    if (target && !target.closed) target.location.href = url;
    else window.open(url, '_blank');
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  },

  listRegister: async (params: IncidentRegisterParams): Promise<PagedResult<IncidentRegisterItem>> => {
    const clean: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      clean[k] = v as string | number;
    }
    const response = await apiClient.get<PagedResult<IncidentRegisterItem>>(REGISTER, { params: clean });
    return response.data;
  },
};
