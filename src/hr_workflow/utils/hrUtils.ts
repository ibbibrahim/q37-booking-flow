import type { ContractType, EmployeeStatus, HiringRequestStage, LeaveRequestStatus } from '../types/hr';

/** Seeded PRNG (mulberry32) so demo data is stable across reloads within a session. */
export function createSeededRandom(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function calcAge(dob: string, asOf: Date = new Date()): number {
  const birth = new Date(dob);
  let age = asOf.getFullYear() - birth.getFullYear();
  const m = asOf.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age;
}

export function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function daysUntil(iso: string): number {
  const target = new Date(iso).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export function formatCurrencyQAR(amount: number): string {
  return `QAR ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function contractTypeBadgeClass(type: ContractType): string {
  return type === 'Permanent'
    ? 'border-transparent bg-primary/15 text-primary'
    : 'border-transparent bg-violet-500/15 text-violet-600 dark:text-violet-300';
}

export function statusBadgeClass(status: EmployeeStatus): string {
  switch (status) {
    case 'Active':
      return 'border-transparent bg-success/15 text-success';
    case 'Retired':
      return 'border-transparent bg-muted text-muted-foreground';
    case 'End of Service':
      return 'border-transparent bg-destructive/15 text-destructive';
  }
}

export function leaveStatusBadgeClass(status: LeaveRequestStatus): string {
  switch (status) {
    case 'Approved':
      return 'border-transparent bg-success/15 text-success';
    case 'Rejected':
      return 'border-transparent bg-destructive/15 text-destructive';
    case 'Pending HR':
      return 'border-transparent bg-warning/15 text-warning';
    case 'Pending Department':
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

export const HIRING_STAGES: HiringRequestStage[] = [
  'Department Head',
  'HR Review',
  'GM Approval',
  'QMC HR',
  'CEO Approval',
  'Completed',
];

export function hiringStageBadgeClass(stage: HiringRequestStage): string {
  if (stage === 'Completed') return 'border-transparent bg-success/15 text-success';
  if (stage === 'Returned to Department') return 'border-transparent bg-destructive/15 text-destructive';
  return 'border-transparent bg-primary/15 text-primary';
}
