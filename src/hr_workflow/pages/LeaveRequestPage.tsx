import { useMemo, useState } from 'react';
import { Plus, Mail, Smartphone, Check, X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { StatTile } from '../components/StatTile';
import { LeaveRequestFormModal } from '../components/LeaveRequestFormModal';
import { departments, departmentName } from '../data/departments';
import { employees } from '../data/employeesSeed';
import { leaveRequests as leaveRequestsSeed } from '../data/leaveRequestsSeed';
import { formatDate, leaveStatusBadgeClass } from '../utils/hrUtils';
import type { LeaveRequest } from '../types/hr';

export function LeaveRequestPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>(leaveRequestsSeed);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);

  const freelancers = employees.filter((e) => e.contractType === 'Freelance' && e.status === 'Active');

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (departmentFilter !== 'all' && r.departmentId !== Number(departmentFilter)) return false;
      return true;
    });
  }, [requests, statusFilter, departmentFilter]);

  const pendingDept = requests.filter((r) => r.status === 'Pending Department').length;
  const pendingHR = requests.filter((r) => r.status === 'Pending HR').length;
  const approvedThisMonth = requests.filter((r) => r.status === 'Approved').length;
  const totalApprovedDays = requests.filter((r) => r.status === 'Approved').reduce((s, r) => s + r.daysCount, 0);

  const handleCreate = (req: LeaveRequest) => {
    setRequests((prev) => [req, ...prev]);
    showToast(`Leave request submitted for ${req.employeeName}. Notified by portal.`, 'success');
  };

  const approveDepartment = (id: number) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status: 'Pending HR', departmentApproved: true, notifiedByPortal: true, notifiedByEmail: true }
          : r
      )
    );
    showToast('Approved by Department — forwarded to HR. Freelancer notified.', 'success');
  };

  const approveHR = (id: number) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'Approved',
              hrApproved: true,
              notifiedByEmail: true,
              notifiedByPortal: true,
              payrollNoted: true,
            }
          : r
      )
    );
    showToast('Leave approved. Days noted to payroll for this department. Freelancer notified by email & portal.', 'success');
  };

  const reject = (id: number) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'Rejected', notifiedByEmail: true, notifiedByPortal: true } : r))
    );
    showToast('Leave request rejected. Freelancer notified by email & portal.', 'warning');
  };

  const nextId = Math.max(0, ...requests.map((r) => r.id)) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leave Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Freelancer leave applications — approved by Department & HR. Permanent staff leave is managed in Muwarid.
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} className="mr-1" /> New Leave Request
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Pending Department" value={pendingDept} icon={Mail} />
        <StatTile label="Pending HR" value={pendingHR} icon={Smartphone} />
        <StatTile label="Approved" value={approvedThisMonth} icon={Check} accentClassName="bg-success/15 text-success" />
        <StatTile
          label="Days Noted to Payroll"
          value={totalApprovedDays}
          icon={Wallet}
          hint="Directly reported per department, monthly"
        />
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Pending Department">Pending Department</SelectItem>
              <SelectItem value="Pending HR">Pending HR</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Freelancer</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">
                    {r.employeeName}
                    <p className="text-xs text-muted-foreground font-normal">{r.jobTitle}</p>
                  </TableCell>
                  <TableCell>{departmentName(r.departmentId)}</TableCell>
                  <TableCell>
                    {formatDate(r.startDate)} – {formatDate(r.endDate)}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.daysCount}</TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell>
                    <Badge className={leaveStatusBadgeClass(r.status)}>{r.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail size={14} className={r.notifiedByEmail ? 'text-success' : ''} />
                      <Smartphone size={14} className={r.notifiedByPortal ? 'text-success' : ''} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {r.status === 'Pending Department' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => approveDepartment(r.id)}>
                            <Check size={14} className="mr-1" /> Dept Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {r.status === 'Pending HR' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => approveHR(r.id)}>
                            <Check size={14} className="mr-1" /> HR Approve
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {(r.status === 'Approved' || r.status === 'Rejected') && (
                        <span className="text-xs text-muted-foreground">No action needed</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No leave requests match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LeaveRequestFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        freelancers={freelancers}
        nextId={nextId}
        onCreate={handleCreate}
      />
    </div>
  );
}
