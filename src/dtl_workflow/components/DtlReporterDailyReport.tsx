import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getDtlReporterDailyCounts } from '../services/dtlApi';
import { DTL_BOOKING_STATUS } from '../types/dtl';

// Cancelled bookings never happened, so they don't count as a reporter coming in.
const COUNTED_STATUSES = [DTL_BOOKING_STATUS.Created, DTL_BOOKING_STATUS.Completed];

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatDay(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Reporters per day for one month. Counts only — reporters aren't part of the payment report.
export function DtlReporterDailyReport() {
  const [month, setMonth] = useState(currentMonthValue);

  const { from, to } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return { from: undefined, to: undefined };
    return { from: new Date(y, m - 1, 1, 0, 0, 0, 0), to: new Date(y, m, 0, 23, 59, 59, 999) };
  }, [month]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dtl-reporter-daily-counts', month],
    queryFn: () => getDtlReporterDailyCounts({ from, to, statuses: COUNTED_STATUSES }),
    enabled: !!from,
    refetchOnMount: 'always',
  });

  const days = data ?? [];
  const totalBookings = days.reduce((sum, d) => sum + d.bookingCount, 0);
  const maxCount = Math.max(1, ...days.map((d) => d.reporterCount));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Reporters per day</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Created and completed reporter bookings (cancelled excluded)</p>
          </div>
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonthValue())}
            className="w-full sm:w-44"
            aria-label="Month"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">Could not load reporter counts.</p>
        ) : days.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No reporter bookings this month.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{days.length}</span> days with reporters
              </span>
              <span>
                <span className="font-semibold text-foreground">{totalBookings}</span> reporter bookings
              </span>
            </div>
            <ul className="space-y-2">
              {days.map((d) => (
                <li key={d.date} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-muted-foreground">{formatDay(d.date)}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(d.reporterCount / maxCount) * 100}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right">
                    <span className="font-semibold text-foreground">{d.reporterCount}</span>{' '}
                    <span className="text-muted-foreground">{d.reporterCount === 1 ? 'reporter' : 'reporters'}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
