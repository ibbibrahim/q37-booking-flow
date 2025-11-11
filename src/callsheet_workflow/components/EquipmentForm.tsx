import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Equipment } from '../types/callsheet';
import { EQUIPMENT_CATEGORIES, DEPARTMENTS } from '../types/callsheet';

interface EquipmentFormProps {
  equipment: Equipment[];
  onAddEquipment: (equipment: Equipment) => void;
  onRemoveEquipment: (id: string) => void;
  departmentsToApprove: string[];
  departmentsToNotify: string[];
  onDepartmentsToApproveChange: (departments: string[]) => void;
  onDepartmentsToNotifyChange: (departments: string[]) => void;
}

export const EquipmentForm: React.FC<EquipmentFormProps> = ({
  equipment,
  onAddEquipment,
  onRemoveEquipment,
  departmentsToApprove,
  departmentsToNotify,
  onDepartmentsToApproveChange,
  onDepartmentsToNotifyChange
}) => {
  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customItem, setCustomItem] = useState('');
  const [useCustomItem, setUseCustomItem] = useState(false);

  const handleAddEquipment = () => {
    if (!category) {
      alert('Please select a category');
      return;
    }

    const finalItem = useCustomItem ? customItem.trim() : item;

    if (!finalItem) {
      alert(useCustomItem ? 'Please enter a custom item name' : 'Please select an item');
      return;
    }

    const newEquipment: Equipment = {
      id: Date.now().toString(),
      category,
      item: finalItem,
      quantity
    };

    onAddEquipment(newEquipment);
    setCategory('');
    setItem('');
    setCustomItem('');
    setUseCustomItem(false);
    setQuantity(1);
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

  const availableItems = category ? EQUIPMENT_CATEGORIES[category as keyof typeof EQUIPMENT_CATEGORIES] : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value);
                  setItem('');
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(EQUIPMENT_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="item">
                  Item <span className="text-red-500">*</span>
                </Label>
                {category && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomItem(!useCustomItem);
                      setItem('');
                      setCustomItem('');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {useCustomItem ? 'Select from list' : 'Add custom'}
                  </button>
                )}
              </div>
              {useCustomItem ? (
                <Input
                  id="custom-item"
                  placeholder="Enter custom item name"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  disabled={!category}
                />
              ) : (
                <Select
                  value={item}
                  onValueChange={setItem}
                  disabled={!category}
                >
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((itm) => (
                      <SelectItem key={itm} value={itm}>
                        {itm}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <Button onClick={handleAddEquipment}>
            <Plus size={18} className="mr-2" />
            Add Equipment
          </Button>
        </CardContent>
      </Card>

      {equipment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Equipment List</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>{eq.category}</TableCell>
                    <TableCell>{eq.item}</TableCell>
                    <TableCell>{eq.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveEquipment(eq.id)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {equipment.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              No equipment added yet
            </div>
          </CardContent>
        </Card>
      )}

      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Departments to Approve</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEPARTMENTS.map((dept) => (
              <div key={dept} className="flex items-center space-x-2">
                <Checkbox
                  id={`approve-${dept}`}
                  checked={departmentsToApprove.includes(dept)}
                  onCheckedChange={() => toggleDepartmentApprove(dept)}
                />
                <Label htmlFor={`approve-${dept}`} className="text-sm font-normal cursor-pointer">
                  {dept}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>

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
      </div> */}
    </div>
  );
};
