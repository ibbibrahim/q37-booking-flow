/** Used when listing items: all, active only, or inactive only. */
export type InventoryItemsStatusFilter = 'all' | 'active' | 'inactive';

export interface Category {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface InventoryItem {
  id: number;
  categoryId: number;
  categoryName: string;
  itemName: string;
  model: string | null;
  totalQty: number;
  qtyUnit: string | null;
  notes: string | null;
  isActive: boolean;
  updatedAt: string;
}

export interface InventoryItemWithCategory extends InventoryItem {
  categoryName: string;
}

export interface CreateInventoryItemDto {
  categoryId: number;
  itemName: string;
  model?: string;
  totalQty: number;
  qtyUnit?: string;
  notes?: string;
}

export interface UpdateInventoryItemDto {
  categoryId: number;
  itemName: string;
  model?: string;
  totalQty: number;
  qtyUnit?: string;
  notes?: string;
  isActive: boolean;
}
