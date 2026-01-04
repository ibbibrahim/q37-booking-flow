import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Equipment } from '../types/callsheet';
import { DEPARTMENTS } from '../types/callsheet';
import {
  callSheetApi,
  type InventoryCategory,
  type InventoryAvailabilityItem,
  type InventoryAvailabilityResponse
} from '../services/mockCallSheetApi';
import { qatarTimeToUTC } from '../utils/timezone';

interface EquipmentFormProps {
  equipment: Equipment[];
  onAddEquipment: (equipment: Equipment) => void;
  onRemoveEquipment: (id: number) => void;
  departmentsToApprove: string[];
  departmentsToNotify: string[];
  onDepartmentsToApproveChange: (departments: string[]) => void;
  onDepartmentsToNotifyChange: (departments: string[]) => void;
  startDateTime?: string;
  returnDateTime?: string;
  callsheetId?: number;
}

interface EquipmentRow extends Equipment {
  tempId: string;
  availabilityLoading?: boolean;
  availabilityError?: string;
  exceedsAvailability?: boolean;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  equipment,
  onAddEquipment,
  onRemoveEquipment,
  departmentsToApprove,
  departmentsToNotify,
  onDepartmentsToApproveChange,
  onDepartmentsToNotifyChange,
  startDateTime,
  returnDateTime,
  callsheetId
}) => {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [rows, setRows] = useState<EquipmentRow[]>([]);

  const availabilityCache = useRef<Map<string, InventoryAvailabilityResponse>>(new Map());
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const mappedRows: EquipmentRow[] = equipment.map(eq => ({
      ...eq,
      tempId: `temp-${eq.id || Date.now()}-${Math.random()}`
    }));
    setRows(mappedRows);
  }, [equipment]);

  useEffect(() => {
    if (startDateTime && returnDateTime) {
      rows.forEach(row => {
        if (row.categoryId) {
          fetchAvailabilityForRow(row.tempId, row.categoryId);
        }
      });
    }
  }, [startDateTime, returnDateTime]);

  const loadCategories = async () => {
    try {
      const data = await callSheetApi.getInventoryCategories();
      setCategories(data.filter(c => c.isActive));
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const getCacheKey = (categoryId: number): string => {
    const start = startDateTime ? qatarTimeToUTC(startDateTime) : '';
    const end = returnDateTime ? qatarTimeToUTC(returnDateTime) : '';
    return `${start}|${end}|${categoryId}|${callsheetId || ''}`;
  };

  const fetchAvailabilityForRow = useCallback((tempId: string, categoryId: number) => {
    if (!startDateTime || !returnDateTime) return;

    const cacheKey = getCacheKey(categoryId);
    const cached = availabilityCache.current.get(cacheKey);

    if (cached) {
      return;
    }

    const existingTimer = debounceTimers.current.get(tempId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      setRows(prev => prev.map(r =>
        r.tempId === tempId ? { ...r, availabilityLoading: true, availabilityError: undefined } : r
      ));

      try {
        const start = qatarTimeToUTC(startDateTime);
        const end = qatarTimeToUTC(returnDateTime);
        const result = await callSheetApi.getInventoryAvailability(start, end, categoryId, callsheetId);
        availabilityCache.current.set(cacheKey, result);

        setRows(prev => prev.map(r =>
          r.tempId === tempId ? { ...r, availabilityLoading: false } : r
        ));
      } catch (error: any) {
        console.error('Failed to fetch availability:', error);
        setRows(prev => prev.map(r =>
          r.tempId === tempId
            ? { ...r, availabilityLoading: false, availabilityError: 'Failed to load availability' }
            : r
        ));
      }
    }, 300);

    debounceTimers.current.set(tempId, timer);
  }, [startDateTime, returnDateTime, callsheetId]);

  const getAvailabilityForCategory = (categoryId: number): InventoryAvailabilityItem[] => {
    const cacheKey = getCacheKey(categoryId);
    const cached = availabilityCache.current.get(cacheKey);
    return cached?.items || [];
  };

  const handleAddRow = () => {
    const newId = Date.now();
    const newRow: EquipmentRow = {
      id: newId,
      tempId: `new-${newId}-${Math.random()}`,
      category: '',
      item: '',
      quantity: 1,
      categoryId: undefined,
      inventoryItemId: undefined
    };
    setRows([...rows, newRow]);

    const newEquipment: Equipment = {
      id: newId,
      category: '',
      item: '',
      quantity: 1,
      categoryId: undefined,
      inventoryItemId: undefined
    };
    onAddEquipment(newEquipment);
  };

  const handleRemoveRow = (tempId: string) => {
    const row = rows.find(r => r.tempId === tempId);
    if (row && row.id) {
      onRemoveEquipment(row.id);
    }
    setRows(rows.filter(r => r.tempId !== tempId));
  };

  const handleCategoryChange = (tempId: string, categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const row = rows.find(r => r.tempId === tempId);
    if (!row) return;

    setRows(prev => prev.map(r =>
      r.tempId === tempId
        ? {
            ...r,
            categoryId,
            category: category.name,
            inventoryItemId: undefined,
            item: '',
            quantity: 1,
            exceedsAvailability: false
          }
        : r
    ));

    if (row.id) {
      const equipmentData: Equipment = {
        id: row.id,
        category: category.name,
        item: '',
        quantity: 1,
        categoryId: categoryId,
        inventoryItemId: undefined
      };
      onAddEquipment(equipmentData);
    }

    if (startDateTime && returnDateTime) {
      fetchAvailabilityForRow(tempId, categoryId);
    }
  };

  const handleItemChange = (tempId: string, inventoryItemId: number) => {
    const row = rows.find(r => r.tempId === tempId);
    if (!row || !row.categoryId) return;

    const availableItems = getAvailabilityForCategory(row.categoryId);
    const selectedItem = availableItems.find(i => i.inventoryItemId === inventoryItemId);

    if (!selectedItem) return;

    const itemLabel = selectedItem.model
      ? `${selectedItem.itemName} (${selectedItem.model})`
      : selectedItem.itemName;

    setRows(prev => prev.map(r =>
      r.tempId === tempId
        ? {
            ...r,
            inventoryItemId,
            item: itemLabel,
            exceedsAvailability: false
          }
        : r
    ));

    if (row.id) {
      const equipmentData: Equipment = {
        id: row.id,
        category: row.category,
        item: itemLabel,
        quantity: row.quantity || 1,
        categoryId: row.categoryId,
        inventoryItemId: inventoryItemId
      };
      onAddEquipment(equipmentData);
    }
  };

  const handleQuantityChange = (tempId: string, quantity: number) => {
    const row = rows.find(r => r.tempId === tempId);
    if (!row || !row.categoryId || !row.inventoryItemId) return;

    const availableItems = getAvailabilityForCategory(row.categoryId);
    const selectedItem = availableItems.find(i => i.inventoryItemId === row.inventoryItemId);

    const exceedsAvailability = selectedItem ? quantity > selectedItem.availableQty : false;

    setRows(prev => prev.map(r =>
      r.tempId === tempId ? { ...r, quantity, exceedsAvailability } : r
    ));

    if (row.id) {
      const equipmentData: Equipment = {
        id: row.id,
        category: row.category,
        item: row.item,
        quantity: quantity,
        categoryId: row.categoryId,
        inventoryItemId: row.inventoryItemId
      };
      onAddEquipment(equipmentData);
    }
  };

  const isItemSelectedInOtherRows = (inventoryItemId: number, currentTempId: string): boolean => {
    return rows.some(r => r.tempId !== currentTempId && r.inventoryItemId === inventoryItemId);
  };

  const toggleDepartmentApprove = (dept: string) => {
    if (departmentsToApprove.includes(dept)) {
      onDepartmentsToApproveChange(departmentsToApprove.filter(d => d !== dept));
    } else {
      onDepartmentsToApproveChange([...departmentsToApprove, dept]);
    }
  };

  const toggleDepartmentNotify = (dept: string) => {
    if (departmentsToNotify.includes(dept)) {
      onDepartmentsToNotifyChange(departmentsToNotify.filter(d => d !== dept));
    } else {
      onDepartmentsToNotifyChange([...departmentsToNotify, dept]);
    }
  };

  const canSelectEquipment = startDateTime && returnDateTime;

  return (
    <div className="space-y-6">
      {!canSelectEquipment && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select start and end date/time to load equipment availability.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Equipment List</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No equipment added yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-[120px]">Quantity</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const availableItems = row.categoryId ? getAvailabilityForCategory(row.categoryId) : [];
                  const selectedItem = availableItems.find(i => i.inventoryItemId === row.inventoryItemId);
                  const maxQty = selectedItem?.availableQty || 0;

                  return (
                    <TableRow key={row.tempId}>
                      <TableCell>
                        <Select
                          value={row.categoryId?.toString() || ''}
                          onValueChange={(value) => handleCategoryChange(row.tempId, parseInt(value))}
                          disabled={!canSelectEquipment || categoriesLoading}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {row.availabilityLoading ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : row.availabilityError ? (
                          <div className="text-sm text-red-600">{row.availabilityError}</div>
                        ) : (
                          <Select
                            value={row.inventoryItemId?.toString() || ''}
                            onValueChange={(value) => handleItemChange(row.tempId, parseInt(value))}
                            disabled={!row.categoryId || availableItems.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select item" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableItems.map((item) => {
                                const isSelectedElsewhere = isItemSelectedInOtherRows(item.inventoryItemId, row.tempId);
                                const isDisabled = item.availableQty <= 0 || isSelectedElsewhere;

                                let label = item.model
                                  ? `${item.itemName} (${item.model}) - Available: ${item.availableQty}`
                                  : `${item.itemName} - Available: ${item.availableQty}`;

                                if (isSelectedElsewhere) {
                                  label += ' (Already selected)';
                                }

                                return (
                                  <SelectItem
                                    key={item.inventoryItemId}
                                    value={item.inventoryItemId.toString()}
                                    disabled={isDisabled}
                                  >
                                    {label}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.quantity > 0 ? row.quantity.toString() : ''}
                          onValueChange={(value) => handleQuantityChange(row.tempId, parseInt(value))}
                          disabled={!row.inventoryItemId || maxQty === 0}
                        >
                          <SelectTrigger className={row.exceedsAvailability ? 'border-yellow-500' : ''}>
                            <SelectValue placeholder="Qty" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Math.max(maxQty, row.quantity) }, (_, i) => i + 1).map((num) => (
                              <SelectItem key={num} value={num.toString()}>
                                {num}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {row.exceedsAvailability && (
                          <p className="text-xs text-yellow-600 mt-1">Exceeds current availability</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRow(row.tempId)}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Button onClick={handleAddRow} className="mt-4" disabled={!canSelectEquipment}>
            <Plus size={18} className="mr-2" />
            Add Equipment Row
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Departments to Notify</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEPARTMENTS.map((dept) => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`notify-${dept}`}
                  checked={departmentsToNotify.includes(dept)}
                  onCheckedChange={() => toggleDepartmentNotify(dept)}
                />
                <Label htmlFor={`notify-${dept}`} className="text-sm font-normal cursor-pointer">
                  {dept}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
