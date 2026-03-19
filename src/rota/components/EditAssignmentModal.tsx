import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { RotaAssignment, RotaDepartment } from '../types/rota';
import { PREDEFINED_PROGRAMS } from '../utils/rotaConstants';

export interface EditAssignmentFormData {
  shiftType?: 'morning' | 'evening' | 'night';
  customLabel?: string;
  programName?: string;
  assignmentComments?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isOffDay?: boolean;
}

export interface EditAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: RotaAssignment | null;
  employeeId: number | null;
  date: Date | null;
  employees: { id: number; name: string }[];
  weekDates: Date[];
  department: RotaDepartment | null;
  onSave: (data: EditAssignmentFormData, employeeId: number, date: Date) => Promise<void>;
}

export function EditAssignmentModal({
  open,
  onOpenChange,
  assignment,
  employeeId: initialEmployeeId,
  date: initialDate,
  employees,
  weekDates,
  department,
  onSave,
}: EditAssignmentModalProps) {
  const [shiftType, setShiftType] = useState<'shift' | 'custom'>('shift');
  const [selectedShift, setSelectedShift] = useState<string>('');
  const [customLabel, setCustomLabel] = useState('');
  const [programName, setProgramName] = useState<string>('');
  const [customProgramName, setCustomProgramName] = useState('');
  const [comments, setComments] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isOffDay, setIsOffDay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const employeeId = initialEmployeeId ?? selectedEmployeeId;
  const date = initialDate ?? selectedDate;

  useEffect(() => {
    if (open) {
      setSelectedEmployeeId(initialEmployeeId);
      setSelectedDate(initialDate);
    }
  }, [open, initialEmployeeId, initialDate]);

  useEffect(() => {
    if (open && assignment) {
      setShiftType(assignment.customLabel ? 'custom' : 'shift');
      setSelectedShift(
        assignment.isOffDay ? 'off' : (assignment.shiftType ?? '')
      );
      setCustomLabel(assignment.customLabel ?? '');
      setProgramName(assignment.programName ?? '');
      setCustomProgramName(
        assignment.programName &&
          !(PREDEFINED_PROGRAMS as readonly string[]).includes(assignment.programName)
          ? assignment.programName
          : ''
      );
      setComments(assignment.assignmentComments ?? '');
      setStartTime(
        assignment.shiftStartTime
          ? assignment.shiftStartTime.slice(0, 5)
          : '09:00'
      );
      setEndTime(
        assignment.shiftEndTime
          ? assignment.shiftEndTime.slice(0, 5)
          : '17:00'
      );
      setIsOffDay(assignment.isOffDay ?? false);
    } else if (open && !assignment) {
      setShiftType('shift');
      setSelectedShift('morning');
      setCustomLabel('');
      setProgramName('');
      setCustomProgramName('');
      setComments('');
      setStartTime('09:00');
      setEndTime('17:00');
      setIsOffDay(false);
    }
  }, [open, assignment]);

  const handleSave = async () => {
    if (employeeId == null || date == null) return;
    setIsLoading(true);
    try {
      const resolvedProgramName =
        programName === '__custom__' ? customProgramName : programName;

      const data: EditAssignmentFormData = {
        programName: resolvedProgramName || undefined,
        assignmentComments: comments || undefined,
        isOffDay,
      };

      if (isOffDay) {
        data.isOffDay = true;
      } else if (shiftType === 'custom') {
        data.customLabel = customLabel || undefined;
        if (department?.requiresTimeRange) {
          data.shiftStartTime = `${startTime}:00`;
          data.shiftEndTime = `${endTime}:00`;
        }
      } else {
        if (selectedShift === 'off') {
          data.isOffDay = true;
        } else {
          data.shiftType = (selectedShift || 'morning') as 'morning' | 'evening' | 'night';
        }
        if (department?.requiresTimeRange) {
          data.shiftStartTime = `${startTime}:00`;
          data.shiftEndTime = `${endTime}:00`;
        }
      }

      await onSave(data, employeeId, date);
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const canSave = employeeId != null && date != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {assignment ? 'Edit Assignment' : 'Add Assignment'}
          </DialogTitle>
          <DialogDescription>
            {date
              ? date.toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
              : 'Select employee and date'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {initialEmployeeId == null && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={selectedEmployeeId?.toString() ?? ''}
                onValueChange={(v) => setSelectedEmployeeId(v ? parseInt(v, 10) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {initialDate == null && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Select
                value={selectedDate?.toISOString() ?? ''}
                onValueChange={(v) => setSelectedDate(v ? new Date(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {weekDates.map((d) => (
                    <SelectItem key={d.toISOString()} value={d.toISOString()}>
                      {d.toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Assignment Type</Label>
            <Select
              value={shiftType}
              onValueChange={(v) => setShiftType(v as 'shift' | 'custom')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shift">Shift (Morning/Evening/Night)</SelectItem>
                <SelectItem value="custom">Custom Label</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shiftType === 'shift' ? (
            <div className="space-y-2">
              <Label>Shift</Label>
              <Select
                value={selectedShift}
                onValueChange={setSelectedShift}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                  <SelectItem value="night">Night</SelectItem>
                  <SelectItem value="off">OFF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Custom Label</Label>
              <Input
                placeholder="e.g. Office A, Training, 9-5pm"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Program Name</Label>
            <Select
              value={
                programName &&
                !(PREDEFINED_PROGRAMS as readonly string[]).includes(programName)
                  ? '__custom__'
                  : programName || ''
              }
              onValueChange={(v) => {
                setProgramName(v);
                if (v !== '__custom__') setCustomProgramName('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select program or type custom" />
              </SelectTrigger>
              <SelectContent>
                {PREDEFINED_PROGRAMS.map((prog) => (
                  <SelectItem key={prog} value={prog}>
                    {prog}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Custom (type below)</SelectItem>
              </SelectContent>
            </Select>
            {(programName === '__custom__' ||
              (programName &&
                !(PREDEFINED_PROGRAMS as readonly string[]).includes(programName))) && (
              <Input
                className="mt-2"
                placeholder="Type custom program name"
                value={customProgramName}
                onChange={(e) => {
                  setCustomProgramName(e.target.value);
                  setProgramName('__custom__');
                }}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Comments (Optional)</Label>
            <Textarea
              placeholder="Additional notes"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={2}
            />
          </div>

          {department?.requiresTimeRange && !isOffDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isOffDay"
              checked={isOffDay}
              onChange={(e) => setIsOffDay(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="isOffDay" className="font-normal">
              Mark as OFF day
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !canSave}>
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
