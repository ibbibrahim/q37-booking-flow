import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown, FileSpreadsheet, FileText, FileType } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListFilterBar } from '@/components/ui/list-filter-bar';
import { useToast } from '@/contexts/ToastContext';
import { getDtlBookingReport } from '../services/dtlApi';
import { exportDtlReportToDocx, exportDtlReportToExcel, exportDtlReportToPdf } from '../utils/dtlReportExport';
import { DTL_BOOKING_STATUS } from '../types/dtl';

type RangeKind = 'month' | 'lastMonth' | 'year' | 'all' | 'custom';
type ExportFormat = 'pdf' | 'docx' | 'excel';

const RANGE_OPTIONS: { key: RangeKind; label: string }[] = [
  { key: 'month', label: 'Current month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'year', label: 'Current year' },
  { key: 'all', label: 'All time' },
  { key: 'custom', label: 'Custom range' },
];

const STATUS_OPTIONS = [DTL_BOOKING_STATUS.Created, DTL_BOOKING_STATUS.Completed, DTL_BOOKING_STATUS.Cancelled];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function startOfLastMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1, 0, 0, 0, 0);
}
function endOfLastMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 0, 23, 59, 59, 999);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}
function endOfYear(d: Date) {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}
function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function DtlGuestBookingReport() {
  const { showToast } = useToast();

  const [range, setRange] = useState<RangeKind>('month');
  const [customFrom, setCustomFrom] = useState(() => toDateInputValue(startOfMonth(new Date())));
  const [customTo, setCustomTo] = useState(() => toDateInputValue(new Date()));
  const [statuses, setStatuses] = useState<string[]>([DTL_BOOKING_STATUS.Completed]);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  function toggleStatus(status: string) {
    setStatuses((prev) => (prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]));
  }

  const { from, to } = useMemo(() => {
    const now = new Date();
    switch (range) {
      case 'month':
        return { from: startOfMonth(now), to: endOfMonth(now) };
      case 'lastMonth':
        return { from: startOfLastMonth(now), to: endOfLastMonth(now) };
      case 'year':
        return { from: startOfYear(now), to: endOfYear(now) };
      case 'custom': {
        const f = customFrom ? new Date(`${customFrom}T00:00:00`) : undefined;
        const t = customTo ? new Date(`${customTo}T23:59:59.999`) : undefined;
        return { from: f, to: t };
      }
      case 'all':
      default:
        return { from: undefined, to: undefined };
    }
  }, [range, customFrom, customTo]);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['dtl-booking-report', range, from?.getTime(), to?.getTime(), statuses],
    queryFn: () => getDtlBookingReport({ from, to, statuses }),
    refetchOnMount: 'always',
  });

  const rows = report?.rows ?? [];

  async function handleExport(format: ExportFormat) {
    if (!report) return;
    setExportingFormat(format);
    try {
      if (format === 'pdf') await exportDtlReportToPdf(report);
      else if (format === 'docx') await exportDtlReportToDocx(report);
      else await exportDtlReportToExcel(report);
      showToast(`${format.toUpperCase()} exported successfully`, 'success');
    } catch {
      showToast(`Failed to export ${format.toUpperCase()}`, 'error');
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Guest booking report</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleExport('pdf')}
              disabled={!report || rows.length === 0 || exportingFormat !== null}
            >
              <FileDown size={16} className="mr-1.5" />
              {exportingFormat === 'pdf' ? 'Exporting…' : 'PDF'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleExport('docx')}
              disabled={!report || rows.length === 0 || exportingFormat !== null}
            >
              <FileType size={16} className="mr-1.5" />
              {exportingFormat === 'docx' ? 'Exporting…' : 'DOCX'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleExport('excel')}
              disabled={!report || rows.length === 0 || exportingFormat !== null}
            >
              <FileSpreadsheet size={16} className="mr-1.5" />
              {exportingFormat === 'excel' ? 'Exporting…' : 'Excel'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ListFilterBar>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Range</Label>
            <div className="flex flex-wrap items-center gap-2">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setRange(opt.key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    range === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {range === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-auto"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-auto"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    statuses.includes(s)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </ListFilterBar>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Phone</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Program</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Bookings</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Passport</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">IBAN</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">Picture</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-destructive">
                    Could not load the report. Check your connection and try again.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    No bookings match these filters.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r) => (
                    <tr key={r.guestId} className="border-b border-border">
                      <td className="py-3 px-4 text-sm font-medium text-card-foreground">{r.name}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{r.email || '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{r.phone || '—'}</td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{r.programNames.join(' + ')}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {r.bookingCount} time{r.bookingCount === 1 ? '' : 's'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-card-foreground">{r.amount.toFixed(2)}</td>
                      <td className="py-3 px-4 text-sm">
                        {r.passportLink ? (
                          <a href={r.passportLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <FileText size={14} /> View
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {r.ibanLink ? (
                          <a href={r.ibanLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <FileText size={14} /> View
                          </a>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {r.imageLink ? (
                          <a href={r.imageLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                            <FileText size={14} /> View
                          </a>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-semibold">
                    <td className="py-3 px-4 text-sm text-card-foreground" colSpan={5}>Total</td>
                    <td className="py-3 px-4 text-sm text-card-foreground">{report?.grandTotal.toFixed(2)}</td>
                    <td colSpan={3} />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
