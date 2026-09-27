import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GuestFieldErrors, GuestFieldsValue } from '../services/dtlValidation';
import { DtlDocumentUploadField } from './DtlDocumentUploadField';

export interface GuestUploadsValue {
  imageLink: string;
  passportLink: string;
  ibanLink: string;
}

export const emptyGuestUploads: GuestUploadsValue = {
  imageLink: '',
  passportLink: '',
  ibanLink: '',
};

function Field({
  id,
  label,
  value,
  onChange,
  onBlur,
  type = 'text',
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={error ? 'border-destructive' : ''}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export function GuestFieldsForm({
  value,
  onChange,
  errors,
  onBlurField,
  uploads,
  onUploadsChange,
}: {
  value: GuestFieldsValue;
  onChange: (value: GuestFieldsValue) => void;
  errors?: GuestFieldErrors;
  onBlurField?: (field: keyof GuestFieldsValue) => void;
  uploads: GuestUploadsValue;
  onUploadsChange: (uploads: GuestUploadsValue) => void;
}) {
  function set<K extends keyof GuestFieldsValue>(key: K, v: string) {
    onChange({ ...value, [key]: v });
  }

  function setUpload<K extends keyof GuestUploadsValue>(key: K, url: string) {
    onUploadsChange({ ...uploads, [key]: url });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field
        id="guest-name"
        label="Name *"
        value={value.name}
        onChange={(v) => set('name', v)}
        onBlur={() => onBlurField?.('name')}
        error={errors?.name}
      />
      <Field
        id="guest-email"
        label="Email"
        type="email"
        placeholder="name@example.com"
        value={value.email}
        onChange={(v) => set('email', v)}
        onBlur={() => onBlurField?.('email')}
        error={errors?.email}
      />
      <Field
        id="guest-whatsapp"
        label="WhatsApp *"
        placeholder="+97450124567"
        value={value.whatsapp}
        onChange={(v) => set('whatsapp', v)}
        onBlur={() => onBlurField?.('whatsapp')}
        error={errors?.whatsapp}
      />
      <Field id="guest-phone" label="Phone" value={value.phone} onChange={(v) => set('phone', v)} />
      <Field id="guest-company" label="Company" value={value.company} onChange={(v) => set('company', v)} />
      <Field id="guest-country" label="Country" value={value.country} onChange={(v) => set('country', v)} />
      <div className="sm:col-span-2">
        <Field id="guest-address" label="Address" value={value.address} onChange={(v) => set('address', v)} />
      </div>

      <DtlDocumentUploadField
        id="guest-image"
        label="Profile picture"
        kind="image"
        value={uploads.imageLink}
        onChange={(url) => setUpload('imageLink', url)}
        accept="image/*"
      />
      <DtlDocumentUploadField
        id="guest-passport"
        label="Passport document"
        kind="passport"
        value={uploads.passportLink}
        onChange={(url) => setUpload('passportLink', url)}
      />
      <DtlDocumentUploadField
        id="guest-iban"
        label="IBAN document"
        kind="iban"
        value={uploads.ibanLink}
        onChange={(url) => setUpload('ibanLink', url)}
      />
    </div>
  );
}
