import React, { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { editingApi } from '../api/editingApi';
import type { CreateEditingRequestDto, EditingRequest } from '../types/editing';

interface EditingRequestFormProps {
  onSubmit?: (data: CreateEditingRequestDto) => Promise<void>;
  initialRequest?: EditingRequest;
  mode?: 'create' | 'edit';
}

export const EditingRequestForm: React.FC<EditingRequestFormProps> = ({
  onSubmit,
  initialRequest,
  mode = 'create',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const editData = location.state?.editData as EditingRequest | undefined;
  const requestToEdit = editData || initialRequest;
  const isEditMode = mode === 'edit' || !!requestToEdit;

  const [formData, setFormData] = useState({
    programName: '',
    producerName: '',
    producerContact: '',
    rushesSelectedCloudUx: false,
    approximateDuration: '',
    gfxReady: false,
    producerComments: '',
  });

  useEffect(() => {
    if (requestToEdit) {
      setFormData({
        programName: requestToEdit.programName || '',
        producerName: requestToEdit.producerName || '',
        producerContact: requestToEdit.producerContact || '',
        rushesSelectedCloudUx: requestToEdit.rushesSelectedCloudUx ?? false,
        approximateDuration: requestToEdit.approximateDuration || '',
        gfxReady: requestToEdit.gfxReady ?? false,
        producerComments: requestToEdit.producerComments || '',
      });
    }
  }, [requestToEdit]);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.programName.trim()) errors.push('Program Name is required');
    if (!formData.producerName.trim()) errors.push('Producer Name is required');
    if (!formData.producerContact.trim()) errors.push('Producer Contact is required');
    if (!formData.approximateDuration.trim()) errors.push('Approximate Duration is required');

    if (errors.length > 0) {
      errors.forEach((error) => showToast(error, 'error'));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const dto: CreateEditingRequestDto = {
        programName: formData.programName.trim(),
        producerName: formData.producerName.trim(),
        producerContact: formData.producerContact.trim(),
        rushesSelectedCloudUx: formData.rushesSelectedCloudUx,
        approximateDuration: formData.approximateDuration.trim(),
        gfxReady: formData.gfxReady,
        producerComments: formData.producerComments.trim() || undefined,
      };

      if (onSubmit) {
        await onSubmit(dto);
      } else if (isEditMode && requestToEdit?.id) {
        await editingApi.update(requestToEdit.id, dto);
        showToast('Edit reservation updated successfully', 'success');
        navigate('/editing');
      } else {
        await editingApi.create(dto);
        showToast('Edit reservation created successfully', 'success');
        navigate('/editing');
      }
    } catch (error: unknown) {
      console.error('Error saving edit reservation:', error);
      const err = error as { response?: { data?: { error?: string } } };
      const message =
        err.response?.data?.error || 'Failed to save edit reservation. Please try again.';
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 relative">
      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card p-8 rounded-lg shadow-lg border flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Submitting Request...</h3>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/editing')}
            disabled={isSubmitting}
            className="shrink-0"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-card-foreground truncate">
              {isEditMode ? 'Edit Reservation' : 'New Edit Reservation'}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5 truncate">
              {isEditMode
                ? 'Update the edit reservation details'
                : 'Create a new edit reservation request'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/editing')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={isSubmitting} className="gap-1.5">
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {isEditMode ? 'Updating...' : 'Submitting...'}
              </>
            ) : isEditMode ? (
              'Update Request'
            ) : (
              'Submit Request'
            )}
          </Button>
        </div>
      </div>

      {/* Single form - no separate cards */}
      <div className="bg-card rounded-lg border border-border p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="programName">
              Program Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="programName"
              value={formData.programName}
              onChange={(e) => setFormData((prev) => ({ ...prev, programName: e.target.value }))}
              placeholder="Enter program name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="producerName">
              Producer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="producerName"
              value={formData.producerName}
              onChange={(e) => setFormData((prev) => ({ ...prev, producerName: e.target.value }))}
              placeholder="Enter producer name"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="producerContact">
              Producer Contact <span className="text-red-500">*</span>
            </Label>
            <Input
              id="producerContact"
              type="tel"
              value={formData.producerContact}
              onChange={(e) => setFormData((prev) => ({ ...prev, producerContact: e.target.value }))}
              placeholder="Phone or email"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            Rushes Selected on Cloud UX <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.rushesSelectedCloudUx ? 'yes' : 'no'}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, rushesSelectedCloudUx: value === 'yes' }))
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="rushes-yes" />
              <Label htmlFor="rushes-yes" className="font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="rushes-no" />
              <Label htmlFor="rushes-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="approximateDuration">
            Approximate Duration Request <span className="text-red-500">*</span>
          </Label>
          <Input
            id="approximateDuration"
            value={formData.approximateDuration}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, approximateDuration: e.target.value }))
            }
            placeholder="e.g., 30 minutes, 1 hour"
          />
        </div>

        <div className="space-y-2">
          <Label>
            GFX Ready <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={formData.gfxReady ? 'yes' : 'no'}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, gfxReady: value === 'yes' }))
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="gfx-yes" />
              <Label htmlFor="gfx-yes" className="font-normal cursor-pointer">
                Yes
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="gfx-no" />
              <Label htmlFor="gfx-no" className="font-normal cursor-pointer">
                No
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Comments as the last field */}
        <div className="space-y-2">
          <Label htmlFor="producerComments">Producer Comments</Label>
          <Textarea
            id="producerComments"
            value={formData.producerComments}
            onChange={(e) => setFormData((prev) => ({ ...prev, producerComments: e.target.value }))}
            placeholder="Optional comments"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
};
