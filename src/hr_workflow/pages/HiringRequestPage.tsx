import { useMemo, useState } from 'react';
import { Plus, Clock, CheckCircle2, RotateCcw, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/contexts/ToastContext';
import { StatTile } from '../components/StatTile';
import { HiringRequestFormModal } from '../components/HiringRequestFormModal';
import { HiringRequestDetailModal } from '../components/HiringRequestDetailModal';
import { departments, departmentName } from '../data/departments';
import { hiringRequests as hiringRequestsSeed } from '../data/hiringRequestsSeed';
import { formatDate, hiringStageBadgeClass } from '../utils/hrUtils';
import type { HiringRequest, HiringRequestStage } from '../types/hr';

export function HiringRequestPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<HiringRequest[]>(hiringRequestsSeed);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<HiringRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (departmentFilter !== 'all' && r.departmentId !== Number(departmentFilter)) return false;
      if (stageFilter !== 'all' && r.stage !== stageFilter) return false;
      return true;
    });
  }, [requests, departmentFilter, stageFilter]);

  const inProgress = requests.filter((r) => r.status === 'In Progress').length;
  const completed = requests.filter((r) => r.status === 'Approved').length;
  const returned = requests.filter((r) => r.status === 'Returned').length;

  const nextId = Math.max(0, ...requests.map((r) => r.id)) + 1;

  const openDetail = (req: HiringRequest) => {
    setSelected(req);
    setDetailOpen(true);
  };

  const handleCreate = (req: HiringRequest) => {
    setRequests((prev) => [req, ...prev]);
    showToast(`Hiring request ${req.requestNumber} submitted to HR.`, 'success');
  };

  const handleAdvance = (id: number, nextStage: HiringRequestStage, comment: string, by: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated: HiringRequest = {
          ...r,
          stage: nextStage,
          status: nextStage === 'Completed' ? 'Approved' : 'In Progress',
          comments: [
            ...r.comments,
            {
              id: `c${r.comments.length + 1}`,
              by,
              date: new Date().toISOString().slice(0, 10),
              text: comment || `Moved to ${nextStage}.`,
            },
          ],
        };
        return updated;
      })
    );
    setSelected((prev) => (prev && prev.id === id ? { ...prev, stage: nextStage } : prev));
    setDetailOpen(false);
    showToast(`Request moved to ${nextStage}.`, 'success');
  };

  const handleReturn = (id: number, comment: string) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              stage: 'Returned to Department',
              status: 'Returned',
              comments: [
                ...r.comments,
                { id: `c${r.comments.length + 1}`, by: 'HR Coordinator', date: new Date().toISOString().slice(0, 10), text: comment },
              ],
            }
          : r
      )
    );
    setDetailOpen(false);
    showToast('Request returned to Department Head with comments.', 'warning');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hiring Request</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Department Head → HR → GM → QMC HR → CEO approval workflow
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus size={16} className="mr-1" /> New Hiring Request
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Total Requests" value={requests.length} icon={FileStack} />
        <StatTile label="In Progress" value={inProgress} icon={Clock} accentClassName="bg-warning/15 text-warning" />
        <StatTile label="Completed" value={completed} icon={CheckCircle2} accentClassName="bg-success/15 text-success" />
        <StatTile label="Returned" value={returned} icon={RotateCcw} accentClassName="bg-destructive/15 text-destructive" />
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
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              <SelectItem value="Department Head">Department Head</SelectItem>
              <SelectItem value="HR Review">HR Review</SelectItem>
              <SelectItem value="GM Approval">GM Approval</SelectItem>
              <SelectItem value="QMC HR">QMC HR</SelectItem>
              <SelectItem value="CEO Approval">CEO Approval</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Returned to Department">Returned to Department</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Candidate</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Initiated By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.requestNumber}</TableCell>
                  <TableCell>{r.candidateName}</TableCell>
                  <TableCell>{departmentName(r.departmentId)}</TableCell>
                  <TableCell>{r.jobTitle}</TableCell>
                  <TableCell>{r.initiatedBy}</TableCell>
                  <TableCell>{formatDate(r.createdDate)}</TableCell>
                  <TableCell>
                    <Badge className={hiringStageBadgeClass(r.stage)}>{r.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-10">
                    No hiring requests match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <HiringRequestFormModal open={formOpen} onOpenChange={setFormOpen} nextId={nextId} onCreate={handleCreate} />
      <HiringRequestDetailModal
        request={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAdvance={handleAdvance}
        onReturn={handleReturn}
      />
    </div>
  );
}
