import type { Category } from '../types/inventory';

export interface CategoriesService {
  getAll(): Promise<Category[]>;
}
