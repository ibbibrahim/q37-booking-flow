import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  className?: string;
}

const presets = [
  { label: "Today", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Yesterday", getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: "This week", getValue: () => ({ from: startOfWeek(new Date()), to: new Date() }) },
  { label: "Last week", getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1)), to: subDays(startOfWeek(new Date()), 1) }) },
  { label: "This month", getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last month", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: subDays(startOfMonth(new Date()), 1) }) },
  { label: "This year", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: "Last year", getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: subDays(startOfYear(new Date()), 1) }) },
  { label: "All time", getValue: () => ({ from: undefined, to: undefined }) },
];

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(value);

  const handlePresetClick = (preset: typeof presets[0]) => {
    const newRange = preset.getValue();
    setTempRange(newRange);
  };

  const handleApply = () => {
    onChange(tempRange);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempRange(value);
    setOpen(false);
  };

  const formatDateRange = () => {
    if (!value?.from) return "Select date range";
    if (!value.to) return format(value.from, "MMM dd, yyyy");
    return `${format(value.from, "MMM dd, yyyy")} – ${format(value.to, "MMM dd, yyyy")}`;
  };

  const isPresetActive = (preset: typeof presets[0]) => {
    const presetValue = preset.getValue();
    if (!tempRange?.from || !tempRange?.to || !presetValue.from || !presetValue.to) {
      return false;
    }
    return (
      presetValue.from.toDateString() === tempRange.from.toDateString() &&
      presetValue.to.toDateString() === tempRange.to.toDateString()
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background" align="start" sideOffset={4}>
        <div className="flex">
          <div className="border-r border-border bg-muted/30 w-40">
            <div className="p-2 space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground px-2 mb-1">
                Quick Select
              </p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-xs font-normal py-1",
                    isPresetActive(preset) &&
                      "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="p-4">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={setTempRange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
              <Input
                value={tempRange?.from ? format(tempRange.from, "MM/dd/yyyy") : ""}
                placeholder="MM/DD/YYYY"
                className="h-9 flex-1"
                readOnly
              />
              <span className="text-muted-foreground">–</span>
              <Input
                value={tempRange?.to ? format(tempRange.to, "MM/dd/yyyy") : ""}
                placeholder="MM/DD/YYYY"
                className="h-9 flex-1"
                readOnly
              />
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleApply} className="bg-primary hover:bg-primary/90">
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
