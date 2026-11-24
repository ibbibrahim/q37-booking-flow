import { useState } from "react";
import { Clock, ChevronDown, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Period = "AM" | "PM";
interface Draft {
  hour: number | null;
  minute: number | null;
  period: Period;
}

interface TimePickerProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  invalid?: boolean;
  className?: string;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

function periodOf(h24: number): Period {
  return h24 >= 12 ? "PM" : "AM";
}

function parse(value: string): Draft {
  const [h, m] = value.split(":").map((p) => parseInt(p, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) {
    return { hour: null, minute: null, period: periodOf(new Date().getHours()) };
  }
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, period: periodOf(h) };
}

function to24h(hour: number, minute: number, period: Period): string {
  const h = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${pad(h)}:${pad(minute)}`;
}

function format12(value: string): string {
  const d = parse(value);
  return `${d.hour}:${pad(d.minute ?? 0)} ${d.period}`;
}

export function TimePicker({
  id,
  value,
  onChange,
  label,
  placeholder = "Select time",
  invalid,
  className,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => parse(value));

  const update = (next: Draft, close = false) => {
    setDraft(next);
    if (next.hour !== null && next.minute !== null) {
      onChange(to24h(next.hour, next.minute, next.period));
      if (close) setOpen(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    if (o) setDraft(parse(value));
    setOpen(o);
  };

  const setNow = () => {
    const now = new Date();
    let total = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
    total %= 24 * 60;
    const h24 = Math.floor(total / 60);
    update({ hour: h24 % 12 === 0 ? 12 : h24 % 12, minute: total % 60, period: periodOf(h24) }, true);
  };

  const chip = (selected: boolean) =>
    cn(
      "h-9 rounded-lg text-sm tabular-nums transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      selected ? "bg-primary text-primary-foreground shadow-sm font-semibold" : "text-foreground hover:bg-muted",
    );
  const unset = (v: number | null) => (v === null ? "--" : pad(v));
  const dim = (v: number | null) => (v === null ? "text-muted-foreground/50" : "");

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          aria-haspopup="dialog"
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-left text-base md:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors data-[state=open]:border-primary",
            invalid && "border-red-500",
            className,
          )}
        >
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={cn("flex-1", value ? "font-medium tabular-nums text-foreground" : "text-muted-foreground")}>
            {value ? format12(value) : placeholder}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground opacity-60 transition-transform", open && "rotate-180")} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between gap-3 bg-muted/40 px-4 py-3 border-b border-border">
          <div>
            <div className="text-3xl font-semibold tabular-nums tracking-tight">
              <span className={dim(draft.hour)}>{unset(draft.hour)}</span>
              <span className="text-muted-foreground"> : </span>
              <span className={dim(draft.minute)}>{unset(draft.minute)}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{label ?? "Time"}</div>
          </div>
          <div className="inline-flex rounded-lg bg-muted p-1">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={draft.period === p}
                onClick={() => update({ ...draft, period: p })}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  draft.period === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Hour</div>
            <div className="grid grid-cols-6 gap-1.5">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  aria-pressed={draft.hour === h}
                  aria-label={`${h} o'clock`}
                  onClick={() => update({ ...draft, hour: h })}
                  className={chip(draft.hour === h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Minute</div>
            <div className="grid grid-cols-6 gap-1.5">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={draft.minute === m}
                  aria-label={`${m} minutes`}
                  onClick={() => update({ ...draft, minute: m }, true)}
                  className={chip(draft.minute === m)}
                >
                  {pad(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <Button type="button" variant="ghost" size="sm" onClick={setNow}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Now
          </Button>
          <Button type="button" size="sm" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
