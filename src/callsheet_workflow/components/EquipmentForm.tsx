import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

  const handleAddEquipment = () => {
    if (!category || !item) {
      alert('Please select category and item');
      return;
    }

    const newEquipment: Equipment = {
      id: Date.now().toString(),
      category,
      item,
      quantity
    };

    onAddEquipment(newEquipment);
    setCategory('');
    setItem('');
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
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">
          Add Equipment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setItem('');
              }}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Select Category</option>
              {Object.keys(EQUIPMENT_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Item <span className="text-red-500">*</span>
            </label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value)}
              disabled={!category}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
            >
              <option value="">Select Item</option>
              {availableItems.map((itm) => (
                <option key={itm} value={itm}>
                  {itm}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-card-foreground mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-lg text-card-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleAddEquipment}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus size={18} />
          Add Equipment
        </button>
      </div>

      {equipment.length > 0 && (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-card-foreground uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-card-foreground uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {equipment.map((eq) => (
                <tr key={eq.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-card-foreground">{eq.category}</td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{eq.item}</td>
                  <td className="px-4 py-3 text-sm text-card-foreground">{eq.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <button
                      onClick={() => onRemoveEquipment(eq.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Departments to Approve
          </h3>
          <div className="space-y-2">
            {DEPARTMENTS.map((dept) => (
              <label key={dept} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={departmentsToApprove.includes(dept)}
                  onChange={() => toggleDepartmentApprove(dept)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-card-foreground">{dept}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Departments to Notify
          </h3>
          <div className="space-y-2">
            {DEPARTMENTS.map((dept) => (
              <label key={dept} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={departmentsToNotify.includes(dept)}
                  onChange={() => toggleDepartmentNotify(dept)}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-card-foreground">{dept}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
