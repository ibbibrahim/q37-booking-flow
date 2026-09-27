import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GuestFieldsForm, emptyGuestUploads, type GuestUploadsValue } from './GuestFieldsForm';
import { updateDtlGuest } from '../services/dtlApi';
import {
  emptyGuestFields,
  validateGuestFields,
  type GuestFieldErrors,
  type GuestFieldsValue,
} from '../services/dtlValidation';
import type { DtlGuest } from '../types/dtl';

export function EditDtlGuestModal({
  guest,
  onClose,
  onUpdated,
}: {
  guest: DtlGuest | null;
  onClose: () => void;
  onUpdated: (guest: DtlGuest) => void;
}) {
  const [fields, setFields] = useState<GuestFieldsValue>(emptyGuestFields);
  const [uploads, setUploads] = useState<GuestUploadsValue>(emptyGuestUploads);
  const [touched, setTouched] = useState<Set<keyof GuestFieldsValue>>(new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!guest) return;
    setFields({
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      whatsapp: guest.whatsapp || '',
      company: guest.company || '',
      country: guest.country || '',
      address: guest.address || '',
    });
    setUploads({
      imageLink: guest.imageLink || '',
      passportLink: guest.passportLink || '',
      ibanLink: guest.ibanLink || '',
    });
    setTouched(new Set());
    setSubmitAttempted(false);
    setError(null);
  }, [guest]);

  const allErrors = validateGuestFields(fields);
  const visibleErrors: GuestFieldErrors = {};
  for (const key of Object.keys(allErrors) as (keyof GuestFieldsValue)[]) {
    if (submitAttempted || touched.has(key)) {
      visibleErrors[key] = allErrors[key];
    }
  }

  function handleClose() {
    if (submitting) return;
    onClose();
  }

  async function handleSubmit() {
    if (!guest) return;
    setError(null);
    setSubmitAttempted(true);
    if (Object.keys(allErrors).length > 0) return;

    setSubmitting(true);
    try {
      const updated = await updateDtlGuest(guest.id, {
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
      onUpdated(updated);
      handleClose();
    } catch {
      setError('Something went wrong while saving the guest.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={guest !== null} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit guest</DialogTitle>
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
            {submitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
