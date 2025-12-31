import type { Category } from '../types/inventory';
import type { CategoriesService } from './categoriesService';
import apiClient from '@/utils/apiClient';

class ApiCategoriesService implements CategoriesService {
  async getAll(includeInactive: boolean = false): Promise<Category[]> {
    try {
      const response = await apiClient.get<Category[]>('/api/inventory/categories', {
        params: { includeInactive }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      throw error;
    }
  }
}

export const apiCategoriesService = new ApiCategoriesService();
