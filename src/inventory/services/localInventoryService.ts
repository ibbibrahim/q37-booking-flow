import type {
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemsStatusFilter
} from '../types/inventory';
import type { InventoryService } from './inventoryService';
import { inventorySeed } from '../data/inventorySeed';

const STORAGE_KEY = 'inventory_items';

class LocalInventoryService implements InventoryService {
  private initializeStorage(): void {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inventorySeed));
    }
  }

  private getItems(): InventoryItem[] {
    this.initializeStorage();
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  }

  private saveItems(items: InventoryItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async getAll(status: InventoryItemsStatusFilter = 'active'): Promise<InventoryItem[]> {
    const items = this.getItems();
    if (status === 'all') {
      return items;
    }
    if (status === 'active') {
      return items.filter(item => item.isActive);
    }
    return items.filter(item => !item.isActive);
  }

  async create(item: CreateInventoryItemDto): Promise<InventoryItem> {
    const items = this.getItems();
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;

    const newItem: InventoryItem = {
      id: newId,
      categoryId: item.categoryId,
      categoryName: 'Unknown Category',
      itemName: item.itemName,
      model: item.model || null,
      totalQty: item.totalQty,
      qtyUnit: item.qtyUnit || null,
      notes: item.notes || null,
      isActive: true,
      updatedAt: new Date().toISOString()
    };

    items.push(newItem);
    this.saveItems(items);
    return newItem;
  }

  async update(id: number, item: UpdateInventoryItemDto): Promise<InventoryItem> {
    const items = this.getItems();
    const index = items.findIndex(i => i.id === id);

    if (index === -1) {
      throw new Error('Item not found');
    }

    const updatedItem: InventoryItem = {
      id,
      categoryId: item.categoryId,
      categoryName: items[index].categoryName,
      itemName: item.itemName,
      model: item.model || null,
      totalQty: item.totalQty,
      qtyUnit: item.qtyUnit || null,
      notes: item.notes || null,
      isActive: item.isActive,
      updatedAt: new Date().toISOString()
    };

    items[index] = updatedItem;
    this.saveItems(items);
    return updatedItem;
  }

  async remove(id: number): Promise<void> {
    const items = this.getItems();
    const filteredItems = items.filter(i => i.id !== id);
    this.saveItems(filteredItems);
  }

  async toggleActive(id: number): Promise<InventoryItem> {
    const items = this.getItems();
    const index = items.findIndex(i => i.id === id);

    if (index === -1) {
      throw new Error('Item not found');
    }

    items[index].isActive = !items[index].isActive;
    items[index].updatedAt = new Date().toISOString();
    this.saveItems(items);
    return items[index];
  }
}

export const localInventoryService = new LocalInventoryService();
