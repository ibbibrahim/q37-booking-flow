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
import { AlertCircle } from 'lucide-react';
import { RotaCalendar } from '../components/RotaCalendar';
import { EmployeePool } from '../components/EmployeePool';
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

  // Auto-select first department for non-Admin users
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

  const handleAssign = useCallback(
    async (employeeId: number, date: Date, shiftType: string) => {
      if (!week) return;

      const dateStr = formatDateForApi(date);
      const existingOnDate = week.assignments.find(
        (a) =>
          a.employeeId === employeeId &&
          normalizeDateString(a.shiftDate) === dateStr &&
          a.shiftType !== shiftType
      );

      if (existingOnDate) {
        showToast(
          'Employee already assigned to another shift on this date',
          'warning'
        );
        return;
      }

      const newAssignment = {
        employeeId,
        shiftDate: dateStr,
        shiftType: shiftType as 'morning' | 'evening' | 'night',
      };

      const updatedAssignments = [
        ...week.assignments.map((a) => ({
          employeeId: a.employeeId,
          shiftDate: normalizeDateString(a.shiftDate),
          shiftType: a.shiftType,
        })),
        newAssignment,
      ];

      try {
        await rotaApi.bulkAssign({
          rotaWeekId: week.id,
          assignments: updatedAssignments,
        });
        showToast('Employee assigned', 'success');
        refetchWeek();
      } catch {
        showToast('Failed to assign employee', 'error');
      }
    },
    [week, showToast, refetchWeek]
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

      const employeeData = active.data.current as
        | { employeeId?: number; type?: string }
        | undefined;
      const cellData = over.data.current as
        | { date?: string; shiftType?: string }
        | undefined;

      if (
        employeeData?.type === 'employee' &&
        typeof employeeData.employeeId === 'number' &&
        cellData?.date &&
        cellData?.shiftType
      ) {
        const date = new Date(cellData.date);
        handleAssign(employeeData.employeeId, date, cellData.shiftType);
      }
    },
    [week, handleAssign]
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
              disabled={!isAdmin}>
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
            onClick={() => setAutoRotateOpen(true)}
            disabled={!week}>
            Auto-Rotate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareModalOpen(true)}
            disabled={!week}>
            Share
          </Button>
          {week?.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => week && publishMutation.mutate(week.id)}
              disabled={publishMutation.isPending}>
              {publishMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          )}
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          <aside className="hidden lg:block shrink-0">
            <EmployeePool
              employees={employees}
              assignments={week?.assignments ?? []}
              weekDates={weekDates}
              selectedDate={null}
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
            />
          </div>
        </div>
      </DndContext>

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
    </div>
  );
}
