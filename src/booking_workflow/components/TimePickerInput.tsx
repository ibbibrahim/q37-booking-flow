import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TimePickerInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  min?: string;
}

export const TimePickerInput: React.FC<TimePickerInputProps> = ({
  id,
  value,
  onChange,
  className = '',
}) => {
  const generateTimeOptions = () => {
    const times: { value: string; label: string }[] = [];

    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const hour24 = hour;
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const period = hour < 12 ? 'AM' : 'PM';
        const minuteStr = minute.toString().padStart(2, '0');

        const value24 = `${hour24.toString().padStart(2, '0')}:${minuteStr}`;
        const label = `${hour12}:${minuteStr} ${period}`;

        times.push({ value: value24, label });
      }
    }

    return times;
  };

  const timeOptions = generateTimeOptions();

  const getDisplayLabel = (val: string) => {
    if (!val) return '';
    const option = timeOptions.find(opt => opt.value === val);
    return option ? option.label : '';
  };

  return (
    <div id={id} className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="--:-- --">
            {getDisplayLabel(value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {timeOptions.map((time) => (
            <SelectItem key={time.value} value={time.value}>
              {time.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
