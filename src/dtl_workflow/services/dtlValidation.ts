export interface GuestFieldsValue {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  country: string;
  address: string;
}

export const emptyGuestFields: GuestFieldsValue = {
  name: '',
  email: '',
  phone: '',
  whatsapp: '',
  company: '',
  country: '',
  address: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type GuestFieldErrors = Partial<Record<keyof GuestFieldsValue, string>>;

export function validateGuestFields(value: GuestFieldsValue): GuestFieldErrors {
  const errors: GuestFieldErrors = {};

  if (value.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters.';
  }

  if (!value.whatsapp.trim()) {
    errors.whatsapp = 'WhatsApp number is required.';
  } else if (!value.whatsapp.trim().startsWith('+')) {
    errors.whatsapp = 'Include the country code, starting with +.';
  }

  if (value.email.trim() && !EMAIL_RE.test(value.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}
