import React from 'react';
import { Input } from '@/components/ui/input';
import { TimePickerInput } from './TimePickerInput';

interface DateTimePickerInputProps {
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateClassName?: string;
  timeClassName?: string;
  dateLabel?: string;
  timeLabel?: string;
}

export const DateTimePickerInput: React.FC<DateTimePickerInputProps> = ({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  dateClassName = '',
  timeClassName = '',
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Input
          type="date"
          value={dateValue}
          onChange={(e) => onDateChange(e.target.value)}
          className={dateClassName}
        />
      </div>
      <div className="space-y-2">
        <TimePickerInput
          value={timeValue}
          onChange={onTimeChange}
          className={timeClassName}
        />
      </div>
    </div>
  );
};
