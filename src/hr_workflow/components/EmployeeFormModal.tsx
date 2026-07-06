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
import { departments } from '../data/departments';
import { nationalities } from '../data/nameData';
import type { ContractType, Employee, EmployeeStatus } from '../types/hr';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  nextId: number;
  onSave: (employee: Employee) => void;
}

function emptyForm(nextId: number): Employee {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: nextId,
    fullName: '',
    jobNumber: `QBC-${String(nextId).padStart(4, '0')}`,
    jobTitle: '',
    departmentId: departments[0].id,
    joinDate: today,
    contractType: 'Permanent',
    reward: '',
    qid: '',
    qidExpiry: today,
    nationality: 'Qatari',
    isQatari: true,
    mobileNumber: '',
    emailPersonal: '',
    emailWork: '',
    status: 'Active',
    dob: '',
    onLeave: false,
    monthlyRate: 0,
    recentlyConvertedToPermanent: false,
    employmentHistory: [],
  };
}

export function EmployeeFormModal({ open, onOpenChange, employee, nextId, onSave }: Props) {
  const [form, setForm] = useState<Employee>(() => employee ?? emptyForm(nextId));

  useEffect(() => {
    if (open) {
      setForm(employee ?? emptyForm(nextId));
    }
  }, [open, employee, nextId]);

  const isEdit = !!employee;

  const update = <K extends keyof Employee>(key: K, value: Employee[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    if (!form.fullName.trim() || !form.jobTitle.trim()) return;

    let history = form.employmentHistory;
    if (isEdit && employee && employee.contractType !== form.contractType) {
      history = [
        ...history,
        {
          id: `${form.id}-h${history.length + 1}`,
          date: new Date().toISOString().slice(0, 10),
          fromType: employee.contractType,
          toType: form.contractType,
          reason: 'Manual update',
          note: `Contract type changed from ${employee.contractType} to ${form.contractType}`,
        },
      ];
    } else if (!isEdit) {
      history = [
        {
          id: `${form.id}-h1`,
          date: form.joinDate,
          fromType: null,
          toType: form.contractType,
          reason: 'Initial hire',
          note: `Joined as ${form.contractType}`,
        },
      ];
    }

    onSave({ ...form, isQatari: form.nationality === 'Qatari', employmentHistory: history });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update employee record details.' : 'Enter details to add a new employee record.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Full Name</Label>
            <Input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="e.g. Ahmed Al-Kuwari" />
          </div>

          <div className="space-y-1.5">
            <Label>Job Number</Label>
            <Input value={form.jobNumber} onChange={(e) => update('jobNumber', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input value={form.jobTitle} onChange={(e) => update('jobTitle', e.target.value)} placeholder="e.g. Camera Operator" />
          </div>

          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={String(form.departmentId)} onValueChange={(v) => update('departmentId', Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Contract Type</Label>
            <Select value={form.contractType} onValueChange={(v) => update('contractType', v as ContractType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Permanent">Permanent</SelectItem>
                <SelectItem value="Freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Join Date</Label>
            <Input type="date" value={form.joinDate} onChange={(e) => update('joinDate', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input type="date" value={form.dob} onChange={(e) => update('dob', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update('status', v as EmployeeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
                <SelectItem value="End of Service">End of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nationality</Label>
            <Select value={form.nationality} onValueChange={(v) => update('nationality', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nationalities.map((n) => (
                  <SelectItem key={n.name} value={n.name}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>QID</Label>
            <Input value={form.qid} onChange={(e) => update('qid', e.target.value)} placeholder="28712345678" />
          </div>

          <div className="space-y-1.5">
            <Label>QID Expiry</Label>
            <Input type="date" value={form.qidExpiry} onChange={(e) => update('qidExpiry', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Mobile Number</Label>
            <Input value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} placeholder="+974 5512 3456" />
          </div>

          <div className="space-y-1.5">
            <Label>Reward</Label>
            <Input value={form.reward} onChange={(e) => update('reward', e.target.value)} placeholder="Optional" />
          </div>

          <div className="space-y-1.5">
            <Label>Personal Email</Label>
            <Input type="email" value={form.emailPersonal} onChange={(e) => update('emailPersonal', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Work Email</Label>
            <Input type="email" value={form.emailWork} onChange={(e) => update('emailWork', e.target.value)} />
          </div>

          {form.contractType === 'Freelance' && (
            <div className="space-y-1.5">
              <Label>Monthly Rate (QAR)</Label>
              <Input
                type="number"
                value={form.monthlyRate}
                onChange={(e) => update('monthlyRate', Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>{isEdit ? 'Save Changes' : 'Add Employee'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
