import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { rotaApi } from '../api/rotaApi';
import type { RotaShiftType, CreateShiftTypeDto } from '../types/rota';

export interface ShiftTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: number;
  shiftType?: RotaShiftType | null;
  onSuccess: () => void;
}

function toTimeInputValue(time: string): string {
  if (!time) return '';
  const parts = time.split(':');
  const h = parts[0] ?? '00';
  const m = parts[1] ?? '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function fromTimeInputValue(value: string): string {
  if (!value) return '00:00';
  const [h, m] = value.split(':');
  return `${(h ?? '00').padStart(2, '0')}:${(m ?? '00').padStart(2, '0')}`;
}

const DEFAULT_COLORS = [
  '#fef3c7', '#dbeafe', '#e0e7ff', '#d1fae5', '#fce7f3', '#fed7aa',
];

export function ShiftTypeModal({
  open,
  onOpenChange,
  departmentId,
  shiftType,
  onSuccess,
}: ShiftTypeModalProps) {
  const isEdit = !!shiftType?.id;
  const [label, setLabel] = useState('');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('14:00');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (shiftType) {
        setLabel(shiftType.label);
        setStartTime(toTimeInputValue(shiftType.startTime));
        setEndTime(toTimeInputValue(shiftType.endTime));
        setColor(shiftType.color || DEFAULT_COLORS[0]);
        setDisplayOrder(shiftType.displayOrder);
      } else {
        setLabel('');
        setStartTime('06:00');
        setEndTime('14:00');
        setColor(DEFAULT_COLORS[0]);
        setDisplayOrder(0);
      }
    }
  }, [open, shiftType]);

  const name = label
    ? label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '')
    : '';

  const handleSave = async () => {
    if (!label.trim()) return;
    setIsLoading(true);
    try {
      const dto: CreateShiftTypeDto = {
        name: name || 'shift',
        label: label.trim(),
        startTime: fromTimeInputValue(startTime),
        endTime: fromTimeInputValue(endTime),
        color,
        displayOrder,
      };
      if (isEdit && shiftType) {
        await rotaApi.updateShiftType(departmentId, shiftType.id, dto);
      } else {
        await rotaApi.createShiftType(departmentId, dto);
      }
      onSuccess();
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Shift Type' : 'Add Shift Type'}
          </DialogTitle>
          <DialogDescription>
            Define a shift type for this department. The label will appear in the
            rota sidebar and cells.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Morning (6am-2pm)"
            />
            {name && (
              <p className="text-xs text-muted-foreground mt-1">
                Internal name: {name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2 mt-1">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === c ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
              <Input
                id="color"
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="mt-2 w-24"
              />
            </div>
            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) =>
                  setDisplayOrder(parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !label.trim()}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
