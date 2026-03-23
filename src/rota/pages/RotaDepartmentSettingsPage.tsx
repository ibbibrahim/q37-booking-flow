import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Edit, Trash } from 'lucide-react';
import { rotaApi } from '../api/rotaApi';
import { ShiftTypeModal } from '../components/ShiftTypeModal';
import { useToast } from '@/contexts/ToastContext';
import type { RotaShiftType } from '../types/rota';
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

export function RotaDepartmentSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const departmentId = id ? parseInt(id, 10) : NaN;

  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<RotaShiftType | null>(null);
  const [deletingShiftId, setDeletingShiftId] = useState<number | null>(null);

  const { data: department } = useQuery({
    queryKey: ['rotaDepartments'],
    queryFn: rotaApi.getDepartments,
    select: (depts) => depts.find((d) => d.id === departmentId),
    enabled: !isNaN(departmentId),
  });

  const { data: shiftTypes = [], refetch: refetchShiftTypes } = useQuery({
    queryKey: ['departmentShiftTypes', departmentId],
    queryFn: () => rotaApi.getDepartmentShiftTypes(departmentId),
    enabled: !isNaN(departmentId),
  });

  const deleteMutation = useMutation({
    mutationFn: (shiftId: number) =>
      rotaApi.deleteShiftType(departmentId, shiftId),
    onSuccess: () => {
      showToast('Shift type deleted', 'success');
      queryClient.invalidateQueries({ queryKey: ['departmentShiftTypes', departmentId] });
      refetchShiftTypes();
      setDeletingShiftId(null);
    },
    onError: () => {
      showToast('Failed to delete shift type', 'error');
    },
  });

  const handleEditShift = (shift: RotaShiftType) => {
    setEditingShift(shift);
  };

  const handleDeleteShift = (shiftId: number) => {
    setDeletingShiftId(shiftId);
  };

  const handleModalSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['departmentShiftTypes', departmentId] });
    refetchShiftTypes();
    setShowAddShiftModal(false);
    setEditingShift(null);
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h ?? '0', 10);
    const min = parseInt(m ?? '0', 10);
    if (hour === 0 && min === 0) return '12am';
    if (hour === 12 && min === 0) return '12pm';
    if (hour > 12) return `${hour - 12}${min ? ':' + String(min).padStart(2, '0') : ''}pm`;
    return `${hour}${min ? ':' + String(min).padStart(2, '0') : ''}am`;
  };

  if (isNaN(departmentId)) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">Invalid department</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/rota')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-xl font-semibold">
          {department?.name ?? 'Department'} Settings
        </h1>
      </div>

      <Tabs defaultValue="shift-types">
        <TabsList>
          <TabsTrigger value="shift-types">Shift Types</TabsTrigger>
        </TabsList>

        <TabsContent value="shift-types">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Shift Types</CardTitle>
              <Button
                onClick={() => setShowAddShiftModal(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Shift Type
              </Button>
            </CardHeader>
            <CardContent>
              {shiftTypes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No shift types defined yet. Add one to customize shifts for this
                  department.
                </p>
              ) : (
                <div className="space-y-2">
                  {[...shiftTypes]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((shift) => (
                      <div
                        key={shift.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded shrink-0"
                            style={{ backgroundColor: shift.color || '#e5e7eb' }}
                          />
                          <div>
                            <div className="font-medium">{shift.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditShift(shift)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteShift(shift.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ShiftTypeModal
        open={showAddShiftModal}
        onOpenChange={setShowAddShiftModal}
        departmentId={departmentId}
        shiftType={null}
        onSuccess={handleModalSuccess}
      />

      <ShiftTypeModal
        open={!!editingShift}
        onOpenChange={(open) => !open && setEditingShift(null)}
        departmentId={departmentId}
        shiftType={editingShift}
        onSuccess={handleModalSuccess}
      />

      <AlertDialog
        open={deletingShiftId !== null}
        onOpenChange={(open) => !open && setDeletingShiftId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete shift type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the shift type. Assignments using this shift may be
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingShiftId && deleteMutation.mutate(deletingShiftId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
