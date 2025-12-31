import type { InventoryItem, CreateInventoryItemDto, UpdateInventoryItemDto } from '../types/inventory';

export interface InventoryService {
  getAll(includeInactive?: boolean): Promise<InventoryItem[]>;
  create(item: CreateInventoryItemDto): Promise<InventoryItem>;
  update(id: number, item: UpdateInventoryItemDto): Promise<InventoryItem>;
  remove(id: number): Promise<void>;
  toggleActive(id: number): Promise<InventoryItem>;
}
