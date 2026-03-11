import React, { useState } from 'react';
import { Loader2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useToast } from '@/contexts/ToastContext';
import { editingApi } from '../api/editingApi';
import type { EditingRequest, UpdateEditorAssignmentDto } from '../types/editing';

interface SessionFormData {
  editorAssigned: string;
  editRoomNumber: string;
  availableDatetime: string;
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

  const sessionsPerWeek = editingRequest.sessionsPerWeek ?? 1;
  const editingSessions = editingRequest.editingSessions ?? [];

  const [sessions, setSessions] = useState<SessionFormData[]>(() => {
    const initial: SessionFormData[] = [];
    for (let i = 0; i < sessionsPerWeek; i++) {
      const existingSession = editingSessions.find((s) => s.sessionNumber === i + 1);
      if (existingSession?.availableDatetime) {
        const dt = new Date(existingSession.availableDatetime);
        const availableDatetimeLocal = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        initial.push({
          editorAssigned: existingSession.editorAssigned || '',
          editRoomNumber: existingSession.editRoomNumber || '',
          availableDatetime: availableDatetimeLocal,
          editorComments: existingSession.editorComments || '',
        });
      } else if (i === 0 && editingRequest.editorAssigned) {
        const dt = editingRequest.availableDatetime
          ? new Date(editingRequest.availableDatetime)
          : null;
        const availableDatetimeLocal = dt
          ? new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : '';
        initial.push({
          editorAssigned: editingRequest.editorAssigned || '',
          editRoomNumber: editingRequest.editRoomNumber || '',
          availableDatetime: availableDatetimeLocal,
          editorComments: editingRequest.editorComments || '',
        });
      } else {
        initial.push({
          editorAssigned: '',
          editRoomNumber: '',
          availableDatetime: '',
          editorComments: '',
        });
      }
    }
    return initial;
  });

  const updateSession = (index: number, field: keyof SessionFormData, value: string) => {
    setSessions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const copyFromPrevious = (toIndex: number) => {
    if (toIndex === 0) return;
    const fromIndex = toIndex - 1;
    setSessions((prev) => {
      const updated = [...prev];
      updated[toIndex] = {
        editorAssigned: prev[fromIndex].editorAssigned,
        editRoomNumber: prev[fromIndex].editRoomNumber,
        availableDatetime: '',
        editorComments: prev[fromIndex].editorComments,
      };
      return updated;
    });
    showToast(`Copied editor and room from Session ${fromIndex + 1}`, 'info');
  };

  const validateForm = (): boolean => {
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      if (!session.editorAssigned.trim()) {
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
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        const dto: UpdateEditorAssignmentDto = {
          sessionNumber: i + 1,
          editorAssigned: session.editorAssigned.trim(),
          editRoomNumber: session.editRoomNumber.trim(),
          availableDatetime: new Date(session.availableDatetime).toISOString(),
          editorComments: session.editorComments.trim() || undefined,
        };
        await editingApi.updateEditorAssignment(editingRequest.id, dto);
      }

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
                  Editor Assigned <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`editor-${index}`}
                  value={session.editorAssigned}
                  onChange={(e) => updateSession(index, 'editorAssigned', e.target.value)}
                  placeholder="Editor name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`room-${index}`}>
                  Edit Room Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`room-${index}`}
                  value={session.editRoomNumber}
                  onChange={(e) => updateSession(index, 'editRoomNumber', e.target.value)}
                  placeholder="Room number"
                />
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
