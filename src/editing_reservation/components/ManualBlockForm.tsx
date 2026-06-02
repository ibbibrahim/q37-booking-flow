import React, { useState, useEffect } from 'react';
import { Loader2, Copy, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
import type {
  EditingRequest,
  ConflictDto,
  CreateManualBlockDto,
  UpdateManualBlockDto,
} from '../types/editing';

const DURATION_PRESETS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1 hour 30 min' },
  { value: '120', label: '2 hours' },
  { value: '150', label: '2 hours 30 min' },
  { value: '180', label: '3 hours' },
  { value: 'custom', label: 'Other' },
] as const;

const APPROX_DURATION_PRESETS = [
  '30 min',
  '1 hour',
  '1 hour 30 min',
  '2 hours',
  '2 hours 30 min',
  '3 hours',
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

interface ManualBlockFormProps {
  mode: 'create' | 'edit';
  initialRequest?: EditingRequest;
  onSuccess: () => void;
  onCancel: () => void;
}

export const ManualBlockForm: React.FC<ManualBlockFormProps> = ({
  mode,
  initialRequest,
  onSuccess,
  onCancel,
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editors, setEditors] = useState<UserDto[]>([]);
  const [conflicts, setConflicts] = useState<ConflictDto[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [programName, setProgramName] = useState(initialRequest?.programName ?? '');
  const [approxDurationPreset, setApproxDurationPreset] = useState(() => {
    const duration = initialRequest?.approximateDuration ?? '';
    return APPROX_DURATION_PRESETS.includes(duration as (typeof APPROX_DURATION_PRESETS)[number])
      ? duration
      : duration
        ? 'other'
        : '';
  });
  const [customApproxDuration, setCustomApproxDuration] = useState(() => {
    const duration = initialRequest?.approximateDuration ?? '';
    return APPROX_DURATION_PRESETS.includes(duration as (typeof APPROX_DURATION_PRESETS)[number])
      ? ''
      : duration;
  });
  const [sessionsPerWeek, setSessionsPerWeek] = useState(initialRequest?.sessionsPerWeek ?? 1);

  const buildInitialSessions = (count: number): SessionFormData[] => {
    const editingSessions = initialRequest?.editingSessions ?? [];
    const initial: SessionFormData[] = [];
    for (let i = 0; i < count; i++) {
      const existingSession = editingSessions.find((s) => s.sessionNumber === i + 1);
      let availableDatetimeLocal = '';
      if (existingSession?.availableDatetime) {
        const dt = new Date(existingSession.availableDatetime);
        availableDatetimeLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
      const defaultMins =
        existingSession?.sessionDurationMinutes ??
        parseApproximateDurationToMinutes(initialRequest?.approximateDuration || '');
      const preset = DURATION_PRESETS.find(
        (p) => p.value !== 'custom' && parseInt(p.value, 10) === defaultMins
      );
      const defaultDuration = preset
        ? { durationPreset: preset.value, sessionDurationMinutes: defaultMins, customHours: 0, customMinutes: 0 }
        : {
            durationPreset: 'custom',
            sessionDurationMinutes: defaultMins,
            customHours: Math.min(12, Math.floor(defaultMins / 60)),
            customMinutes: defaultMins % 60,
          };
      initial.push({
        editorId: existingSession?.editorId ?? '',
        editRoomNumber: existingSession?.editRoomNumber || '',
        availableDatetime: availableDatetimeLocal,
        durationPreset: defaultDuration.durationPreset,
        sessionDurationMinutes: defaultDuration.sessionDurationMinutes,
        customHours: defaultDuration.customHours,
        customMinutes: defaultDuration.customMinutes,
        editorComments: existingSession?.editorComments || '',
      });
    }
    return initial;
  };

  const [sessions, setSessions] = useState<SessionFormData[]>(() =>
    buildInitialSessions(initialRequest?.sessionsPerWeek ?? 1)
  );

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
            if (
              !session.editorId ||
              !session.editRoomNumber ||
              !session.availableDatetime ||
              !session.sessionDurationMinutes
            ) {
              continue;
            }
            hasCompleteSession = true;
            const result = await editingApi.checkAvailability({
              editorId: Number(session.editorId),
              editRoomNumber: session.editRoomNumber,
              sessionStartDatetime: `${session.availableDatetime}:00.000Z`,
              sessionDurationMinutes: session.sessionDurationMinutes,
              excludeSessionId: initialRequest?.editingSessions?.find(
                (s) => s.sessionNumber === i + 1
              )?.id,
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
  }, [sessions, initialRequest?.editingSessions]);

  const handleSessionsPerWeekChange = (value: number) => {
    setSessionsPerWeek(value);
    setSessions((prev) => {
      if (value > prev.length) {
        const next = [...prev];
        while (next.length < value) {
          const defaultMins = parseApproximateDurationToMinutes(getApproximateDurationValue());
          const preset = DURATION_PRESETS.find(
            (p) => p.value !== 'custom' && parseInt(p.value, 10) === defaultMins
          );
          next.push({
            editorId: '',
            editRoomNumber: '',
            availableDatetime: '',
            durationPreset: preset?.value ?? '60',
            sessionDurationMinutes: defaultMins,
            customHours: Math.floor(defaultMins / 60),
            customMinutes: defaultMins % 60,
            editorComments: '',
          });
        }
        return next;
      }
      return prev.slice(0, value);
    });
  };

  const getApproximateDurationValue = (): string => {
    if (approxDurationPreset === 'other') return customApproxDuration.trim();
    return approxDurationPreset;
  };

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
    if (!programName.trim()) {
      showToast('Program Name is required', 'error');
      return false;
    }
    const approxDuration = getApproximateDurationValue();
    if (!approxDuration) {
      showToast('Approximate Duration is required', 'error');
      return false;
    }
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (!session.editorId) {
        showToast(`Session ${i + 1}: Editor is required`, 'error');
        return false;
      }
      if (!session.editRoomNumber.trim()) {
        showToast(`Session ${i + 1}: Edit Room Number is required`, 'error');
        return false;
      }
      if (!session.availableDatetime) {
        showToast(`Session ${i + 1}: Date and Time is required`, 'error');
        return false;
      }
      if (!session.sessionDurationMinutes || session.sessionDurationMinutes <= 0) {
        showToast(`Session ${i + 1}: Session Duration is required`, 'error');
        return false;
      }
    }
    return true;
  };

  const buildDto = (): CreateManualBlockDto | UpdateManualBlockDto => ({
    programName: programName.trim(),
    approximateDuration: getApproximateDurationValue(),
    sessionsPerWeek,
    sessions: sessions.map((session, index) => ({
      sessionNumber: index + 1,
      editorId: Number(session.editorId),
      editRoomNumber: session.editRoomNumber.trim(),
      availableDatetime: session.availableDatetime,
      sessionDurationMinutes: session.sessionDurationMinutes,
      editorComments: session.editorComments.trim() || undefined,
    })),
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const dto = buildDto();
      if (mode === 'edit' && initialRequest?.id) {
        await editingApi.updateManualBlock(initialRequest.id, dto);
        showToast('Manual block updated successfully', 'success');
      } else {
        await editingApi.createManualBlock(dto);
        showToast('Manual block created successfully', 'success');
      }
      onSuccess();
    } catch (error: unknown) {
      console.error('Error saving manual block:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(
        err.response?.data?.error || 'Failed to save manual block. Please try again.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          {mode === 'edit' ? 'Edit Manual Block' : 'Create Manual Block'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Block a room directly without going through the producer request flow.
        </p>
      </div>

      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
        <div className="space-y-1.5">
          <Label htmlFor="programName">
            Program Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="programName"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            placeholder="Enter program name"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="approxDuration">
            Approximate Duration <span className="text-red-500">*</span>
          </Label>
          <Select
            value={approxDurationPreset}
            onValueChange={(value) => {
              setApproxDurationPreset(value);
              if (value !== 'other') setCustomApproxDuration('');
            }}
          >
            <SelectTrigger id="approxDuration">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {APPROX_DURATION_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {preset}
                </SelectItem>
              ))}
              <SelectItem value="other">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
          {approxDurationPreset === 'other' && (
            <Input
              value={customApproxDuration}
              onChange={(e) => setCustomApproxDuration(e.target.value)}
              placeholder="e.g., 45 min, 4 hours"
              className="mt-2"
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sessionsPerWeek">
            How many sessions <span className="text-red-500">*</span>
          </Label>
          <Select
            value={sessionsPerWeek.toString()}
            onValueChange={(value) => handleSessionsPerWeekChange(parseInt(value, 10))}
          >
            <SelectTrigger id="sessionsPerWeek">
              <SelectValue placeholder="Select sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Session</SelectItem>
              <SelectItem value="2">2 Sessions</SelectItem>
              <SelectItem value="3">3 Sessions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {sessions.map((session, index) => (
          <Card key={index} className="border-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <h4 className="font-medium text-sm">Session {index + 1}</h4>
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
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor={`editor-${index}`}>
                  Editor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={session.editorId ? String(session.editorId) : undefined}
                  onValueChange={(value) =>
                    updateSession(index, 'editorId', value ? parseInt(value, 10) : '')
                  }
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
                  Date &amp; Time <span className="text-red-500">*</span>
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
                      <Label htmlFor={`hours-${index}`} className="text-xs">
                        Hours (max 12)
                      </Label>
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
                      <Label htmlFor={`minutes-${index}`} className="text-xs">
                        Minutes (max 59)
                      </Label>
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
                <Label htmlFor={`comments-${index}`}>Comments</Label>
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
        <Alert
          variant="default"
          className="mt-3 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/30"
        >
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Conflict Detected (Flexible)
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

      <div className="flex gap-2 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting || checkingAvailability} className="gap-1.5">
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : mode === 'edit' ? (
            'Update Manual Block'
          ) : (
            'Create Manual Block'
          )}
        </Button>
      </div>
    </div>
  );
};
