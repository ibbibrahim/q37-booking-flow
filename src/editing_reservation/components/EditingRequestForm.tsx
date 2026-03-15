import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

  const DURATION_PRESETS = [
    '30 min',
    '1 hour',
    '1 hour 30 min',
    '2 hours',
    '2 hours 30 min',
    '3 hours',
  ] as const;

  const [formData, setFormData] = useState({
    programName: '',
    producerName: '',
    producerContact: '',
    rushesSelectedCloudUx: false,
    durationPreset: '' as string,
    customDuration: '',
    gfxReady: false,
    sessionsPerWeek: 1,
    producerComments: '',
    sessionDates: [''] as string[],
  });

  useEffect(() => {
    if (requestToEdit) {
      const duration = requestToEdit.approximateDuration || '';
      const isPreset = DURATION_PRESETS.includes(duration as (typeof DURATION_PRESETS)[number]);

      const sessionDates: string[] = [];
      const sessionsPerWeek = requestToEdit.sessionsPerWeek || 1;
      for (let i = 1; i <= sessionsPerWeek; i++) {
        const session = requestToEdit.editingSessions?.find((s) => s.sessionNumber === i);
        const dateStr = session?.requestedDate
          ? String(session.requestedDate).slice(0, 16)
          : '';
        sessionDates.push(dateStr);
      }

      setFormData((prev) => ({
        ...prev,
        programName: requestToEdit.programName || '',
        producerName: requestToEdit.producerName || '',
        producerContact: requestToEdit.producerContact || '',
        rushesSelectedCloudUx: requestToEdit.rushesSelectedCloudUx ?? false,
        durationPreset: isPreset ? duration : duration ? 'other' : '',
        customDuration: isPreset ? '' : duration,
        gfxReady: requestToEdit.gfxReady ?? false,
        sessionsPerWeek: requestToEdit.sessionsPerWeek || 1,
        producerComments: requestToEdit.producerComments || '',
        sessionDates: sessionDates.length > 0 ? sessionDates : [''],
      }));
    }
  }, [requestToEdit]);

  const handleSessionsPerWeekChange = (newValue: number) => {
    setFormData((prev) => {
      const currentDates = [...prev.sessionDates];
      if (newValue > currentDates.length) {
        while (currentDates.length < newValue) {
          currentDates.push('');
        }
      } else if (newValue < currentDates.length) {
        currentDates.splice(newValue);
      }

      return {
        ...prev,
        sessionsPerWeek: newValue,
        sessionDates: currentDates,
      };
    });
  };

  const updateSessionDate = (index: number, date: string) => {
    setFormData((prev) => {
      const newDates = [...prev.sessionDates];
      newDates[index] = date;
      return { ...prev, sessionDates: newDates };
    });
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.programName.trim()) errors.push('Program Name is required');
    if (!formData.producerName.trim()) errors.push('Producer Name is required');
    if (!formData.producerContact.trim()) errors.push('Producer Contact is required');

    for (let i = 0; i < formData.sessionsPerWeek; i++) {
      if (!formData.sessionDates[i]) {
        errors.push(`Requested date for Session ${i + 1} is required`);
      }
    }

    if (errors.length > 0) {
      errors.forEach((error) => showToast(error, 'error'));
      return false;
    }

    return true;
  };

  const getApproximateDurationValue = (): string => {
    if (formData.durationPreset === 'other') {
      return formData.customDuration.trim();
    }
    return formData.durationPreset;
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
        approximateDuration: getApproximateDurationValue() || undefined,
        gfxReady: formData.gfxReady,
        sessionsPerWeek: formData.sessionsPerWeek,
        sessionRequests: formData.sessionDates
          .slice(0, formData.sessionsPerWeek)
          .map((dateStr, index) => ({
            sessionNumber: index + 1,
            requestedDate: dateStr,
          })),
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
        <div className="space-y-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="space-y-2">
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <Label>
              Graphic GFX Ready <span className="text-red-500">*</span>
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="approximateDuration">Approximate Duration Request</Label>
          <Select
            value={formData.durationPreset}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                durationPreset: value,
                customDuration: value === 'other' ? prev.customDuration : '',
              }))
            }
          >
            <SelectTrigger id="approximateDuration">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATION_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {preset}
                </SelectItem>
              ))}
              <SelectItem value="other">Other (specify)</SelectItem>
            </SelectContent>
          </Select>
          {formData.durationPreset === 'other' && (
            <Input
              value={formData.customDuration}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, customDuration: e.target.value }))
              }
              placeholder="e.g., 45 min, 4 hours"
              className="mt-2"
            />
          )}
        </div>

        {/* Sessions Per Week - Dropdown */}
        <div className="space-y-2">
          <Label htmlFor="sessionsPerWeek">
            How many editing sessions do you need per week? <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.sessionsPerWeek.toString()}
            onValueChange={(value) => handleSessionsPerWeekChange(parseInt(value))}
          >
            <SelectTrigger id="sessionsPerWeek">
              <SelectValue placeholder="Select sessions per week" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Session – Once per week</SelectItem>
              <SelectItem value="2">2 Sessions – Twice per week</SelectItem>
              <SelectItem value="3">3 Sessions – Three times per week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Session Dates */}
        <div className="space-y-3">
          <Label>
            Select your preferred date for each editing session <span className="text-red-500">*</span>
          </Label>
          {/* <p className="text-sm text-muted-foreground -mt-1">
            Select your preferred date for each editing session
          </p> */}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: formData.sessionsPerWeek }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <Label htmlFor={`session-date-${index}`} className="text-sm font-medium">
                  Session {index + 1} Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id={`session-date-${index}`}
                  type="datetime-local"
                  value={formData.sessionDates[index] || ''}
                  onChange={(e) => updateSessionDate(index, e.target.value)}
                  min={new Date().toISOString()}
                  className="w-full"
                />
              </div>
            ))}
          </div>

          {/* <Alert className="mt-2">
            <Calendar className="h-4 w-4" />
            <AlertDescription className="text-sm">
              These are your preferred date/time. The editor will assign specific times for each
              session (which may differ based on availability).
            </AlertDescription>
          </Alert> */}
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
