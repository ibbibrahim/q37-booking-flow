import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BitVendor, BitVendorContact, SaveBitVendor } from '../types/vendor';

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create */
  vendor: BitVendor | null;
  onSubmit: (body: SaveBitVendor) => Promise<void>;
  submitting: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-border pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function VendorFormDialog({ open, onOpenChange, vendor, onSubmit, submitting }: VendorFormDialogProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [portalUrl, setPortalUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contacts, setContacts] = useState<BitVendorContact[]>([]);
  const [errors, setErrors] = useState<{ name?: string; supportEmail?: string }>({});

  useEffect(() => {
    if (!open) return;
    setName(vendor?.name ?? '');
    setNotes(vendor?.notes ?? '');
    setPortalUrl(vendor?.portalUrl ?? '');
    setSupportEmail(vendor?.supportEmail ?? '');
    setUsername(vendor?.username ?? '');
    setPassword(vendor?.password ?? '');
    setShowPassword(false);
    setContacts(vendor?.contacts?.map((c) => ({ ...c })) ?? []);
    setErrors({});
  }, [open, vendor]);

  function updateContact(index: number, patch: Partial<BitVendorContact>) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { name?: string; supportEmail?: string } = {};
    if (!name.trim()) next.name = 'Name is required';
    if (supportEmail.trim() && !EMAIL_RE.test(supportEmail.trim())) next.supportEmail = 'Enter a valid email address';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const orNull = (v: string) => (v.trim() ? v.trim() : null);
    await onSubmit({
      name: name.trim(),
      portalUrl: orNull(portalUrl),
      supportEmail: orNull(supportEmail),
      username: orNull(username),
      // Passwords are saved exactly as typed (no trimming), only empty becomes null.
      password: password ? password : null,
      contacts: contacts
        .map((c) => ({ name: c.name.trim(), phone: c.phone.trim() }))
        .filter((c) => c.name || c.phone),
      notes: orNull(notes),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{vendor ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
          <DialogDescription>
            {vendor
              ? 'Update the portal, login and support details for this vendor.'
              : 'Save a vendor’s support portal, login and contacts so the team can find them fast.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="space-y-3">
            <SectionHeading>Vendor</SectionHeading>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name">Name *</Label>
              <Input
                id="vendor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Avid"
                aria-invalid={!!errors.name}
              />
              <FieldError message={errors.name} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vendor-notes">Notes</Label>
              <Textarea
                id="vendor-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Contract numbers, escalation tips, anything the team should know"
              />
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeading>Portal &amp; login</SectionHeading>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="vendor-portal">Portal URL</Label>
                <Input
                  id="vendor-portal"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="support.example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-email">Support email</Label>
                <Input
                  id="vendor-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="support@example.com"
                  aria-invalid={!!errors.supportEmail}
                />
                <FieldError message={errors.supportEmail} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-username">Username</Label>
                <Input
                  id="vendor-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendor-password">Password</Label>
                <div className="relative">
                  <Input
                    id="vendor-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-8 w-8 text-muted-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <SectionHeading>Support contacts</SectionHeading>
            {contacts.length === 0 && <p className="text-sm text-muted-foreground">No contacts added.</p>}
            <div className="space-y-2">
              {contacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={c.name}
                    onChange={(e) => updateContact(i, { name: e.target.value })}
                    placeholder="Name"
                    aria-label={`Contact ${i + 1} name`}
                  />
                  <Input
                    value={c.phone}
                    onChange={(e) => updateContact(i, { phone: e.target.value })}
                    placeholder="Phone"
                    aria-label={`Contact ${i + 1} phone`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Remove contact ${i + 1}`}
                    onClick={() => setContacts((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContacts((prev) => [...prev, { name: '', phone: '' }])}
            >
              <Plus />
              Add contact
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
