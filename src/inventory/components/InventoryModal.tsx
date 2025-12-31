import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import type { InventoryItem, Category, CreateInventoryItemDto, UpdateInventoryItemDto } from '../types/inventory';
import { apiInventoryService } from '../services/apiInventoryService';
import { useToast } from '@/contexts/ToastContext';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingItem: InventoryItem | null;
  categories: Category[];
  existingItems: InventoryItem[];
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  categories,
  existingItems
}) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState<CreateInventoryItemDto & { isActive: boolean }>({
    categoryId: 0,
    itemName: '',
    model: '',
    totalQty: 0,
    qtyUnit: '',
    notes: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editingItem) {
      setFormData({
        categoryId: editingItem.categoryId,
        itemName: editingItem.itemName,
        model: editingItem.model || '',
        totalQty: editingItem.totalQty,
        qtyUnit: editingItem.qtyUnit || '',
        notes: editingItem.notes || '',
        isActive: editingItem.isActive
      });
    } else {
      setFormData({
        categoryId: 0,
        itemName: '',
        model: '',
        totalQty: 0,
        qtyUnit: '',
        notes: '',
        isActive: true
      });
    }
    setErrors({});
  }, [editingItem, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.categoryId || formData.categoryId === 0) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }

    if (formData.totalQty < 0) {
      newErrors.totalQty = 'Quantity must be 0 or greater';
    }

    if (isNaN(formData.totalQty)) {
      newErrors.totalQty = 'Quantity must be a valid number';
    }

    const duplicate = existingItems.find(
      item =>
        item.id !== editingItem?.id &&
        item.categoryId === formData.categoryId &&
        item.itemName.toLowerCase() === formData.itemName.toLowerCase() &&
        (item.model || '').toLowerCase() === (formData.model || '').toLowerCase()
    );

    if (duplicate) {
      newErrors.duplicate = 'An item with the same category, name, and model already exists';
      showToast('Duplicate item detected', 'error');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      if (editingItem) {
        const updateDto: UpdateInventoryItemDto = {
          categoryId: formData.categoryId,
          itemName: formData.itemName,
          model: formData.model,
          totalQty: formData.totalQty,
          qtyUnit: formData.qtyUnit,
          notes: formData.notes,
          isActive: formData.isActive
        };
        await apiInventoryService.update(editingItem.id, updateDto);
        showToast('Item updated successfully', 'success');
      } else {
        const createDto: CreateInventoryItemDto = {
          categoryId: formData.categoryId,
          itemName: formData.itemName,
          model: formData.model,
          totalQty: formData.totalQty,
          qtyUnit: formData.qtyUnit,
          notes: formData.notes
        };
        await apiInventoryService.create(createDto);
        showToast('Item added successfully', 'success');
      }
      onSave();
    } catch (error: any) {
      console.error('Failed to save item:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save item';
      showToast(errorMessage, 'error');

      if (error.response?.status === 400 && error.response?.data?.message) {
        setErrors({ ...errors, apiError: error.response.data.message });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          <DialogDescription>
            {editingItem
              ? 'Update the inventory item details below'
              : 'Fill in the details to add a new inventory item'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="categoryId">
              Category <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.categoryId.toString()}
              onValueChange={(value) =>
                setFormData({ ...formData, categoryId: parseInt(value) })
              }
            >
              <SelectTrigger id="categoryId" className={errors.categoryId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.categoryId && (
              <p className="text-sm text-red-500">{errors.categoryId}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="itemName">
              Item Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="itemName"
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              placeholder="e.g., SONY FS7 FULLKIT"
              className={errors.itemName ? 'border-red-500' : ''}
            />
            {errors.itemName && (
              <p className="text-sm text-red-500">{errors.itemName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model (Optional)</Label>
            <Input
              id="model"
              type="text"
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="e.g., SONY PXW-FS7M2K"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalQty">
              Total Quantity <span className="text-red-500">*</span>
            </Label>
            <Input
              id="totalQty"
              type="number"
              min="0"
              value={formData.totalQty}
              onChange={(e) =>
                setFormData({ ...formData, totalQty: parseInt(e.target.value) || 0 })
              }
              className={errors.totalQty ? 'border-red-500' : ''}
            />
            {errors.totalQty && (
              <p className="text-sm text-red-500">{errors.totalQty}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="qtyUnit">Unit (Optional)</Label>
            <Input
              id="qtyUnit"
              type="text"
              value={formData.qtyUnit}
              onChange={(e) => setFormData({ ...formData, qtyUnit: e.target.value })}
              placeholder="e.g., pcs, set, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between border border-border rounded-lg p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Set whether this item is currently active
              </p>
            </div>
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
          </div>

          {errors.duplicate && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{errors.duplicate}</p>
            </div>
          )}

          {errors.apiError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-700 dark:text-red-400">{errors.apiError}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingItem ? 'Update Item' : 'Add Item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
