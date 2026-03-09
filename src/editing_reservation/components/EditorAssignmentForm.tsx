import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { editingApi } from '../api/editingApi';
import type { EditingRequest, UpdateEditorAssignmentDto } from '../types/editing';

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
  const [formData, setFormData] = useState({
    editorAssigned: '',
    editRoomNumber: '',
    availableDatetime: '',
    editorComments: '',
  });

  useEffect(() => {
    if (editingRequest.availableDatetime) {
      const dt = new Date(editingRequest.availableDatetime);
      const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setFormData((prev) => ({
        ...prev,
        editorAssigned: editingRequest.editorAssigned || '',
        editRoomNumber: editingRequest.editRoomNumber || '',
        availableDatetime: local,
        editorComments: editingRequest.editorComments || '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        editorAssigned: editingRequest.editorAssigned || '',
        editRoomNumber: editingRequest.editRoomNumber || '',
        editorComments: editingRequest.editorComments || '',
      }));
    }
  }, [editingRequest]);

  const validateForm = (): boolean => {
    if (!formData.editorAssigned.trim()) {
      showToast('Editor Assigned is required', 'error');
      return false;
    }
    if (!formData.editRoomNumber.trim()) {
      showToast('Edit Room Number is required', 'error');
      return false;
    }
    if (!formData.availableDatetime) {
      showToast('Available Date and Time is required', 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const dto: UpdateEditorAssignmentDto = {
        editorAssigned: formData.editorAssigned.trim(),
        editRoomNumber: formData.editRoomNumber.trim(),
        availableDatetime: new Date(formData.availableDatetime).toISOString(),
        editorComments: formData.editorComments.trim() || undefined,
      };

      await editingApi.updateEditorAssignment(editingRequest.id, dto);
      showToast('Assignment confirmed and producer notified', 'success');
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
    <Card>
      <CardHeader>
        <CardTitle>Editor Assignment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="editorAssigned">
            Editor Assigned <span className="text-red-500">*</span>
          </Label>
          <Input
            id="editorAssigned"
            value={formData.editorAssigned}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, editorAssigned: e.target.value }))
            }
            placeholder="Editor name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editRoomNumber">
            Edit Room Number <span className="text-red-500">*</span>
          </Label>
          <Input
            id="editRoomNumber"
            value={formData.editRoomNumber}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, editRoomNumber: e.target.value }))
            }
            placeholder="Room number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="availableDatetime">
            Available Date and Time <span className="text-red-500">*</span>
          </Label>
          <Input
            id="availableDatetime"
            type="datetime-local"
            value={formData.availableDatetime}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, availableDatetime: e.target.value }))
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorComments">Editor Comments</Label>
          <Textarea
            id="editorComments"
            value={formData.editorComments}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, editorComments: e.target.value }))
            }
            placeholder="Optional comments"
            rows={3}
          />
        </div>
        <div className="flex gap-2 justify-end pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
