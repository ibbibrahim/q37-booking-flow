import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Trash2 } from 'lucide-react';
import { RotaCalendar } from '../components/RotaCalendar';
import { ShiftOptionsPool } from '../components/ShiftOptionsPool';
import { EditAssignmentModal } from '../components/EditAssignmentModal';
import { WeekNavigator } from '../components/WeekNavigator';
import { AutoRotateModal } from '../components/AutoRotateModal';
import { ShareRotaModal } from '../components/ShareRotaModal';
import { rotaApi } from '../api/rotaApi';
import {
  getWeekStart,
  getWeekDates,
  formatDateForApi,
  normalizeDateString,
} from '../utils/dateUtils';
import type { RotaAssignment } from '../types/rota';
import type { EditAssignmentFormData } from '../components/EditAssignmentModal';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function RotaManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.roles?.includes('Admin') ?? false;

  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(
    null
  );
  const [autoRotateOpen, setAutoRotateOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalState, setEditModalState] = useState<{
    assignment: RotaAssignment | null;
    employeeId: number | null;
    date: Date | null;
  }>({ assignment: null, employeeId: null, date: null });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['rotaDepartments'],
    queryFn: rotaApi.getDepartments,
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['departmentEmployees', selectedDepartmentId],
    queryFn: () =>
      selectedDepartmentId
        ? rotaApi.getDepartmentEmployees(selectedDepartmentId)
        : Promise.resolve([]),
    enabled: !!selectedDepartmentId,
  });

  const {
    data: week,
    isLoading: weekLoading,
    refetch: refetchWeek,
  } = useQuery({
    queryKey: [
      'rotaWeek',
      formatDateForApi(selectedWeekStart),
      selectedDepartmentId,
    ],
    queryFn: () =>
      rotaApi.getWeek(
        formatDateForApi(selectedWeekStart),
        selectedDepartmentId!
      ),
    enabled: !!selectedDepartmentId,
  });

  useEffect(() => {
    if (departmentsLoading || selectedDepartmentId !== null) return;
    if (!isAdmin && departments.length > 0) {
      setSelectedDepartmentId(departments[0].id);
    }
  }, [departments, departmentsLoading, isAdmin, selectedDepartmentId]);

  const selectedDepartment = departments.find(
    (d) => d.id === selectedDepartmentId
  ) ?? null;
  const weekDates = getWeekDates(selectedWeekStart);

  const publishMutation = useMutation({
    mutationFn: (weekId: number) => rotaApi.publishWeek(weekId),
    onSuccess: () => {
      showToast('Rota published successfully', 'success');
      refetchWeek();
    },
    onError: () => {
      showToast('Failed to publish rota', 'error');
    },
  });

  const buildAssignmentsPayload = useCallback(
    (assignments: RotaAssignment[]) =>
      assignments.map((a) => ({
        employeeId: a.employeeId,
        shiftDate: normalizeDateString(a.shiftDate),
        shiftType: a.shiftType,
        customLabel: a.customLabel,
        programName: a.programName,
        assignmentComments: a.assignmentComments,
        shiftStartTime: a.shiftStartTime,
        shiftEndTime: a.shiftEndTime,
        isOffDay: a.isOffDay ?? false,
      })),
    []
  );

  const bulkSave = useCallback(
    async (assignments: RotaAssignment[]) => {
      if (!week) return;
      try {
        await rotaApi.bulkAssign({
          rotaWeekId: week.id,
          assignments: buildAssignmentsPayload(assignments),
        });
        refetchWeek();
      } catch {
        showToast('Failed to save assignments', 'error');
        throw new Error('Save failed');
      }
    },
    [week, buildAssignmentsPayload, refetchWeek, showToast]
  );

  const handleAssign = useCallback(
    async (
      employeeId: number,
      date: Date,
      shiftType: string,
      isOffDay?: boolean,
      customLabel?: string,
      programName?: string
    ) => {
      if (!week) return;

      const dateStr = formatDateForApi(date);
      const existing = week.assignments.find(
        (a) =>
          a.employeeId === employeeId &&
          normalizeDateString(a.shiftDate) === dateStr
      );
      if (existing) {
        showToast('Employee already has an assignment on this date', 'warning');
        return;
      }

      const newAssignment: RotaAssignment = {
        id: -Date.now(),
        rotaWeekId: week.id,
        employeeId,
        employeeName: employees.find((e) => e.id === employeeId)?.name ?? '',
        shiftDate: dateStr,
        shiftType: isOffDay ? undefined : (shiftType as 'morning' | 'evening' | 'night'),
        isOffDay: isOffDay ?? false,
        customLabel,
        programName,
      };

      const updated = [...week.assignments, newAssignment];
      try {
        await bulkSave(updated);
        showToast('Assignment added', 'success');
      } catch {
        // Error already shown in bulkSave
      }
    },
    [week, employees, bulkSave, showToast]
  );

  const handleAssignProgram = useCallback(
    async (employeeId: number, date: Date, programName: string) => {
      if (!week) return;

      const dateStr = formatDateForApi(date);
      const existing = week.assignments.find(
        (a) =>
          a.employeeId === employeeId &&
          normalizeDateString(a.shiftDate) === dateStr
      );

      let updated: RotaAssignment[];
      if (existing) {
        updated = week.assignments.map((a) =>
          a.id === existing.id ? { ...a, programName } : a
        );
      } else {
        const newAssignment: RotaAssignment = {
          id: -Date.now(),
          rotaWeekId: week.id,
          employeeId,
          employeeName: employees.find((e) => e.id === employeeId)?.name ?? '',
          shiftDate: dateStr,
          programName,
        };
        updated = [...week.assignments, newAssignment];
      }

      try {
        await bulkSave(updated);
        showToast(existing ? 'Program added' : 'Assignment added', 'success');
      } catch {
        // Error already shown in bulkSave
      }
    },
    [week, employees, bulkSave, showToast]
  );

  const handleRemove = useCallback(
    async (assignmentId: number) => {
      try {
        await rotaApi.deleteAssignment(assignmentId);
        showToast('Assignment removed', 'success');
        refetchWeek();
      } catch {
        showToast('Failed to remove assignment', 'error');
      }
    },
    [showToast, refetchWeek]
  );

  const handleEdit = useCallback(
    (assignment: RotaAssignment | null, employeeId: number, date: Date) => {
      setEditModalState({ assignment, employeeId, date });
      setEditModalOpen(true);
    },
    []
  );

  const handleEditModalSave = useCallback(
    async (data: EditAssignmentFormData, empId: number, date: Date) => {
      if (!week) return;

      const dateStr = formatDateForApi(date);
      const existing = week.assignments.find(
        (a) =>
          a.employeeId === empId && normalizeDateString(a.shiftDate) === dateStr
      );

      const employeeName = employees.find((e) => e.id === empId)?.name ?? '';

      const updatedAssignment: RotaAssignment = {
        ...(existing ?? {
          id: -Date.now(),
          rotaWeekId: week.id,
          employeeId: empId,
          employeeName,
          shiftDate: dateStr,
        }),
        shiftType: data.shiftType,
        customLabel: data.customLabel,
        programName: data.programName,
        assignmentComments: data.assignmentComments,
        shiftStartTime: data.shiftStartTime,
        shiftEndTime: data.shiftEndTime,
        isOffDay: data.isOffDay ?? false,
      };

      const updated = existing
        ? week.assignments.map((a) =>
            a.id === existing.id ? updatedAssignment : a
          )
        : [...week.assignments, updatedAssignment];

      try {
        await bulkSave(updated);
        showToast(existing ? 'Assignment updated' : 'Assignment added', 'success');
      } catch {
        // Error already shown
      }
    },
    [week, employees, bulkSave, showToast]
  );

  const handleCustomClick = useCallback(() => {
    setEditModalState({ assignment: null, employeeId: null, date: null });
    setEditModalOpen(true);
  }, []);

  const handleMoveAssignment = useCallback(
    async (
      fromAssignment: RotaAssignment,
      toEmployeeId: number,
      toDate: Date
    ) => {
      if (!week) return;

      const toDateStr = formatDateForApi(toDate);
      const existingAtTarget = week.assignments.find(
        (a) =>
          a.employeeId === toEmployeeId &&
          normalizeDateString(a.shiftDate) === toDateStr
      );
      if (existingAtTarget) {
        showToast('Target cell already has an assignment', 'warning');
        return;
      }

      const moved: RotaAssignment = {
        ...fromAssignment,
        id: -Date.now(),
        employeeId: toEmployeeId,
        employeeName: employees.find((e) => e.id === toEmployeeId)?.name ?? fromAssignment.employeeName,
        shiftDate: toDateStr,
      };

      const updated = week.assignments
        .filter((a) => a.id !== fromAssignment.id)
        .concat(moved);

      try {
        await bulkSave(updated);
        showToast('Assignment moved', 'success');
      } catch {
        // Error already shown
      }
    },
    [week, employees, bulkSave, showToast]
  );

  const handleAutoRotate = async () => {
    if (!week) return;
    try {
      await rotaApi.autoRotate(week.id);
      showToast('Next week generated successfully', 'success');
      setSelectedWeekStart((prev) => new Date(prev.getTime() + WEEK_MS));
      queryClient.invalidateQueries({ queryKey: ['rotaWeek'] });
      setAutoRotateOpen(false);
    } catch {
      showToast('Failed to generate next week', 'error');
    }
  };

  const handleGenerateShareLink = async (expiresAt?: string) => {
    if (!week) throw new Error('No week selected');
    return rotaApi.generateShareLink(week.id, expiresAt);
  };

  const handleClearAll = useCallback(async () => {
    if (!week) return;
    setIsClearing(true);
    try {
      await rotaApi.bulkAssign({
        rotaWeekId: week.id,
        assignments: [],
      });
      showToast('All assignments cleared', 'success');
      refetchWeek();
      setClearAllOpen(false);
    } catch {
      showToast('Failed to clear assignments', 'error');
    } finally {
      setIsClearing(false);
    }
  }, [week, refetchWeek, showToast]);

  const handlePrevWeek = () =>
    setSelectedWeekStart((prev) => new Date(prev.getTime() - WEEK_MS));
  const handleNextWeek = () =>
    setSelectedWeekStart((prev) => new Date(prev.getTime() + WEEK_MS));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !week) return;

      const overData = over.data.current as
        | { type?: string; employeeId?: number; date?: string }
        | undefined;
      const activeData = active.data.current as
        | {
            type?: string;
            shiftType?: string;
            assignment?: RotaAssignment;
            programName?: string;
          }
        | undefined;

      if (
        overData?.type === 'employee-cell' &&
        typeof overData.employeeId === 'number' &&
        overData.date
      ) {
        const toDate = new Date(overData.date);

        if (activeData?.type === 'shift-option') {
          const shiftType = activeData.shiftType as string;
          if (shiftType === 'custom') return; // Handled by Custom button
          handleAssign(
            overData.employeeId,
            toDate,
            shiftType,
            shiftType === 'off'
          );
        } else if (activeData?.type === 'program' && activeData.programName) {
          handleAssignProgram(
            overData.employeeId,
            toDate,
            activeData.programName
          );
        } else if (activeData?.type === 'assignment' && activeData.assignment) {
          handleMoveAssignment(
            activeData.assignment,
            overData.employeeId,
            toDate
          );
        }
      }
    },
    [week, handleAssign, handleAssignProgram, handleMoveAssignment]
  );

  if (departments.length === 0 && !departmentsLoading) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Departments</AlertTitle>
        <AlertDescription>
          No departments are available. Contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <WeekNavigator
            weekStart={selectedWeekStart}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
          />

          <div className="w-48">
            <Select
              value={selectedDepartmentId?.toString() ?? ''}
              onValueChange={(v) => setSelectedDepartmentId(v ? parseInt(v, 10) : null)}
              disabled={!isAdmin}
            >
              <SelectTrigger aria-label="Select department">
                <SelectValue placeholder="Select department" />
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
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClearAllOpen(true)}
            disabled={!week || (week?.assignments?.length ?? 0) === 0}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRotateOpen(true)}
            disabled={!week}
          >
            Auto-Rotate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            disabled={!week}
          >
            Share
          </Button>
          {week?.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => week && publishMutation.mutate(week.id)}
              disabled={publishMutation.isPending}
            >
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          <aside className="hidden lg:block shrink-0">
            <ShiftOptionsPool
              onCustomClick={handleCustomClick}
              department={selectedDepartment}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <RotaCalendar
              week={week}
              department={selectedDepartment}
              employees={employees}
              weekDates={weekDates}
              isLoading={weekLoading || (!!selectedDepartmentId && employeesLoading)}
              onAssign={handleAssign}
              onRemove={handleRemove}
              onEdit={handleEdit}
            />
          </div>
        </div>
      </DndContext>

      <EditAssignmentModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        assignment={editModalState.assignment}
        employeeId={editModalState.employeeId}
        date={editModalState.date}
        employees={employees}
        weekDates={weekDates}
        department={selectedDepartment}
        onSave={handleEditModalSave}
      />

      <AutoRotateModal
        open={autoRotateOpen}
        onOpenChange={setAutoRotateOpen}
        currentWeek={week ?? null}
        weekStart={selectedWeekStart}
        onConfirm={handleAutoRotate}
      />

      <ShareRotaModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        weekId={week?.id ?? null}
        onGenerateLink={handleGenerateShareLink}
        onCopySuccess={() => showToast('Link copied!', 'success')}
      />

      <AlertDialog open={clearAllOpen} onOpenChange={setClearAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all assignments?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all shift assignments from the current week. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : 'Clear All'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
