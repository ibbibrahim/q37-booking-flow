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
  itemName: string;
  model: string | null;
  totalQty: number;
  unit: string | null;
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
  unit?: string;
  notes?: string;
  isActive: boolean;
}

export interface UpdateInventoryItemDto extends CreateInventoryItemDto {
  id: number;
}
