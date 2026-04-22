import type {
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemsStatusFilter
} from '../types/inventory';

export interface InventoryService {
  getAll(status?: InventoryItemsStatusFilter): Promise<InventoryItem[]>;
  create(item: CreateInventoryItemDto): Promise<InventoryItem>;
  update(id: number, item: UpdateInventoryItemDto): Promise<InventoryItem>;
  remove(id: number): Promise<void>;
  toggleActive(id: number): Promise<InventoryItem>;
}
