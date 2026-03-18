import React, { useState, useEffect } from 'react';
import { FileText, Clock, AlertTriangle, AlertCircle, Calendar, Copy, Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
  getEditingStatusBadgeClass,
  getEditingStatusDisplayLabel,
  parseApproximateDurationToMinutes,
  formatDurationMinutes,
  addMinutesToDatetime,
  formatDateTime,
} from '../utils/editingUtils';
import { editingApi } from '../api/editingApi';
import type { EditingRequest, UpdateEditorAssignmentDto, ConflictDto, EditingSession } from '../types/editing';
import { SessionReportModal } from './SessionReportModal';

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

interface EditingRequestDetailProps {
  request: EditingRequest;
  canAssign?: boolean;
  onAssignSuccess?: () => void;
  currentUserId?: number;
  isSuperEditor?: boolean;
  isAdmin?: boolean;
  onReportComplete?: () => void;
}

export const EditingRequestDetail: React.FC<EditingRequestDetailProps> = ({
  request,
  canAssign = false,
  onAssignSuccess,
  currentUserId,
  isSuperEditor = false,
  isAdmin = false,
  onReportComplete,
}) => {
  const { showToast } = useToast();
  const isCancelled = request.status === 'Cancelled';
  const sessions = request.editingSessions ?? [];
  const sessionsPerWeek = request.sessionsPerWeek ?? 1;
  const hasSessions = sessions.length > 0;
  const hasLegacyAssignment =
    request.editorId != null || request.editorName || request.editRoomNumber || request.availableDatetime;

  const [sessionForms, setSessionForms] = useState<SessionFormData[]>(() => {
    const initial: SessionFormData[] = [];
    for (let i = 0; i < sessionsPerWeek; i++) {
      const existingSession = sessions.find((s) => s.sessionNumber === i + 1);
      let availableDatetimeLocal = '';
      if (existingSession?.availableDatetime) {
        const dt = new Date(existingSession.availableDatetime);
        availableDatetimeLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      } else if (existingSession?.requestedDate) {
        const requestedDate = new Date(existingSession.requestedDate);
        availableDatetimeLocal = new Date(
          requestedDate.getTime() - requestedDate.getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16);
      } else if (i === 0 && (request.editorId != null || request.editorName)) {
        const dt = request.availableDatetime ? new Date(request.availableDatetime) : null;
        availableDatetimeLocal = dt
          ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '';
      }
      const defaultDuration = (() => {
        const mins = existingSession?.sessionDurationMinutes ?? parseApproximateDurationToMinutes(request.approximateDuration || '');
        const preset = DURATION_PRESETS.find((p) => p.value !== 'custom' && parseInt(p.value, 10) === mins);
        if (preset) {
          return { durationPreset: preset.value, sessionDurationMinutes: mins, customHours: 0, customMinutes: 0 };
        }
        return {
          durationPreset: 'custom',
          sessionDurationMinutes: mins,
          customHours: Math.min(12, Math.floor(mins / 60)),
          customMinutes: mins % 60,
        };
      })();
      initial.push({
        editorId: existingSession?.editorId ?? request.editorId ?? '',
        editRoomNumber: existingSession?.editRoomNumber || request.editRoomNumber || '',
        availableDatetime: availableDatetimeLocal,
        durationPreset: defaultDuration.durationPreset,
        sessionDurationMinutes: defaultDuration.sessionDurationMinutes,
        customHours: defaultDuration.customHours,
        customMinutes: defaultDuration.customMinutes,
        editorComments: existingSession?.editorComments || request.editorComments || '',
      });
    }
    return initial;
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [editors, setEditors] = useState<UserDto[]>([]);
  const [conflictsBySession, setConflictsBySession] = useState<Record<number, ConflictDto[]>>({});
  const [reportModalSession, setReportModalSession] = useState<EditingSession | null>(null);
  const [reportModalMode, setReportModalMode] = useState<'submit' | 'view'>('submit');
  const [editingSessionIndex, setEditingSessionIndex] = useState<number | null>(null);

  useEffect(() => {
    if (canAssign) {
      usersApi
        .getUsers({ roles: 'Editor', sortDir: 'asc', includeInactive: false })
        .then((res) => {
          const items = Array.isArray(res) ? res : (res?.items ?? []);
          setEditors(items);
        })
        .catch((err) => {
          console.error('Failed to load editorss:', err);
          showToast('Failed to load editor list', 'error');
        });
    }
  }, [canAssign, showToast]);

  useEffect(() => {
    if (!canAssign) return;
    const timer = setTimeout(() => {
      const runChecks = async () => {
        try {
          const bySession: Record<number, ConflictDto[]> = {};
          for (let i = 0; i < sessionForms.length; i++) {
            const form = sessionForms[i];
            if (!form.editorId || !form.editRoomNumber || !form.availableDatetime || !form.sessionDurationMinutes) {
              continue;
            }
            const result = await editingApi.checkAvailability({
              editorId: Number(form.editorId),
              editRoomNumber: form.editRoomNumber,
              sessionStartDatetime: `${form.availableDatetime}:00.000Z`,
              sessionDurationMinutes: form.sessionDurationMinutes,
              excludeSessionId: sessions.find((s) => s.sessionNumber === i + 1)?.id,
            });
            bySession[i] = result.conflicts ?? [];
          }
          setConflictsBySession(bySession);
        } catch (error) {
          console.error('Availability check failed:', error);
          setConflictsBySession({});
        }
      };
      runChecks();
    }, 500);
    return () => clearTimeout(timer);
  }, [canAssign, sessionForms, sessions]);

  const updateSessionForm = (
    index: number,
    field: keyof SessionFormData,
    value: string | number
  ) => {
    setSessionForms((prev) => {
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

  const copyFromPreviousSession = (toIndex: number) => {
    if (toIndex === 0) return;
    const fromIndex = toIndex - 1;
    setSessionForms((prev) => {
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

  const validateAssignmentForm = (): boolean => {
    for (let i = 0; i < sessionForms.length; i++) {
      const form = sessionForms[i];
      if (form.editorId) {
        if (!form.editRoomNumber.trim()) {
          showToast(`Session ${i + 1}: Room/DateTime/Duration required when editor is selected`, 'error');
          return false;
        }
        if (!form.availableDatetime) {
          showToast(`Session ${i + 1}: Room/DateTime/Duration required when editor is selected`, 'error');
          return false;
        }
        if (!form.sessionDurationMinutes || form.sessionDurationMinutes <= 0) {
          showToast(`Session ${i + 1}: Room/DateTime/Duration required when editor is selected`, 'error');
          return false;
        }
      }
    }
    return true;
  };

  const handleAssignSubmit = async () => {
    if (isAssigning || !onAssignSuccess) return;
    if (!validateAssignmentForm()) return;
    setIsAssigning(true);
    try {
      for (let i = 0; i < sessionForms.length; i++) {
        const form = sessionForms[i];
        const dto: UpdateEditorAssignmentDto = {
          sessionNumber: i + 1,
          editorId: form.editorId ? Number(form.editorId) : undefined,
          editRoomNumber: form.editRoomNumber.trim() || undefined,
          availableDatetime: form.availableDatetime ? `${form.availableDatetime}:00.000Z` : undefined,
          sessionDurationMinutes: form.sessionDurationMinutes || undefined,
          editorComments: form.editorComments.trim() || undefined,
        };
        await editingApi.updateEditorAssignment(request.id, dto);
      }
      const wasUpdate = sessions.some((s) => s.availableDatetime);
      showToast(
        wasUpdate
          ? 'Sessions updated and notifications sent'
          : `All ${sessionForms.length} session(s) assigned and producer notified`,
        'success'
      );
      setEditingSessionIndex(null);
      onAssignSuccess();
    } catch (error: unknown) {
      console.error('Error updating editor assignment:', error);
      const err = error as { response?: { data?: { error?: string } } };
      showToast(
        err.response?.data?.error || 'Failed to update assignment. Please try again.',
        'error'
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      {isCancelled && request.cancellationReason && (
        <div className="bg-destructive/10 border-2 border-destructive rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-destructive mb-1">EDIT RESERVATION CANCELLED</h2>
              <p className="text-sm text-muted-foreground">{request.cancellationReason}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Request Information</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-0">
                <div className="py-4 border-b border-border/60 first:pt-0">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Program Name</dt>
                  <dd className="text-base font-semibold text-card-foreground">{request.programName}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 py-4 border-b border-border/60">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Producer Name</dt>
                    <dd className="text-sm font-medium text-card-foreground">{request.producerName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Producer Contact</dt>
                    <dd className="text-sm font-medium text-card-foreground">{request.producerContact}</dd>
                  </div>
                </div>
                <div className="py-4 border-b border-border/60">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Approximate Duration</dt>
                  <dd className="text-sm font-medium text-card-foreground">{request.approximateDuration}</dd>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 py-4 border-b border-border/60">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Rushes Selected on Cloud UX</dt>
                    <dd>
                      <Badge variant={request.rushesSelectedCloudUx ? 'default' : 'secondary'} className="font-medium">
                        {request.rushesSelectedCloudUx ? 'Yes' : 'No'}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Graphic GFX Ready</dt>
                    <dd>
                      <Badge variant={request.gfxReady ? 'default' : 'secondary'} className="font-medium">
                        {request.gfxReady ? 'Yes' : 'No'}
                      </Badge>
                    </dd>
                  </div>
                </div>
                {request.producerComments && (
                  <div className="py-4">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Producer Comments</dt>
                    <dd className="text-sm text-card-foreground leading-relaxed">{request.producerComments}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {(hasSessions || hasLegacyAssignment || canAssign) && (
            <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-semibold text-card-foreground">
                  Editing Sessions ({hasSessions ? sessions.length : 1}/{sessionsPerWeek})
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {Array.from({ length: sessionsPerWeek }).map((_, index) => {
                  const session = sessions.find((s) => s.sessionNumber === index + 1);
                  const isLegacy = !hasSessions && index === 0;
                  const displayRequestedDate = session?.requestedDate;
                  const form = sessionForms[index];

                  return (
                    <Card key={session?.id ?? index} className="border border-border shadow-none">
                      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                        <div>
                          <h4 className="font-semibold text-sm text-card-foreground">Session {index + 1}</h4>
                          {session?.requestedDate && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar size={12} />
                              Requested:{' '}
                              {new Date(session.requestedDate).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </div>
                        {canAssign && session?.availableDatetime && !isCancelled && (
                          <Button variant="default" size="sm" onClick={() => setEditingSessionIndex(index)} className="gap-1.5 shrink-0">
                            <Pencil size={14} />
                            Edit Session
                          </Button>
                        )}
                        {/* {canAssign && index > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyFromPreviousSession(index)}
                            className="gap-1.5 h-8"
                          >
                            <Copy size={14} />
                            Copy from Session {index}
                          </Button>
                        )} */}
                      </CardHeader>
                      <CardContent className="px-4 pb-4 pt-0 space-y-4">
                        {displayRequestedDate && (
                          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Calendar size={12} className="opacity-70" />
                              Producer&apos;s Requested Date
                            </div>
                            <div className="text-base font-semibold text-card-foreground">
                              {formatDateTime(displayRequestedDate)}
                            </div>
                          </div>
                        )}
                        {canAssign && form && (editingSessionIndex === index || !session?.availableDatetime) ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label htmlFor={`editor-${index}`}>
                                  Editor Assigned <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                  value={form.editorId ? String(form.editorId) : undefined}
                                  onValueChange={(value) => updateSessionForm(index, 'editorId', value ? parseInt(value, 10) : '')}
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
                                  value={form.editRoomNumber}
                                  onValueChange={(value) => updateSessionForm(index, 'editRoomNumber', value)}
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
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`datetime-${index}`}>
                                Available Date and Time <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`datetime-${index}`}
                                type="datetime-local"
                                value={form.availableDatetime}
                                onChange={(e) => updateSessionForm(index, 'availableDatetime', e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor={`duration-${index}`}>Session Duration</Label>
                              <Select
                                value={form.durationPreset}
                                onValueChange={(v) => updateSessionForm(index, 'durationPreset', v)}
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
                              {form.durationPreset === 'custom' && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  <div className="space-y-1">
                                    <Label htmlFor={`hours-${index}`} className="text-xs">Hours (max 12)</Label>
                                    <Input
                                      id={`hours-${index}`}
                                      type="number"
                                      min={0}
                                      max={12}
                                      value={form.customHours || ''}
                                      onChange={(e) =>
                                        updateSessionForm(index, 'customHours', parseInt(e.target.value, 10) || 0)
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
                                      value={form.customMinutes || ''}
                                      onChange={(e) =>
                                        updateSessionForm(index, 'customMinutes', parseInt(e.target.value, 10) || 0)
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
                                value={form.editorComments}
                                onChange={(e) => updateSessionForm(index, 'editorComments', e.target.value)}
                                placeholder="Optional comments"
                                rows={2}
                              />
                            </div>
                            {form.editorId && form.editRoomNumber && form.availableDatetime && form.sessionDurationMinutes && index in conflictsBySession && (
                              conflictsBySession[index].length > 0 ? (
                                <Alert variant="default" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/30">
                                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                  <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm">
                                    ⚠️ Conflict Detected
                                  </AlertTitle>
                                  <AlertDescription>
                                    <ul className="list-disc list-inside space-y-1 mt-2 text-amber-800 dark:text-amber-200 text-sm">
                                      {conflictsBySession[index].map((c, i) => (
                                        <li key={i}>{c.message}</li>
                                      ))}
                                    </ul>
                                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-2">
                                      You may still proceed if you choose to.
                                    </p>
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                                  <span>✅</span>
                                  <span>No conflicts</span>
                                </div>
                              )
                            )}
                            {editingSessionIndex === index && (
                              <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => setEditingSessionIndex(null)}>
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {(session?.editorName ?? session?.editorId ?? (isLegacy && (request.editorName || request.editorId))) && (
                              <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm flex-1">
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Editor</div>
                                    <div className="font-medium text-card-foreground">
                                      {session?.editorName ?? request.editorName ?? '—'}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Room</div>
                                    <div className="font-medium text-card-foreground">
                                      {session?.editRoomNumber ?? request.editRoomNumber}
                                    </div>
                                  </div>
                                </div>
                                {session && (() => {
                                  const isAssignedEditor = currentUserId != null && session.editorId === currentUserId;
                                  const canViewReport = isAssignedEditor || isSuperEditor || isAdmin;
                                  const reportSubmitted = !!session.reportSubmittedAt;
                                  return (
                                    <div className="flex items-center gap-2">
                                      {reportSubmitted ? (
                                        <>
                                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            Report Submitted
                                          </Badge>
                                          {canViewReport && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                setReportModalSession(session);
                                                setReportModalMode('view');
                                              }}
                                            >
                                              View Report
                                            </Button>
                                          )}
                                        </>
                                      ) : isAssignedEditor && request.status === 'Completed' ? (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            setReportModalSession(session);
                                            setReportModalMode('submit');
                                          }}
                                        >
                                          Submit Report
                                        </Button>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                            {(session?.availableDatetime ?? (isLegacy && request.availableDatetime)) && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Available Time</div>
                                <div className="font-medium text-card-foreground">
                                  {formatDateTime(session?.availableDatetime ?? request.availableDatetime!)}
                                </div>
                              </div>
                            )}
                            {session?.availableDatetime && (session?.sessionDurationMinutes ?? 0) > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Duration</div>
                                  <div className="font-medium text-card-foreground">
                                    {formatDurationMinutes(session.sessionDurationMinutes!)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">End Time</div>
                                  <div className="font-medium text-card-foreground">
                                    {formatDateTime(addMinutesToDatetime(session.availableDatetime, session.sessionDurationMinutes!))}
                                  </div>
                                </div>
                              </div>
                            )}
                            {(session?.editorComments ?? (isLegacy && request.editorComments)) && (
                              <div>
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Comments</div>
                                <div className="text-card-foreground leading-relaxed">
                                  {session?.editorComments ?? request.editorComments}
                                </div>
                              </div>
                            )}
                            {(session?.assignedAt || session?.reportSubmittedAt) && (
                              <div className="mt-3 pt-3 border-t space-y-1 text-xs text-muted-foreground">
                                {session.assignedAt && (
                                  <div>Assigned by <span className="font-medium">{session.assignedByName || 'Unknown'}</span> on {formatDateTime(session.assignedAt)}</div>
                                )}
                                {/* {session.reportSubmittedAt && (
                                  <div>Report submitted by <span className="font-medium">{session.reportSubmitterName || 'Unknown'}</span> on {formatDateTime(session.reportSubmittedAt)}</div>
                                )} */}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
                {canAssign && onAssignSuccess && (
                  <div className="flex justify-end pt-4 border-t border-border">
                    <Button onClick={handleAssignSubmit} disabled={isAssigning} className="gap-1.5">
                      {isAssigning ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        <>
                          {sessions.some((s) => s.availableDatetime)
                            ? 'Update Sessions'
                            : 'Assign All Sessions & Notify Producer'}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-card-foreground">Metadata</h2>
            </div>
            <div className="p-6">
              <dl className="space-y-0">
                {request.createdByUser && (
                  <div className="py-3 border-b border-border/60">
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Created by</dt>
                    <dd className="text-sm font-medium text-card-foreground">
                      {request.createdByUser.displayName || request.createdByUser.username}
                    </dd>
                  </div>
                )}
                <div className="py-3 border-b border-border/60">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Created at</dt>
                  <dd className="text-sm font-medium text-card-foreground">
                    {formatDateTime(request.createdAt)}
                  </dd>
                </div>
                <div className="py-3">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Status</dt>
                  <dd>
                    <Badge className={getEditingStatusBadgeClass(request.status)}>
                      {getEditingStatusDisplayLabel(request.status)}
                    </Badge>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {reportModalSession && (
        <SessionReportModal
          open={!!reportModalSession}
          onOpenChange={(open) => !open && setReportModalSession(null)}
          session={reportModalSession}
          request={request}
          mode={reportModalMode}
          onSuccess={() => {
            onReportComplete?.();
            setReportModalSession(null);
          }}
        />
      )}
    </div>
  );
};
