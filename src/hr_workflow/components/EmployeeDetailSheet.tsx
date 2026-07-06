import type { ReactNode } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, CreditCard, CalendarDays, ArrowRightLeft, Pencil } from 'lucide-react';
import { departmentName } from '../data/departments';
import { leaveRequests } from '../data/leaveRequestsSeed';
import {
  calcAge,
  contractTypeBadgeClass,
  formatCurrencyQAR,
  formatDate,
  leaveStatusBadgeClass,
  statusBadgeClass,
} from '../utils/hrUtils';
import type { Employee } from '../types/hr';

interface Props {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (employee: Employee) => void;
}

function InfoRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

export function EmployeeDetailSheet({ employee, open, onOpenChange, onEdit }: Props) {
  if (!employee) return null;

  const empLeaveHistory = leaveRequests.filter((lr) => lr.employeeId === employee.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle>{employee.fullName}</SheetTitle>
              <SheetDescription>
                {employee.jobTitle} · {departmentName(employee.departmentId)}
              </SheetDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <Badge className={contractTypeBadgeClass(employee.contractType)}>{employee.contractType}</Badge>
            <Badge className={statusBadgeClass(employee.status)}>{employee.status}</Badge>
            {employee.onLeave && (
              <Badge className="border-transparent bg-warning/15 text-warning">On Leave</Badge>
            )}
            {employee.recentlyConvertedToPermanent && (
              <Badge className="border-transparent bg-yellow-400/20 text-yellow-700 dark:text-yellow-300">
                Freelance → Permanent
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <Button size="sm" className="w-full" onClick={() => onEdit(employee)}>
            <Pencil size={14} className="mr-1" /> Edit Record
          </Button>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Contact
            </h4>
            <InfoRow label={<span className="flex items-center gap-1.5"><Phone size={14} />Mobile</span>} value={employee.mobileNumber} />
            <InfoRow label={<span className="flex items-center gap-1.5"><Mail size={14} />Personal Email</span>} value={employee.emailPersonal} />
            <InfoRow label={<span className="flex items-center gap-1.5"><Mail size={14} />Work Email</span>} value={employee.emailWork} />
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Employment
            </h4>
            <InfoRow label="Job Number" value={employee.jobNumber} />
            <InfoRow label="Join Date" value={formatDate(employee.joinDate)} />
            <InfoRow label="Reward" value={employee.reward || '—'} />
            {employee.contractType === 'Freelance' && (
              <InfoRow label="Monthly Rate" value={formatCurrencyQAR(employee.monthlyRate)} />
            )}
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Identification
            </h4>
            <InfoRow label={<span className="flex items-center gap-1.5"><CreditCard size={14} />QID</span>} value={employee.qid} />
            <InfoRow label="QID Expiry" value={formatDate(employee.qidExpiry)} />
            <InfoRow label="Nationality" value={employee.nationality} />
            <InfoRow
              label={<span className="flex items-center gap-1.5"><CalendarDays size={14} />Date of Birth</span>}
              value={`${formatDate(employee.dob)} (age ${calcAge(employee.dob)})`}
            />
          </section>

          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
              <ArrowRightLeft size={14} /> Employment History
            </h4>
            <ol className="space-y-3 border-l border-border pl-4">
              {employee.employmentHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm font-medium text-foreground">
                    {h.fromType ? `${h.fromType} → ${h.toType}` : `Hired as ${h.toType}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(h.date)} · {h.note}</p>
                </li>
              ))}
            </ol>
          </section>

          {employee.contractType === 'Freelance' && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Leave History
              </h4>
              {empLeaveHistory.length > 0 ? (
                <ul className="space-y-2">
                  {empLeaveHistory.map((lr) => (
                    <li key={lr.id} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-muted-foreground">
                        {formatDate(lr.startDate)} – {formatDate(lr.endDate)} ({lr.daysCount}d) · {lr.reason}
                      </span>
                      <Badge className={leaveStatusBadgeClass(lr.status)}>{lr.status}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No leave requests on record.</p>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
