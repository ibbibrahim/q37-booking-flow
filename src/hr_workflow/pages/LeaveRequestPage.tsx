import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { loadLeaveSuspensionTemplate, fillLeaveEmployeeInfo } from '../utils/leaveSuspensionPdf';
import { formatDate } from '../utils/hrUtils';
import { LEAVE_REQUEST_STATUS_LABELS, type LeaveRequestStatus } from '../types/leaveRequest';

const STATUS_BADGE: Record<LeaveRequestStatus, string> = {
  Draft: 'border-transparent bg-muted text-muted-foreground',
  AwaitingDepartmentHeadSignature: 'border-transparent bg-warning/15 text-warning',
  AwaitingFreelancerAcknowledgment: 'border-transparent bg-info/15 text-info',
  Completed: 'border-transparent bg-success/15 text-success',
};

/** Freelancer "leave" — legally a Temporary Suspension of Services notice
 * (Clause 17 of the Services Contract), not generic PTO. The freelancer
 * emails the coordinator to request it; HR fills the official notice here on
 * the candidate's behalf, sends it to the Department Head for approval
 * (same Manager Approval screen used for contracts), then the freelancer
 * acknowledges/signs in person once approved. */
export function LeaveRequestPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = useQuery({ queryKey: ['hr-leave-requests'], queryFn: leaveRequestApi.getAll });
  const requests = listQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Freelancer suspension-of-services notices — approved by the Department Head, then acknowledged by the freelancer in person. Permanent staff leave is managed in Muwarid.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} className="mr-1" /> New Leave Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Freelancer</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              )}
              {!listQuery.isLoading && requests.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-10">No leave requests yet.</TableCell></TableRow>
              )}
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.employeeFullNameEn}</TableCell>
                  <TableCell className="text-muted-foreground">{r.departmentNameEn ?? '—'}</TableCell>
                  <TableCell>{r.suspensionType ?? '—'}</TableCell>
                  <TableCell>{r.startDate ? formatDate(r.startDate) : '—'} – {r.endDate ? formatDate(r.endDate) : '—'}</TableCell>
                  <TableCell className="tabular-nums">{r.totalDays ?? '—'}</TableCell>
                  <TableCell><Badge className={STATUS_BADGE[r.status]}>{LEAVE_REQUEST_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {r.status === 'Draft' && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/hr/leave-requests/${r.id}/edit`)}>
                          <Eye size={14} /> Continue
                        </Button>
                      )}
                      {r.status === 'AwaitingFreelancerAcknowledgment' && (
                        <Button size="sm" className="gap-1.5" onClick={() => navigate(`/hr/leave-requests/${r.id}/acknowledge`)}>
                          <Eye size={14} /> Freelancer Sign
                        </Button>
                      )}
                      {(r.status === 'AwaitingDepartmentHeadSignature' || r.status === 'Completed') && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate(`/hr/leave-requests/${r.id}/edit`)}>
                          <Eye size={14} /> View
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {createOpen && (
        <CreateLeaveRequestModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => { setCreateOpen(false); navigate(`/hr/leave-requests/${id}/edit`); }}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateLeaveRequestModal({ onClose, onCreated, showToast }: {
  onClose: () => void; onCreated: (id: number) => void; showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [employeeId, setEmployeeId] = useState('');
  const [saving, setSaving] = useState(false);

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', 'leave-request-create'],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', page: 1, pageSize: 2000 }),
  });
  const employees = employeesQuery.data?.items ?? [];

  const handleCreate = async () => {
    if (!employeeId) {
      showToast('Please select a freelancer.', 'error');
      return;
    }
    setSaving(true);
    try {
      const employee = await hrApi.getEmployee(Number(employeeId));
      const templateBytes = await loadLeaveSuspensionTemplate();
      const filled = await fillLeaveEmployeeInfo(templateBytes, employee);
      const blob = new Blob([new Uint8Array(filled)], { type: 'application/pdf' });
      const created = await leaveRequestApi.create(Number(employeeId), blob);
      onCreated(created.id);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to create leave request.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md">
        <div className="p-5 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">New Leave Request</h3>
          <p className="text-xs text-muted-foreground mt-1">Select the freelancer who requested leave by email.</p>
        </div>
        <div className="p-5 space-y-3">
          <Label className="mb-1.5 block">Freelancer</Label>
          <Select value={employeeId} onValueChange={setEmployeeId}>
            <SelectTrigger><SelectValue placeholder="Select freelancer" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.fullNameEn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={saving} onClick={handleCreate}>{saving ? 'Creating…' : 'Create'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
