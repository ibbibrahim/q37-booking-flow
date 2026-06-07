import React, { useState, useEffect } from 'react';
import { Loader2, Copy, Calendar, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { usersApi } from '@/admin/services/usersApi';
import type { UserDto } from '@/admin/types/user';
import { editingApi } from '../api/editingApi';
import { parseApproximateDurationToMinutes } from '../utils/editingUtils';
import type { EditingRequest, UpdateEditorAssignmentDto, ConflictDto } from '../types/editing';

const DURATION_PRESETS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1 hour 30 min' },
  { value: '120', label: '2 hours' },
  { value: '150', label: '2 hours 30 min' },
  { value: '180', label: '3 hours' },
  { value: 'custom', label: 'Other' },
] as const;

interface SessionFormData {
  editorId: number | '';
  editRoomNumber: string;
  availableDatetime: string;
  durationPreset: string;
  sessionDurationMinutes: number;
  customHours: number;
  customMinutes: number;
  editorComments: string;
}

interface EditorAssignmentFormProps {
  editingRequest: EditingRequest;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditorAssignmentForm: React.FC<EditorAssignmentFormProps> = ({
  editingRequest,
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clearConfirmIndex, setClearConfirmIndex] = useState<number | null>(null);
  const [editors, setEditors] = useState<UserDto[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDto[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    usersApi
      .getUsers({ roles: 'Editor', sortDir: 'asc', includeInactive: false })
      .then((res) => {
        const items = Array.isArray(res) ? res : (res?.items ?? []);
        setEditors(items);
      })
      .catch((err) => {
        console.error('Failed to load editors:', err);
        showToast('Failed to load editor list', 'error');
      });
  }, [showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const allConflicts: ConflictDto[] = [];
      let hasCompleteSession = false;
      const runChecks = async () => {
        setCheckingAvailability(true);
        try {
          for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            if (!session.editorId || !session.editRoomNumber || !session.availableDatetime || !session.sessionDurationMinutes) {
              continue;
            }
            hasCompleteSession = true;
            const result = await editingApi.checkAvailability({
              editorId: Number(session.editorId),
              editRoomNumber: session.editRoomNumber,
              sessionStartDatetime: `${session.availableDatetime}:00.000Z`,
              sessionDurationMinutes: session.sessionDurationMinutes,
              excludeSessionId: editingRequest.editingSessions?.find((s) => s.sessionNumber === i + 1)?.id,
            });
            allConflicts.push(...result.conflicts);
          }
          setConflicts(hasCompleteSession ? allConflicts : []);
        } catch (error) {
          console.error('Availability check failed:', error);
          setConflicts([]);
        } finally {
          setCheckingAvailability(false);
        }
      };
      runChecks();
    }, 500);
    return () => clearTimeout(timer);
  }, [sessions, editingRequest.editingSessions]);

  const sessionsPerWeek = editingRequest.sessionsPerWeek ?? 1;
  const editingSessions = editingRequest.editingSessions ?? [];

  const [sessions, setSessions] = useState<SessionFormData[]>(() => {
    const initial: SessionFormData[] = [];
    for (let i = 0; i < sessionsPerWeek; i++) {
      const existingSession = editingSessions.find((s) => s.sessionNumber === i + 1);
      let availableDatetimeLocal = '';

      if (existingSession?.availableDatetime) {
        const dt = new Date(existingSession.availableDatetime);
        availableDatetimeLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      } else if (existingSession?.requestedDate) {
        const requestedDate = new Date(existingSession.requestedDate);
        requestedDate.setHours(10, 0, 0, 0);
        availableDatetimeLocal = new Date(
          requestedDate.getTime() - requestedDate.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);
      } else if (i === 0 && (editingRequest.editorId != null || editingRequest.editorName)) {
        const dt = editingRequest.availableDatetime
          ? new Date(editingRequest.availableDatetime)
          : null;
        availableDatetimeLocal = dt
          ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '';
      }

      const defaultMins = existingSession?.sessionDurationMinutes ?? parseApproximateDurationToMinutes(editingRequest.approximateDuration || '');
      const preset = DURATION_PRESETS.find((p) => p.value !== 'custom' && parseInt(p.value, 10) === defaultMins);
      const defaultDuration = preset
        ? { durationPreset: preset.value, sessionDurationMinutes: defaultMins, customHours: 0, customMinutes: 0 }
        : {
            durationPreset: 'custom',
            sessionDurationMinutes: defaultMins,
            customHours: Math.min(12, Math.floor(defaultMins / 60)),
            customMinutes: defaultMins % 60,
          };
      initial.push({
        editorId: existingSession?.editorId ?? editingRequest.editorId ?? '',
        editRoomNumber: existingSession?.editRoomNumber || editingRequest.editRoomNumber || '',
        availableDatetime: availableDatetimeLocal,
        durationPreset: defaultDuration.durationPreset,
        sessionDurationMinutes: defaultDuration.sessionDurationMinutes,
        customHours: defaultDuration.customHours,
        customMinutes: defaultDuration.customMinutes,
        editorComments: existingSession?.editorComments || editingRequest.editorComments || '',
      });
    }
    return initial;
  });

  const updateSession = (index: number, field: keyof SessionFormData, value: string | number) => {
    setSessions((prev) => {
      const updated = [...prev];
      const next = { ...updated[index], [field]: value };
      if (field === 'durationPreset') {
        const presetVal = value as string;
        if (presetVal === 'custom') {
          next.sessionDurationMinutes = next.customHours * 60 + next.customMinutes;
        } else {
          next.sessionDurationMinutes = parseInt(presetVal, 10) || 60;
          next.customHours = Math.floor(next.sessionDurationMinutes / 60);
          next.customMinutes = next.sessionDurationMinutes % 60;
        }
      } else if (field === 'customHours' || field === 'customMinutes') {
        const hours = field === 'customHours' ? (value as number) : next.customHours;
        const mins = field === 'customMinutes' ? (value as number) : next.customMinutes;
        next.customHours = Math.min(12, Math.max(0, hours));
        next.customMinutes = Math.min(59, Math.max(0, mins));
        next.sessionDurationMinutes = next.customHours * 60 + next.customMinutes;
      }
      updated[index] = next;
      return updated;
    });
  };

  const clearSession = (index: number) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        editorId: '',
        editRoomNumber: '',
        availableDatetime: '',
      };
      return updated;
    });
  };

  const copyFromPrevious = (toIndex: number) => {
    if (toIndex === 0) return;
    const fromIndex = toIndex - 1;
    setSessions((prev) => {
      const updated = [...prev];
      updated[toIndex] = {
        ...prev[toIndex],
        editorId: prev[fromIndex].editorId,
        editRoomNumber: prev[fromIndex].editRoomNumber,
        availableDatetime: '',
        durationPreset: prev[fromIndex].durationPreset,
        sessionDurationMinutes: prev[fromIndex].sessionDurationMinutes,
        customHours: prev[fromIndex].customHours,
        customMinutes: prev[fromIndex].customMinutes,
        editorComments: prev[fromIndex].editorComments,
      };
      return updated;
    });
    showToast(`Copied editor and room from Session ${fromIndex + 1}`, 'info');
  };

  const validateForm = (): boolean => {
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const isClearing = !session.editorId && !session.editRoomNumber && !session.availableDatetime;
      if (isClearing) continue; // clearing a session is always valid
      if (!session.editorId) {
        showToast(`Session ${i + 1}: Editor Assigned is required`, 'error');
        return false;
      }
      if (!session.editRoomNumber.trim()) {
        showToast(`Session ${i + 1}: Edit Room Number is required`, 'error');
        return false;
      }
      if (!session.availableDatetime) {
        showToast(`Session ${i + 1}: Available Date and Time is required`, 'error');
        return false;
      }
      if (!session.sessionDurationMinutes || session.sessionDurationMinutes <= 0) {
        showToast(`Session ${i + 1}: Session Duration is required`, 'error');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const sessionDtos: UpdateEditorAssignmentDto[] = sessions.map((session, i) => {
        const isClearing =
          !session.editorId && !session.editRoomNumber && !session.availableDatetime;
        return {
          sessionNumber: i + 1,
          editorId: session.editorId ? Number(session.editorId) : undefined,
          editRoomNumber: session.editRoomNumber.trim() || undefined,
          availableDatetime: session.availableDatetime
            ? `${session.availableDatetime}:00.000Z`
            : undefined,
          sessionDurationMinutes: session.sessionDurationMinutes || undefined,
          editorComments: session.editorComments.trim() || undefined,
          unassign: isClearing,
        };
      });
      await editingApi.updateEditorAssignments(editingRequest.id, { sessions: sessionDtos });

      showToast(
        `All ${sessions.length} session(s) assigned and producer notified`,
        'success'
      );
      onSuccess();
    } catch (error: unknown) {
      console.error('Error updating editor assignment:', error);
      const err = error as { response?: { data?: { error?: string } } };
      const message =
        err.response?.data?.error || 'Failed to update assignment. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          Assign {sessionsPerWeek} Session{sessionsPerWeek > 1 ? 's' : ''}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in all session details below. You can copy editor/room info between sessions.
        </p>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {sessions.map((session, index) => (
          <Card key={index} className="border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <h4 className="font-medium text-sm">Session {index + 1}</h4>
                {editingRequest.editingSessions?.[index]?.requestedDate && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar size={12} />
                    Requested:{' '}
                    {new Date(
                      editingRequest.editingSessions[index].requestedDate!,
                    ).toLocaleDateString('en-GB')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFromPrevious(index)}
                    className="gap-1.5 h-8"
                  >
                    <Copy size={14} />
                    Copy from Session {index}
                  </Button>
                )}
                {(session.editorId || session.editRoomNumber || session.availableDatetime) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setClearConfirmIndex(index)}
                    className="gap-1.5 h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`editor-${index}`}>
                  Editor Assigned <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={session.editorId ? String(session.editorId) : undefined}
                  onValueChange={(value) => updateSession(index, 'editorId', value ? parseInt(value, 10) : '')}
                >
                  <SelectTrigger id={`editor-${index}`}>
                    <SelectValue placeholder="Select editor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(editors ?? []).map((editor) => (
                      <SelectItem key={editor.id} value={String(editor.id)}>
                        {editor.displayName || editor.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`room-${index}`}>
                  Edit Room Number <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={session.editRoomNumber}
                  onValueChange={(value) => updateSession(index, 'editRoomNumber', value)}
                >
                  <SelectTrigger id={`room-${index}`}>
                    <SelectValue placeholder="Room number (3 to 8)" />
                  </SelectTrigger>
                  <SelectContent>
                    {['3', '4', '5', '6', '7', '8'].map((room) => (
                      <SelectItem key={room} value={room}>
                        Edit Room {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`datetime-${index}`}>
                  Available Date and Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`datetime-${index}`}
                  type="datetime-local"
                  value={session.availableDatetime}
                  onChange={(e) => updateSession(index, 'availableDatetime', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`duration-${index}`}>Session Duration</Label>
                <Select
                  value={session.durationPreset}
                  onValueChange={(v) => updateSession(index, 'durationPreset', v)}
                >
                  <SelectTrigger id={`duration-${index}`}>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {session.durationPreset === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label htmlFor={`hours-${index}`} className="text-xs">Hours (max 12)</Label>
                      <Input
                        id={`hours-${index}`}
                        type="number"
                        min={0}
                        max={12}
                        value={session.customHours || ''}
                        onChange={(e) =>
                          updateSession(index, 'customHours', parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`minutes-${index}`} className="text-xs">Minutes (max 59)</Label>
                      <Input
                        id={`minutes-${index}`}
                        type="number"
                        min={0}
                        max={59}
                        value={session.customMinutes || ''}
                        onChange={(e) =>
                          updateSession(index, 'customMinutes', parseInt(e.target.value, 10) || 0)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`comments-${index}`}>Editor Comments</Label>
                <Textarea
                  id={`comments-${index}`}
                  value={session.editorComments}
                  onChange={(e) => updateSession(index, 'editorComments', e.target.value)}
                  placeholder="Optional comments"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {conflicts.length > 0 && (
        <Alert variant="default" className="mt-3 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/30">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            ⚠️ Conflict Detected (Flexible)
          </AlertTitle>
          <AlertDescription>
            <p className="text-amber-700 dark:text-amber-300 text-sm mb-2">
              The following conflicts were detected. You may still proceed if you choose to.
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-amber-800 dark:text-amber-200">
              {conflicts.map((c, i) => (
                <li key={i}>{c.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={clearConfirmIndex !== null} onOpenChange={(open) => !open && setClearConfirmIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear session fields?</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear the editor, room, and date/time for Session {(clearConfirmIndex ?? 0) + 1}. You can re-fill them before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (clearConfirmIndex !== null) {
                  clearSession(clearConfirmIndex);
                  setClearConfirmIndex(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Assigning...
            </>
          ) : (
            <>Assign All Sessions & Notify Producer</>
          )}
        </Button>
      </div>
    </div>
  );
};
