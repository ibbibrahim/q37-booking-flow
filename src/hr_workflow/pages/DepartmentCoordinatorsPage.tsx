import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';

/** Assigns which user(s) coordinate which department(s) — the operational,
 * non-approval role that requests new hires, runs interviews, and handles
 * leave requests. A user must already have the DepartmentCoordinator
 * platform role granted (via the main Users admin screen) before they show
 * up here as eligible; this screen only handles the department mapping. */
export function DepartmentCoordinatorsPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);

  const listQuery = useQuery({ queryKey: ['hr-department-coordinators'], queryFn: hrApi.getDepartmentCoordinators });
  const eligibleQuery = useQuery({ queryKey: ['hr-eligible-coordinator-users'], queryFn: hrApi.getEligibleCoordinatorUsers });
  const departmentsQuery = useQuery({ queryKey: ['hr-departments'], queryFn: hrApi.getDepartments });

  const assignments = listQuery.data ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['hr-department-coordinators'] });

  const handleAssign = async () => {
    if (!userId || !departmentId) {
      showToast('Select a user and a department.', 'error');
      return;
    }
    setSaving(true);
    try {
      await hrApi.createDepartmentCoordinator({ userId: Number(userId), departmentId: Number(departmentId) });
      showToast('Coordinator assigned.', 'success');
      setUserId('');
      setDepartmentId('');
      refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to assign coordinator.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await hrApi.deleteDepartmentCoordinator(id);
      showToast('Assignment removed.', 'success');
      refresh();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to remove assignment.'), 'error');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Department Coordinators</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign who coordinates each department's day-to-day hiring and leave paperwork. A user needs the
          DepartmentCoordinator role granted first (Users admin screen) before they appear below.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-end gap-3">
          <div className="flex-1 w-full">
            <Label className="mb-1.5 block">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {(eligibleQuery.data ?? []).map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.displayName ?? u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 w-full">
            <Label className="mb-1.5 block">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {(departmentsQuery.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-1.5 shrink-0" disabled={saving} onClick={handleAssign}>
            <Plus size={14} /> Assign
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              )}
              {!listQuery.isLoading && assignments.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-10">No coordinators assigned yet.</TableCell></TableRow>
              )}
              {assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium text-foreground">{a.userDisplayName ?? a.userUsername}</TableCell>
                  <TableCell>{a.departmentNameEn}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleRemove(a.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
