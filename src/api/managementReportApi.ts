import apiClient from '@/utils/apiClient';
import type { ManagementReport } from '@/bit_workflow/types/managementReport';

const BASE = '/api/reports/management';

export const managementReportApi = {
  get: async (month: string): Promise<ManagementReport> => {
    const response = await apiClient.get<ManagementReport>(BASE, { params: { month } });
    return response.data;
  },

  /** Fetched through apiClient so the Bearer header is sent. */
  downloadPdf: async (month: string, section: 'availability' | 'operations'): Promise<void> => {
    const response = await apiClient.get<Blob>(`${BASE}/pdf`, { params: { month, section }, responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QBC-${section === 'availability' ? 'Channel-Availability' : 'Channel-Operations'}-Report-${month}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  },
};
