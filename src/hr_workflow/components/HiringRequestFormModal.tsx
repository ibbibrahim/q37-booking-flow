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
import type { HiringRequest } from '../types/hr';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextId: number;
  onCreate: (request: HiringRequest) => void;
}

export function HiringRequestFormModal({ open, onOpenChange, nextId, onCreate }: Props) {
  const [departmentId, setDepartmentId] = useState(String(departments[0].id));
  const [initiatedBy, setInitiatedBy] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [qidStatus, setQidStatus] = useState<'Has QID' | 'No Obligation Letter'>('Has QID');
  const [isInternal, setIsInternal] = useState('external');
  const [duration, setDuration] = useState('12 months');

  useEffect(() => {
    if (open) {
      setDepartmentId(String(departments[0].id));
      setInitiatedBy('');
      setCandidateName('');
      setJobTitle('');
      setQidStatus('Has QID');
      setIsInternal('external');
      setDuration('12 months');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!initiatedBy.trim() || !candidateName.trim() || !jobTitle.trim()) return;

    onCreate({
      id: nextId,
      requestNumber: `HR-2026-${String(nextId).padStart(4, '0')}`,
      departmentId: Number(departmentId),
      initiatedBy,
      candidateName,
      jobTitle,
      qidStatus,
      isInternal: isInternal === 'internal',
      duration,
      createdDate: new Date().toISOString().slice(0, 10),
      stage: 'Department Head',
      status: 'In Progress',
      comments: [
        {
          id: 'c1',
          by: initiatedBy,
          date: new Date().toISOString().slice(0, 10),
          text: 'Hiring request submitted with auto-generated letter template and candidate details attached.',
        },
      ],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Hiring Request</DialogTitle>
          <DialogDescription>
            Initiated by the Department Head. Routed to HR → GM → QMC HR → CEO for approval.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
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
            <Label>Initiated By (Department Head)</Label>
            <Input value={initiatedBy} onChange={(e) => setInitiatedBy(e.target.value)} placeholder="e.g. Fahad Al-Sulaiti" />
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label>Candidate Name</Label>
            <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 12 months" />
          </div>

          <div className="space-y-1.5">
            <Label>QID Status</Label>
            <Select value={qidStatus} onValueChange={(v) => setQidStatus(v as typeof qidStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Has QID">Has QID</SelectItem>
                <SelectItem value="No Obligation Letter">No Obligation Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Internal / External</Label>
            <Select value={isInternal} onValueChange={setIsInternal}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal (has QID)</SelectItem>
                <SelectItem value="external">External (no QID)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
