import apiClient from '@/utils/apiClient';
import type { BitVendor, SaveBitVendor } from '@/bit_workflow/types/vendor';

const BASE = '/api/bit/vendors';

export const bitVendorApi = {
  /** All vendors, ordered by displayOrder. */
  list: async (): Promise<BitVendor[]> => {
    const response = await apiClient.get<BitVendor[]>(BASE);
    return response.data;
  },

  create: async (body: SaveBitVendor): Promise<BitVendor> => {
    const response = await apiClient.post<BitVendor>(BASE, body);
    return response.data;
  },

  update: async (id: number, body: SaveBitVendor): Promise<BitVendor> => {
    const response = await apiClient.put<BitVendor>(`${BASE}/${id}`, body);
    return response.data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** Persists the full vendor order — `ids` is every vendor id in the new display order. */
  reorder: async (ids: number[]): Promise<void> => {
    await apiClient.put(`${BASE}/reorder`, { ids });
  },
};
