import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';
import type {
  InventoryItem,
  InventoryItemWithCategory,
  Category,
  InventoryItemsStatusFilter
} from '../types/inventory';
import { apiInventoryService } from '../services/apiInventoryService';
import { apiCategoriesService } from '../services/apiCategoriesService';
import { InventoryModal } from './InventoryModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { useToast } from '@/contexts/ToastContext';

type SortField = 'categoryName' | 'itemName' | 'totalQty';
type SortDirection = 'asc' | 'desc';

const headClass = 'h-10 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground';
const GRID_CLASS =
  'min-w-[900px] [&_th]:border-r [&_td]:border-r [&_th]:border-border/70 [&_td]:border-border/70 [&_th:last-child]:border-r-0 [&_td:last-child]:border-r-0';

export const InventoryList: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<InventoryItemsStatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('itemName');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const isInitialLoadRef = useRef(true);

  const loadData = useCallback(async () => {
    if (isInitialLoadRef.current) {
      setLoading(true);
    }
    try {
      const [itemsData, categoriesData] = await Promise.all([
        apiInventoryService.getAll(statusFilter),
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
      isInitialLoadRef.current = false;
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
      if (statusFilter === 'all' || statusFilter === 'inactive') {
        const byActive = Number(a.isActive) - Number(b.isActive);
        if (byActive !== 0) {
          return byActive;
        }
      }

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
  }, [itemsWithCategory, searchTerm, categoryFilter, statusFilter, sortField, sortDirection]);

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
          <div className="w-full md:w-64">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as InventoryItemsStatusFilter);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table className={GRID_CLASS}>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead
                  className={cn(headClass, 'cursor-pointer select-none hover:text-foreground', 'w-[180px]')}
                  onClick={() => handleSort('categoryName')}
                >
                  Category {sortField === 'categoryName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className={cn(headClass, 'cursor-pointer select-none hover:text-foreground')}
                  onClick={() => handleSort('itemName')}
                >
                  Item Name {sortField === 'itemName' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className={cn(headClass, 'w-[180px]')}>Model</TableHead>
                <TableHead
                  className={cn(headClass, 'cursor-pointer select-none hover:text-foreground', 'w-[110px]')}
                  onClick={() => handleSort('totalQty')}
                >
                  Total Qty {sortField === 'totalQty' && (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className={cn(headClass, 'w-[110px]')}>Active</TableHead>
                <TableHead className={cn(headClass, 'w-[130px]')}>Last Updated</TableHead>
                <TableHead className={cn(headClass, 'w-[240px]')}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => (
                  <TableRow
                    key={item.id}
                    className="group transition-colors hover:bg-muted/30"
                  >
                    <TableCell className="py-3 text-sm">{item.categoryName}</TableCell>
                    <TableCell className="py-3 text-sm font-medium text-card-foreground">
                      {item.itemName}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {item.model || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                    <TableCell className="py-3 text-sm tabular-nums">{item.totalQty}</TableCell>
                    <TableCell className="py-3">
                      <StatusPill tone={item.isActive ? 'success' : 'muted'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </StatusPill>
                    </TableCell>
                    <TableCell className="py-3 text-xs tabular-nums text-muted-foreground">
                      {new Date(item.updatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
