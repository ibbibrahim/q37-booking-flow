import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragCancelEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type Active,
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
import { AlertCircle, Copy, Trash2, Settings } from 'lucide-react';
import { RotaCalendar } from '../components/RotaCalendar';
import { ShiftOptionsPool } from '../components/ShiftOptionsPool';
import { RotaDragOverlay } from '../components/RotaDragOverlay';
import { dndDropAnimation } from '../utils/rotaMotion';
import { EditAssignmentModal } from '../components/EditAssignmentModal';
import { WeekNavigator } from '../components/WeekNavigator';
import { AutoRotateModal } from '../components/AutoRotateModal';
import { ShareRotaModal } from '../components/ShareRotaModal';
import { CopyWeekModal } from '../components/CopyWeekModal';
import { rotaApi } from '../api/rotaApi';
import {
  getWeekStart,
  getWeekDates,
  formatDateForApi,
  normalizeDateString,
} from '../utils/dateUtils';
import type { RotaAssignment, RotaAssignPayload, RotaShiftType } from '../types/rota';
import type { EditAssignmentFormData } from '../components/EditAssignmentModal';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Only shift timing / type — program, comments, and custom label stay with each employee. */
function getSwappableShiftFields(a: RotaAssignment) {
  return {
    shiftTypeId: a.shiftTypeId,
    shiftType: a.shiftType,
    isOffDay: a.isOffDay,
    shiftStartTime: a.shiftStartTime,
    shiftEndTime: a.shiftEndTime,
  };
}

function mergeShiftFieldsOnto(
  base: RotaAssignment,
  fields: ReturnType<typeof getSwappableShiftFields>
): RotaAssignment {
  const next: RotaAssignment = {
    ...base,
    shiftTypeId: fields.shiftTypeId,
    shiftType: fields.shiftType,
    isOffDay: fields.isOffDay ?? false,
    shiftStartTime: fields.shiftStartTime,
    shiftEndTime: fields.shiftEndTime,
  };
  if (next.isOffDay) {
    next.shiftTypeId = undefined;
    next.shiftType = undefined;
  }
  return next;
}

export function RotaManagementPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = user?.roles?.includes('Admin') ?? false;
  const isRotaTeamLead = user?.roles?.includes('RotaTeamLead') ?? false;
  const canAccessDepartmentSettings = isAdmin || isRotaTeamLead;

  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() =>
    getWeekStart(new Date())
  );
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(
    null
  );
  const [autoRotateOpen, setAutoRotateOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalState, setEditModalState] = useState<{
    assignment: RotaAssignment | null;
    employeeId: number | null;
    date: Date | null;
  }>({ assignment: null, employeeId: null, date: null });
  const [activeDrag, setActiveDrag] = useState<Active | null>(null);

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['rotaDepartments'],
    queryFn: rotaApi.getDepartments,
  });

  const { data: shiftTypesFromApi = [] } = useQuery({
    queryKey: ['departmentShiftTypes', selectedDepartmentId],
    queryFn: () => rotaApi.getDepartmentShiftTypes(selectedDepartmentId!),
    enabled: !!selectedDepartmentId,
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

  const parentDepartments = useMemo(
    () => departments.filter((d) => !d.parentDepartmentId),
    [departments]
  );

  useEffect(() => {
    if (departmentsLoading || selectedDepartmentId !== null) return;
    if (!isAdmin && parentDepartments.length > 0) {
      setSelectedDepartmentId(parentDepartments[0].id);
    }
  }, [departments, departmentsLoading, isAdmin, selectedDepartmentId, parentDepartments]);

  const selectedDepartment = departments.find(
    (d) => d.id === selectedDepartmentId
  ) ?? null;

  const hideProgramNamesForDepartment =
    selectedDepartment?.name?.trim().toLowerCase() === 'news and digital';

  const shiftTypes: RotaShiftType[] = useMemo(() => {
    const fromDept = selectedDepartment?.shiftTypes;
    if (fromDept?.length) return fromDept;
    return shiftTypesFromApi;
  }, [selectedDepartment, shiftTypesFromApi]);

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
        shiftTypeId: a.shiftTypeId,
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
      opts: RotaAssignPayload
    ) => {
      if (!week) return;

      const dateStr = formatDateForApi(date);
      const existing = week.assignments.find(
        (a) =>
          a.employeeId === employeeId &&
          normalizeDateString(a.shiftDate) === dateStr
      );

      const employeeName = employees.find((e) => e.id === employeeId)?.name ?? '';

      const updatedAssignment: RotaAssignment = {
        ...(existing ?? {
          id: -Date.now(),
          rotaWeekId: week.id,
          employeeId,
          employeeName,
          shiftDate: dateStr,
        }),
        shiftTypeId: opts.isOffDay ? undefined : opts.shiftTypeId,
        shiftType: opts.isOffDay ? undefined : opts.shiftType,
        isOffDay: opts.isOffDay ?? false,
        customLabel: opts.customLabel,
        programName: opts.programName ?? existing?.programName,
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
        shiftTypeId: data.isOffDay ? undefined : data.shiftTypeId,
        shiftType: data.isOffDay ? undefined : data.shiftType,
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
        // Swap any two occupied cells (same or different day, same or different employee),
        // as long as the drop target is not the same assignment row.
        if (fromAssignment.id === existingAtTarget.id) {
          return;
        }
        const fromFields = getSwappableShiftFields(fromAssignment);
        const toFields = getSwappableShiftFields(existingAtTarget);
        const updated = week.assignments.map((a) => {
          if (a.id === fromAssignment.id) {
            return mergeShiftFieldsOnto(a, toFields);
          }
          if (a.id === existingAtTarget.id) {
            return mergeShiftFieldsOnto(a, fromFields);
          }
          return a;
        });
        try {
          await bulkSave(updated);
          showToast('Assignments swapped', 'success');
        } catch {
          // Error already shown in bulkSave
        }
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

  const handleGenerateShareLink = async () => {
    if (!week) throw new Error('No week selected');
    return rotaApi.generateShareLink(week.id);
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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDrag(event.active);
  }, []);

  const handleDragCancel = useCallback((_event: DragCancelEvent) => {
    setActiveDrag(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over || !week) return;

      const overData = over.data.current as
        | { type?: string; employeeId?: number; date?: string }
        | undefined;
      const activeData = active.data.current as
        | {
            type?: string;
            shiftKind?: 'shift' | 'off';
            shiftTypeId?: number;
            shiftType?: RotaShiftType;
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
          if (activeData.shiftKind === 'off') {
            handleAssign(overData.employeeId, toDate, { isOffDay: true });
          } else if (
            activeData.shiftKind === 'shift' &&
            activeData.shiftTypeId != null
          ) {
            handleAssign(overData.employeeId, toDate, {
              shiftTypeId: activeData.shiftTypeId,
              shiftType: activeData.shiftType,
            });
          }
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

          <div className="flex items-center gap-2">
            <div className="w-56">
              <Select
                value={selectedDepartmentId?.toString() ?? ''}
                onValueChange={(v) => setSelectedDepartmentId(v ? parseInt(v, 10) : null)}
                disabled={parentDepartments.length <= 1}
              >
                <SelectTrigger aria-label="Select department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {parentDepartments.map((d) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canAccessDepartmentSettings && selectedDepartmentId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate(`/rota/departments/${selectedDepartmentId}/settings`)
                }
                aria-label="Department settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
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
            onClick={() => setCopyModalOpen(true)}
            disabled={!week}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Week
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4">
          <aside className="hidden lg:block shrink-0">
            <ShiftOptionsPool
              onCustomClick={handleCustomClick}
              department={selectedDepartment}
              shiftTypes={shiftTypes}
              hideProgramNames={hideProgramNamesForDepartment}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <RotaCalendar
              week={week}
              department={selectedDepartment}
              employees={employees}
              weekDates={weekDates}
              shiftTypes={shiftTypes}
              isLoading={weekLoading || (!!selectedDepartmentId && employeesLoading)}
              onAssign={handleAssign}
              onRemove={handleRemove}
              onEdit={handleEdit}
            />
          </div>
        </div>
        <DragOverlay dropAnimation={dndDropAnimation}>
          <RotaDragOverlay active={activeDrag} shiftTypes={shiftTypes} />
        </DragOverlay>
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
        shiftTypes={shiftTypes}
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
        week={week}
        department={selectedDepartment}
        employees={employees}
        shiftTypes={shiftTypes}
        onGenerateLink={handleGenerateShareLink}
        onCopySuccess={() => showToast('Link copied!', 'success')}
      />

      <CopyWeekModal
        open={copyModalOpen}
        onOpenChange={setCopyModalOpen}
        currentWeekStart={selectedWeekStart}
        currentWeekId={week?.id}
        departmentId={selectedDepartmentId}
        onSuccess={() => {
          refetchWeek();
          setCopyModalOpen(false);
        }}
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
