export interface BitVendorContact {
  name: string;
  phone: string;
}

export interface BitVendor {
  id: number;
  name: string;
  portalUrl: string | null;
  supportEmail: string | null;
  username: string | null;
  password: string | null;
  contacts: BitVendorContact[];
  notes: string | null;
  displayOrder: number;
  updatedAt: string;
  updatedByName: string | null;
}

/** POST/PUT body for a vendor — server stamps id, displayOrder and audit fields. */
export interface SaveBitVendor {
  name: string;
  portalUrl: string | null;
  supportEmail: string | null;
  username: string | null;
  password: string | null;
  contacts: BitVendorContact[];
  notes: string | null;
}
