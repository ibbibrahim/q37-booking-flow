import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GuestFieldsForm, emptyGuestUploads, type GuestUploadsValue } from './GuestFieldsForm';
import { createDtlGuest } from '../services/dtlApi';
import {
  emptyGuestFields,
  validateGuestFields,
  type GuestFieldErrors,
  type GuestFieldsValue,
} from '../services/dtlValidation';
import type { DtlGuest } from '../types/dtl';

export function CreateDtlGuestModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (guest: DtlGuest) => void;
}) {
  const [fields, setFields] = useState<GuestFieldsValue>(emptyGuestFields);
  const [uploads, setUploads] = useState<GuestUploadsValue>(emptyGuestUploads);
  const [touched, setTouched] = useState<Set<keyof GuestFieldsValue>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allErrors = validateGuestFields(fields);
  const visibleErrors: GuestFieldErrors = {};
  for (const key of Object.keys(allErrors) as (keyof GuestFieldsValue)[]) {
    if (submitAttempted || touched.has(key)) {
      visibleErrors[key] = allErrors[key];
    }
  }

  function handleClose() {
    if (submitting) return;
    setFields(emptyGuestFields);
    setUploads(emptyGuestUploads);
    setTouched(new Set());
    setSubmitAttempted(false);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    setError(null);
    setSubmitAttempted(true);
    if (Object.keys(allErrors).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createDtlGuest({
        name: fields.name.trim(),
        email: fields.email.trim(),
        phone: fields.phone.trim(),
        whatsapp: fields.whatsapp.trim(),
        company: fields.company.trim(),
        country: fields.country.trim(),
        address: fields.address.trim(),
        imageLink: uploads.imageLink || undefined,
        passportLink: uploads.passportLink || undefined,
        ibanLink: uploads.ibanLink || undefined,
      });
      onCreated(created);
      handleClose();
    } catch {
      setError('Something went wrong while creating the guest.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[600px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>New guest</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <GuestFieldsForm
            value={fields}
            onChange={setFields}
            errors={visibleErrors}
            onBlurField={(field) => setTouched((prev) => new Set(prev).add(field))}
            uploads={uploads}
            onUploadsChange={setUploads}
          />
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create guest'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
