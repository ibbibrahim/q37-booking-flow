import { useEffect, useState } from 'react';
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
import { updateDtlProgram } from '../services/dtlApi';
import type { DtlProgram } from '../types/dtl';

export function EditDtlProgramModal({
  program,
  onClose,
  onUpdated,
}: {
  program: DtlProgram | null;
  onClose: () => void;
  onUpdated: (program: DtlProgram) => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!program) return;
    setName(program.name);
    setPrice(String(program.price));
    setDurationMinutes(program.durationMinutes != null ? String(program.durationMinutes) : '');
    setError(null);
  }, [program]);

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit() {
    if (!program) return;
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
      const updated = await updateDtlProgram(program.id, {
        name: name.trim(),
        price: priceValue,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      });
      onUpdated(updated);
      handleClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Something went wrong while updating the program.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={!!program} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit program</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="dtl-edit-program-name">Name *</Label>
            <Input id="dtl-edit-program-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dtl-edit-program-price">Price *</Label>
            <Input
              id="dtl-edit-program-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dtl-edit-program-duration">Duration (minutes)</Label>
            <Input
              id="dtl-edit-program-duration"
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
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
