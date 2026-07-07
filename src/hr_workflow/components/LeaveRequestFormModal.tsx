import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { departmentName } from '../data/departments';
import type { Employee, LeaveRequest } from '../types/hr';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancers: Employee[];
  nextId: number;
  onCreate: (request: LeaveRequest) => void;
}

const reasons = ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Personal Leave', 'Bereavement Leave', 'Travel Leave'];

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export function LeaveRequestFormModal({ open, onOpenChange, freelancers, nextId, onCreate }: Props) {
  const [employeeId, setEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState(reasons[0]);

  useEffect(() => {
    if (open) {
      setEmployeeId(freelancers[0] ? String(freelancers[0].id) : '');
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setEndDate(today);
      setReason(reasons[0]);
    }
  }, [open, freelancers]);

  const handleSubmit = () => {
    const employee = freelancers.find((e) => String(e.id) === employeeId);
    if (!employee || !startDate || !endDate) return;

    onCreate({
      id: nextId,
      employeeId: employee.id,
      employeeName: employee.fullName,
      departmentId: employee.departmentId,
      jobTitle: employee.jobTitle,
      startDate,
      endDate,
      daysCount: daysBetween(startDate, endDate),
      reason,
      status: 'Pending Department',
      requestedAt: new Date().toISOString().slice(0, 10),
      departmentApproved: false,
      hrApproved: false,
      notifiedByEmail: false,
      notifiedByPortal: false,
      payrollNoted: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>Freelancer leave request — routed to Department then HR for approval.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Freelancer</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {freelancers.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.fullName} · {departmentName(e.departmentId)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {startDate && endDate && (
            <p className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{daysBetween(startDate, endDate)} day(s)</span> — will be noted to payroll once approved.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!employeeId}>
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
