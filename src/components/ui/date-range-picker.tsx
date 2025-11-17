import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate?: Date;
  endDate?: Date;
  onDateRangeChange: (startDate: Date | undefined, endDate: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateRangeChange,
  placeholder = 'Select date range',
  className,
}) => {
  const [startInput, setStartInput] = React.useState<string>(
    startDate ? format(startDate, 'MM/dd/yyyy') : ''
  );
  const [endInput, setEndInput] = React.useState<string>(
    endDate ? format(endDate, 'MM/dd/yyyy') : ''
  );

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStartInput(value);

    // Try to parse the date
    if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        onDateRangeChange(date, endDate);
      }
    }
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEndInput(value);

    // Try to parse the date
    if (value && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        onDateRangeChange(startDate, date);
      }
    }
  };

  const handleStartCalendarDate = (date: Date | undefined) => {
    if (date) {
      setStartInput(format(date, 'MM/dd/yyyy'));
      onDateRangeChange(date, endDate);
    }
  };

  const handleEndCalendarDate = (date: Date | undefined) => {
    if (date) {
      setEndInput(format(date, 'MM/dd/yyyy'));
      onDateRangeChange(startDate, date);
    }
  };

  const handleClear = () => {
    setStartInput('');
    setEndInput('');
    onDateRangeChange(undefined, undefined);
  };

  const displayText = startInput && endInput 
    ? `${startInput} - ${endInput}`
    : placeholder;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start text-left font-normal',
              !startDate && !endDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="text"
                placeholder="MM/DD/YYYY"
                value={startInput}
                onChange={handleStartDateChange}
                className="w-full sm:w-32"
              />
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartCalendarDate}
                disabled={(date) => (endDate ? date > endDate : false)}
                initialFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="text"
                placeholder="MM/DD/YYYY"
                value={endInput}
                onChange={handleEndDateChange}
                className="w-full sm:w-32"
              />
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndCalendarDate}
                disabled={(date) => (startDate ? date < startDate : false)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
