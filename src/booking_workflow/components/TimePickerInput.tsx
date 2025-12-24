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
  const parseTime = (timeStr: string) => {
    if (!timeStr) return { hour: '12', minute: '00', period: 'AM' };

    const [hours, minutes] = timeStr.split(':');
    const hourNum = parseInt(hours, 10);

    if (hourNum === 0) {
      return { hour: '12', minute: minutes, period: 'AM' };
    } else if (hourNum < 12) {
      return { hour: hourNum.toString().padStart(2, '0'), minute: minutes, period: 'AM' };
    } else if (hourNum === 12) {
      return { hour: '12', minute: minutes, period: 'PM' };
    } else {
      return { hour: (hourNum - 12).toString().padStart(2, '0'), minute: minutes, period: 'PM' };
    }
  };

  const formatTime = (hour: string, minute: string, period: string) => {
    let hourNum = parseInt(hour, 10);

    if (period === 'AM') {
      if (hourNum === 12) hourNum = 0;
    } else {
      if (hourNum !== 12) hourNum += 12;
    }

    return `${hourNum.toString().padStart(2, '0')}:${minute}`;
  };

  const { hour, minute, period } = parseTime(value);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourChange = (newHour: string) => {
    onChange(formatTime(newHour, minute, period));
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(formatTime(hour, newMinute, period));
  };

  const handlePeriodChange = (newPeriod: string) => {
    onChange(formatTime(hour, minute, newPeriod));
  };

  return (
    <div id={id} className={`flex gap-2 ${className}`}>
      <Select value={hour} onValueChange={handleHourChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={minute} onValueChange={handleMinuteChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {minutes.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
