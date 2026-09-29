import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDtlProgram } from '../services/dtlApi';
import type { DtlProgram } from '../types/dtl';

export function CreateDtlProgramModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (program: DtlProgram) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (submitting) return;
    setName('');
    setPrice('');
    setDurationMinutes('');
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    const priceValue = Number(price);
    if (!price || Number.isNaN(priceValue) || priceValue <= 0) {
      setError('Enter a valid price greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createDtlProgram({
        name: name.trim(),
        price: priceValue,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
      onCreated(created);
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong while creating the program.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="dtl-program-name">Name *</Label>
            <Input id="dtl-program-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dtl-program-price">Price *</Label>
            <Input
              id="dtl-program-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dtl-program-duration">Duration (minutes)</Label>
            <Input
              id="dtl-program-duration"
              type="number"
              min="0"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
