import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendDtlBookingLinkEmail, updateDtlBookingLink } from '../services/dtlApi';
import { buildDtlLinkMessage, buildDtlWhatsAppUrl } from '../services/dtlMessages';
import type { DtlBooking, DtlGuest } from '../types/dtl';

export function DtlLinkField({
  booking,
  guest,
  canEdit,
  onUpdated,
  onWhatsAppSent,
}: {
  booking: DtlBooking;
  guest: DtlGuest | null;
  canEdit: boolean;
  onUpdated: (updated: DtlBooking) => void;
  onWhatsAppSent?: () => void;
}) {
  const [value, setValue] = useState(booking.link || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const message = buildDtlLinkMessage(guest?.name || '', booking.programName, booking.time, booking.link || '');
  const whatsappUrl = booking.link
    ? buildDtlWhatsAppUrl(guest?.whatsapp || guest?.phone || '', message)
    : null;
  const canEmail = Boolean(booking.link && guest?.email);

  const trimmedValue = value.trim();
  const isDirty = trimmedValue !== (booking.link || '');

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDtlBookingLink(booking.id, trimmedValue);
      onUpdated(updated);
    } catch {
      setError('Could not save link.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendEmail() {
    setSendingEmail(true);
    setEmailError(null);
    try {
      const updated = await sendDtlBookingLinkEmail(booking.id);
      onUpdated(updated);
    } catch (err: any) {
      setEmailError(err?.response?.data?.message || 'Could not send the email.');
    } finally {
      setSendingEmail(false);
    }
  }

  if (!canEdit) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            readOnly
            disabled
            value={booking.link || 'No link has been added yet'}
            className="cursor-not-allowed bg-muted"
          />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">Only the CR team can edit this field.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Input
            type="url"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://…"
          />
          <Button type="button" onClick={handleSave} disabled={saving || !isDirty} className="shrink-0">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        {booking.link && (
          <a
            href={booking.link}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary underline decoration-primary/30 hover:decoration-primary"
            title={booking.link}
          >
            Open current link ↗
          </a>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <a
            href={whatsappUrl ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!whatsappUrl}
            onClick={(e) => {
              if (!whatsappUrl) {
                e.preventDefault();
                return;
              }
              onWhatsAppSent?.();
            }}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
              whatsappUrl
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            }`}
            title={whatsappUrl ? 'Send via WhatsApp' : 'Add a link and a guest WhatsApp/phone number first'}
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={handleSendEmail}
            disabled={!canEmail || sendingEmail}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium ${
              canEmail && !sendingEmail
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                : 'cursor-not-allowed bg-muted text-muted-foreground'
            }`}
            title={canEmail ? 'Send the link by email' : 'Add a link and a guest email first'}
          >
            {sendingEmail ? 'Sending…' : 'Email'}
          </button>
        </div>
        {emailError && <p className="text-sm text-destructive">{emailError}</p>}
      </div>
    </div>
  );
}
