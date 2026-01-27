export interface EquipmentRow {
  tempId: string;
  categoryId?: number;
  inventoryItemId?: number;
  quantity: number;
  category?: string;
  item?: string;
  availabilityLoading?: boolean;
  availabilityError?: string;
  exceedsAvailability?: boolean;
}

export function generateTempId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function createEmptyRow(): EquipmentRow {
  return {
    tempId: generateTempId(),
    category: '',
    item: '',
    quantity: 1,
    categoryId: undefined,
    inventoryItemId: undefined
  };
}
