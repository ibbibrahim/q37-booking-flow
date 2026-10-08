import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Eye, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { useSignalR } from '@/contexts/SignalRContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { leaveRequestApi } from '../api/leaveRequestApi';
import { loadLeaveSuspensionTemplate, fillLeaveEmployeeInfo } from '../utils/leaveSuspensionPdf';
import { RequestHistoryModal } from '../components/RequestHistoryModal';
import { formatDate } from '../utils/hrUtils';
import { LEAVE_REQUEST_STATUS_LABELS, type LeaveRequestStatus } from '../types/leaveRequest';

const LEAVE_EVENT_LABELS: Record<string, string> = {
  Created: 'Notice created',
  Saved: 'Draft saved',
  SentForSignature: 'Sent for Department Head signature',
  DepartmentHeadSigned: 'Signed by Department Head',
  FreelancerAcknowledged: 'Acknowledged by freelancer',
};

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
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [historyId, setHistoryId] = useState<number | null>(null);

  const listQuery = useQuery({ queryKey: ['hr-leave-requests'], queryFn: leaveRequestApi.getAll });
  const requests = listQuery.data ?? [];

  const { listen } = useSignalR();
  useEffect(
    () => listen('LeaveRequestChanged', () => queryClient.invalidateQueries({ queryKey: ['hr-leave-requests'] })),
    [listen, queryClient]
  );

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
                      <Button size="sm" variant="ghost" onClick={() => setHistoryId(r.id)}>
                        <Clock size={14} />
                      </Button>
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

      <RequestHistoryModal
        open={historyId !== null}
        onClose={() => setHistoryId(null)}
        title={`Leave request #${historyId ?? ''}`}
        queryKey={['hr-leave-request-audit', historyId]}
        fetchEvents={() => leaveRequestApi.getAudit(historyId as number)}
        eventLabels={LEAVE_EVENT_LABELS}
      />
    </div>
  );
}

function CreateLeaveRequestModal({ onClose, onCreated, showToast }: {
  onClose: () => void; onCreated: (id: number) => void; showToast: (msg: string, type: 'success' | 'error') => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; fullNameEn: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', 'leave-request-create', debouncedSearch],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', search: debouncedSearch, page: 1, pageSize: 20 }),
    enabled: debouncedSearch.length >= 2,
  });
  const employees = employeesQuery.data?.items ?? [];

  const handleCreate = async () => {
    if (!selectedEmployee) {
      showToast('Please select a freelancer.', 'error');
      return;
    }
    setSaving(true);
    try {
      const employee = await hrApi.getEmployee(selectedEmployee.id);
      const templateBytes = await loadLeaveSuspensionTemplate();
      const filled = await fillLeaveEmployeeInfo(templateBytes, employee);
      const blob = new Blob([new Uint8Array(filled)], { type: 'application/pdf' });
      const created = await leaveRequestApi.create(selectedEmployee.id, blob);
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
          {selectedEmployee ? (
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span className="font-medium text-foreground">{selectedEmployee.fullNameEn}</span>
              <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployee(null); setSearchTerm(''); }}>Change</Button>
            </div>
          ) : (
            <div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search freelancer by name…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              {debouncedSearch.length >= 2 && (
                <div className="mt-1.5 max-h-48 overflow-y-auto rounded-md border border-border divide-y divide-border">
                  {employeesQuery.isFetching && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
                  )}
                  {!employeesQuery.isFetching && employees.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No freelancers found.</p>
                  )}
                  {employees.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      onClick={() => { setSelectedEmployee({ id: e.id, fullNameEn: e.fullNameEn }); setSearchTerm(''); }}
                    >
                      {e.fullNameEn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={saving || !selectedEmployee} onClick={handleCreate}>{saving ? 'Creating…' : 'Create'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
