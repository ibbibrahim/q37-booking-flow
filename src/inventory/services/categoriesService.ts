import type { Category } from '../types/inventory';

export interface CategoriesService {
  getAll(includeInactive?: boolean): Promise<Category[]>;
}
