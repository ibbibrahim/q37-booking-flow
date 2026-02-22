import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { InventoryItem, InventoryItemWithCategory, Category } from '../types/inventory';
import { apiInventoryService } from '../services/apiInventoryService';
import { apiCategoriesService } from '../services/apiCategoriesService';
import { InventoryModal } from './InventoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useToast } from '@/contexts/ToastContext';

type SortField = 'categoryName' | 'itemName' | 'totalQty';
type SortDirection = 'asc' | 'desc';

export const InventoryList: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('itemName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData] = await Promise.all([
        apiInventoryService.getAll(false),
        apiCategoriesService.getAll(false)
      ]);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error: any) {
      console.error('Failed to load inventory data:', error);
      if (error.response?.status === 401) {
        showToast('Unauthorized', 'error');
      } else {
        const errorMessage = error.response?.data?.message || 'Failed to load inventory data';
        showToast(errorMessage, 'error');
      }
      setItems([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const itemsWithCategory = useMemo((): InventoryItemWithCategory[] => {
    return items.map(item => ({
      ...item,
      categoryName: item.categoryName || 'Unknown Category'
    }));
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = itemsWithCategory;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        item =>
          item.itemName.toLowerCase().includes(search) ||
          (item.model && item.model.toLowerCase().includes(search))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.categoryId === parseInt(categoryFilter));
    }

    filtered.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      if (sortField === 'categoryName') {
        aVal = a.categoryName;
        bVal = b.categoryName;
      } else if (sortField === 'itemName') {
        aVal = a.itemName;
        bVal = b.itemName;
      } else if (sortField === 'totalQty') {
        aVal = a.totalQty;
        bVal = b.totalQty;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return filtered;
  }, [itemsWithCategory, searchTerm, categoryFilter, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (item: InventoryItem) => {
    setDeletingItem(item);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;

    try {
      await apiInventoryService.remove(deletingItem.id);
      await loadData();
      showToast('Item deleted successfully', 'success');
      setDeletingItem(null);
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete item';
      showToast(errorMessage, 'error');
    }
  };

  const handleToggleActive = async (item: InventoryItem) => {
    try {
      await apiInventoryService.toggleActive(item.id);
      await loadData();
      showToast(
        item.isActive ? 'Item deactivated successfully' : 'Item activated successfully',
        'success'
      );
    } catch (error: any) {
      console.error('Failed to toggle item status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update item status';
      showToast(errorMessage, 'error');
    }
  };

  const handleModalSave = async () => {
    await loadData();
    setIsModalOpen(false);
    setEditingItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-card-foreground">Inventory Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage technical store inventory items</p>
        </div>
        <Button onClick={handleAddItem} className="bg-primary hover:bg-primary/90 shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Item</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by item name or model..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-card-foreground cursor-pointer hover:bg-muted/70 whitespace-nowrap"
                  onClick={() => handleSort('categoryName')}
                >
                  Category {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-card-foreground cursor-pointer hover:bg-muted/70 whitespace-nowrap"
                  onClick={() => handleSort('itemName')}
                >
                  Item Name {sortField === 'itemName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Model
                </th>
                <th
                  className="text-left py-3 px-4 text-sm font-semibold text-card-foreground cursor-pointer hover:bg-muted/70 whitespace-nowrap"
                  onClick={() => handleSort('totalQty')}
                >
                  Total Qty {sortField === 'totalQty' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Active
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Last Updated
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No items found
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm text-card-foreground">
                      {item.categoryName}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-card-foreground">
                      {item.itemName}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {item.model || '—'}
                    </td>
                    <td className="py-3 px-4 text-sm text-card-foreground">
                      {item.totalQty}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {item.isActive ? (
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(item)}
                          className="text-xs"
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <button
                          onClick={() => handleEditItem(item)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-card-foreground"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredAndSortedItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedItems.length)} of{' '}
              {filteredAndSortedItems.length} items
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <InventoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleModalSave}
        editingItem={editingItem}
        categories={categories}
        existingItems={items}
      />

      <DeleteConfirmModal
        isOpen={!!deletingItem}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deletingItem?.itemName || ''}
      />
    </div>
  );
};
