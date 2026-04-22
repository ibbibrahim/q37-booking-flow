import type {
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemsStatusFilter
} from '../types/inventory';
import type { InventoryService } from './inventoryService';
import apiClient from '@/utils/apiClient';

class ApiInventoryService implements InventoryService {
  async getAll(status: InventoryItemsStatusFilter = 'active'): Promise<InventoryItem[]> {
    const params: Record<string, boolean> = {};
    if (status === 'all') {
      params.includeInactive = true;
    } else if (status === 'active') {
      params.includeInactive = false;
    } else {
      params.includeInactive = true;
      params.isActive = false;
    }

    try {
      const response = await apiClient.get<InventoryItem[]>('/api/inventory/items', {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch inventory items:', error);
      throw error;
    }
  }

  async getById(id: number): Promise<InventoryItem> {
    try {
      const response = await apiClient.get<InventoryItem>(`/api/inventory/items/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch inventory item ${id}:`, error);
      throw error;
    }
  }

  async create(item: CreateInventoryItemDto): Promise<InventoryItem> {
    try {
      const response = await apiClient.post<InventoryItem>('/api/inventory/items', item);
      return response.data;
    } catch (error) {
      console.error('Failed to create inventory item:', error);
      throw error;
    }
  }

  async update(id: number, item: UpdateInventoryItemDto): Promise<InventoryItem> {
    try {
      const response = await apiClient.put<InventoryItem>(`/api/inventory/items/${id}`, item);
      return response.data;
    } catch (error) {
      console.error(`Failed to update inventory item ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      await apiClient.delete(`/api/inventory/items/${id}`);
    } catch (error) {
      console.error(`Failed to delete inventory item ${id}:`, error);
      throw error;
    }
  }

  async toggleActive(id: number): Promise<InventoryItem> {
    try {
      const response = await apiClient.patch<InventoryItem>(`/api/inventory/items/${id}/toggle-active`);
      return response.data;
    } catch (error) {
      console.error(`Failed to toggle active status for item ${id}:`, error);
      throw error;
    }
  }
}

export const apiInventoryService = new ApiInventoryService();
