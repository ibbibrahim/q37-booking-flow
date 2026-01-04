import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StudioBooking, StudioType } from '../types/booking';

interface BookingFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BookingFormData) => void;
  editingBooking?: StudioBooking | null;
}

export interface BookingFormData {
  title: string;
  studioType: StudioType;
  startDateTime: string;
  endDateTime: string;
  notes: string;
}

export const BookingFormModal: React.FC<BookingFormModalProps> = ({
  open,
  onClose,
  onSave,
  editingBooking
}) => {
  const [formData, setFormData] = useState<BookingFormData>({
    title: '',
    studioType: 'Studio News',
    startDateTime: '',
    endDateTime: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});

  useEffect(() => {
    if (editingBooking) {
      setFormData({
        title: editingBooking.title,
        studioType: editingBooking.studioType,
        startDateTime: editingBooking.startDateTime.slice(0, 16),
        endDateTime: editingBooking.endDateTime.slice(0, 16),
        notes: editingBooking.notes || ''
      });
    } else if (open) {
      const now = new Date();
      const roundedStart = new Date(now);
      roundedStart.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
      const roundedEnd = new Date(roundedStart.getTime() + 60 * 60 * 1000);

      setFormData({
        title: '',
        studioType: 'Studio News',
        startDateTime: roundedStart.toISOString().slice(0, 16),
        endDateTime: roundedEnd.toISOString().slice(0, 16),
        notes: ''
      });
    }
    setErrors({});
  }, [editingBooking, open]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof BookingFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.startDateTime) {
      newErrors.startDateTime = 'Start date/time is required';
    }

    if (!formData.endDateTime) {
      newErrors.endDateTime = 'End date/time is required';
    }

    if (formData.startDateTime && formData.endDateTime) {
      const start = new Date(formData.startDateTime);
      const end = new Date(formData.endDateTime);

      if (end <= start) {
        newErrors.endDateTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      const submitData = {
        ...formData,
        startDateTime: new Date(formData.startDateTime).toISOString(),
        endDateTime: new Date(formData.endDateTime).toISOString()
      };
      onSave(submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      studioType: 'Studio News',
      startDateTime: '',
      endDateTime: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingBooking ? 'Edit Booking' : 'Create New Booking'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter booking title"
              className={errors.title ? 'border-red-500' : ''}
            />
            {errors.title && <p className="text-sm text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <Label htmlFor="studioType">Studio Type *</Label>
            <Select
              value={formData.studioType}
              onValueChange={(value) => setFormData({ ...formData, studioType: value as StudioType })}
            >
              <SelectTrigger id="studioType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Studio News">Studio News</SelectItem>
                <SelectItem value="Studio Program">Studio Program</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDateTime">Start Date & Time *</Label>
              <Input
                id="startDateTime"
                type="datetime-local"
                value={formData.startDateTime}
                onChange={(e) => setFormData({ ...formData, startDateTime: e.target.value })}
                className={errors.startDateTime ? 'border-red-500' : ''}
              />
              {errors.startDateTime && (
                <p className="text-sm text-red-600 mt-1">{errors.startDateTime}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDateTime">End Date & Time *</Label>
              <Input
                id="endDateTime"
                type="datetime-local"
                value={formData.endDateTime}
                onChange={(e) => setFormData({ ...formData, endDateTime: e.target.value })}
                className={errors.endDateTime ? 'border-red-500' : ''}
              />
              {errors.endDateTime && (
                <p className="text-sm text-red-600 mt-1">{errors.endDateTime}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes (optional)"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {editingBooking ? 'Update Booking' : 'Create Booking'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
