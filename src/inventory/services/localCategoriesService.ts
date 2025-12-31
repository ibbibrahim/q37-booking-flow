import type { Category } from '../types/inventory';
import type { CategoriesService } from './categoriesService';
import { categoriesSeed } from '../data/categoriesSeed';

const STORAGE_KEY = 'inventory_categories';

class LocalCategoriesService implements CategoriesService {
  private initializeStorage(): void {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categoriesSeed));
    }
  }

  async getAll(includeInactive: boolean = false): Promise<Category[]> {
    this.initializeStorage();
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const categories: Category[] = JSON.parse(data);
    if (includeInactive) {
      return categories;
    }
    return categories.filter(cat => cat.isActive);
  }
}

export const localCategoriesService = new LocalCategoriesService();
