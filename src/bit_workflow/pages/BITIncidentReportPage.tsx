import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FileCheck2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { bitIncidentApi } from '@/api/bitIncidentApi';
import { bitTicketApi } from '@/api/bitTicketApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useToast } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';
import { TONE_PILL, pillClass } from '@/lib/tone';
import { useBitTicketChanged } from '../hooks/useBitTicketChanged';
import { useNow } from '../hooks/useNow';
import {
  FREQUENCIES,
  FREQUENCY_LABELS,
  REPORT_PRIORITIES,
  REPORT_PRIORITY_LABELS,
  REPORT_PRIORITY_TONES,
  formatDowntime,
  fromLocalInput,
  reportDueText,
  toLocalInput,
} from '../utils/ticketUtils';
import type {
  IncidentEquipment,
  IncidentFrequency,
  IncidentReport,
  IncidentReportPriority,
  SaveIncidentReport,
} from '../types/incident';
import { ticketPath } from '../utils/engineeringPaths';

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

const AUTOSAVE_MS = 1500;

const EMPTY_EQUIPMENT: IncidentEquipment = { name: '', brand: '', model: '', serialNo: '', location: '' };

type RequiredKey =
  | 'equipment'
  | 'problemObserved'
  | 'impact'
  | 'immediateAction'
  | 'rootCause'
  | 'actions'
  | 'startedAt';

const REQUIRED_LABELS: Record<RequiredKey, string> = {
  equipment: 'Equipment name (at least one row)',
  problemObserved: 'Problem observed',
  impact: 'On-air impact',
  immediateAction: 'Immediate action taken',
  rootCause: 'Root cause',
  actions: 'Corrective or preventive action',
  startedAt: 'Incident start time',
};

const REQUIRED_ORDER: RequiredKey[] = [
  'equipment',
  'problemObserved',
  'impact',
  'startedAt',
  'immediateAction',
  'rootCause',
  'actions',
];

function toForm(r: IncidentReport): SaveIncidentReport {
  return {
    reportDate: r.reportDate,
    department: r.department ?? '',
    location: r.location ?? '',
    reportedByName: r.reportedByName ?? '',
    equipment: r.equipment.length > 0 ? r.equipment : [{ ...EMPTY_EQUIPMENT }],
    problemObserved: r.problemObserved ?? '',
    conditions: r.conditions ?? '',
    frequency: r.frequency ?? '',
    impact: r.impact ?? '',
    priority: r.priority ?? 'normal',
    startedAt: r.startedAt,
    restoredAt: r.restoredAt,
    immediateAction: r.immediateAction ?? '',
    rootCause: r.rootCause ?? '',
    correctiveActions: r.correctiveActions ?? '',
    preventiveActions: r.preventiveActions ?? '',
    recommendations: r.recommendations ?? '',
    pendingFollowups: r.pendingFollowups ?? '',
  };
}

function missingOf(f: SaveIncidentReport): Set<RequiredKey> {
  const missing = new Set<RequiredKey>();
  if (!f.equipment.some((e) => e.name.trim())) missing.add('equipment');
  if (!f.problemObserved.trim()) missing.add('problemObserved');
  if (!f.impact.trim()) missing.add('impact');
  if (!f.immediateAction.trim()) missing.add('immediateAction');
  if (!f.rootCause.trim()) missing.add('rootCause');
  if (!f.correctiveActions.trim() && !f.preventiveActions.trim()) missing.add('actions');
  if (!f.startedAt) missing.add('startedAt');
  return missing;
}

function minutesBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Number.isNaN(diff) || diff < 0 ? null : Math.round(diff / 60000);
}

// ── Presentational helpers ──────────────────────────────────────────

function SectionCard({
  n,
  title,
  ar,
  children,
}: {
  n?: number;
  title: string;
  ar: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        {n !== undefined && (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
            {n}
          </span>
        )}
        <h2 className="min-w-0 flex-1 text-sm font-semibold text-card-foreground">{title}</h2>
        <span dir="rtl" className="shrink-0 text-sm text-muted-foreground">
          {ar}
        </span>
      </div>
      <CardContent className="space-y-4 p-5">{children}</CardContent>
    </Card>
  );
}

function ReadText({ value }: { value: string | null | undefined }) {
  return value && value.trim() ? (
    <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{value}</p>
  ) : (
    <p className="text-sm text-muted-foreground/60">—</p>
  );
}

function Field({
  label,
  htmlFor,
  error,
  helper,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: boolean;
  helper?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">Required</p> : helper}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────

export function BITIncidentReportPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const now = useNow();

  const {
    data: report,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bit-incident-report', id],
    queryFn: () => bitIncidentApi.getReport(id),
    enabled: Number.isFinite(id),
    retry: false,
    refetchOnWindowFocus: false,
  });

  usePageHeader('Incident Report', report ? `${report.ticketNo} · ${report.ticketTitle}` : 'Loading…');

  const [form, setForm] = useState<SaveIncidentReport | null>(null);
  const formRef = useRef<SaveIncidentReport | null>(null);
  formRef.current = form;
  const initialized = useRef(false);

  const [reviseMode, setReviseMode] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [dirtyVersion, setDirtyVersion] = useState(0);
  const versionRef = useRef(0);
  const inFlight = useRef(false);
  const submitting = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (report && !initialized.current) {
      initialized.current = true;
      setForm(toForm(report));
    }
  }, [report]);

  useBitTicketChanged(() => {
    void queryClient.invalidateQueries({ queryKey: ['bit-incident-register'] });
  });

  const isSubmitted = report?.status === 'submitted';
  const readOnly = isSubmitted && !reviseMode;
  const canEdit = !!report && !readOnly;

  const invalidateTicketQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bit-tickets'] }),
      queryClient.invalidateQueries({ queryKey: ['bit-ticket', id] }),
      queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] }),
      queryClient.invalidateQueries({ queryKey: ['bit-incident-register'] }),
    ]);
  }, [queryClient, id]);

  const saveMutation = useMutation({
    mutationFn: (body: SaveIncidentReport) => bitIncidentApi.saveReport(id, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(['bit-incident-report', id], saved);
      void invalidateTicketQueries();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (body: SaveIncidentReport) => bitIncidentApi.submitReport(id, body),
    onSuccess: async (saved) => {
      queryClient.setQueryData(['bit-incident-report', id], saved);
      submitting.current = false;
      setReviseMode(false);
      setSubmitOpen(false);
      setConfirmed(false);
      setSaveState('idle');
      setForm(toForm(saved));
      await invalidateTicketQueries();
      showToast(`Incident report ${saved.reportNo ?? ''} submitted`.replace('  ', ' '), 'success');
    },
    onError: (err) => {
      submitting.current = false;
      showToast(getApiErrorMessage(err, 'Could not submit the report'), 'error');
    },
  });

  /** Saves the current form. Resolves true when nothing is left unsaved. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    const current = formRef.current;
    if (!current) return false;
    if (inFlight.current || submitting.current) return false;
    const version = versionRef.current;
    inFlight.current = true;
    setSaveState('saving');
    try {
      await saveMutation.mutateAsync(current);
      setLastSavedAt(new Date());
      inFlight.current = false;
      if (versionRef.current !== version) {
        return await saveNow();
      }
      setSaveState('saved');
      return true;
    } catch (err) {
      inFlight.current = false;
      setSaveState('error');
      showToast(getApiErrorMessage(err, 'Could not save the report'), 'error');
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutateAsync is stable enough; avoid re-creating per render
  }, [showToast]);

  // Debounced autosave — first save happens on first edit.
  useEffect(() => {
    if (dirtyVersion === 0 || !canEdit) return;
    setSaveState((s) => (s === 'saving' ? s : 'dirty'));
    const t = window.setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
  }, [dirtyVersion, canEdit, saveNow]);

  function update(patch: Partial<SaveIncidentReport>) {
    setForm((f) => (f ? { ...f, ...patch } : f));
    versionRef.current += 1;
    setDirtyVersion(versionRef.current);
  }

  function updateEquipment(index: number, patch: Partial<IncidentEquipment>) {
    if (!form) return;
    update({ equipment: form.equipment.map((e, i) => (i === index ? { ...e, ...patch } : e)) });
  }

  /** Persists any pending edits (used before leaving / previewing / submitting). */
  async function flush(): Promise<boolean> {
    if (!canEdit) return true;
    if (versionRef.current === 0 && report?.status !== 'new') return true;
    // Wait for an in-flight save, then save whatever is left.
    for (let i = 0; i < 20 && inFlight.current; i += 1) {
      await new Promise((r) => window.setTimeout(r, 100));
    }
    return saveNow();
  }

  async function handleBack() {
    if (canEdit && saveState === 'dirty') await flush();
    navigate(ticketPath(id));
  }

  async function handlePreview() {
    const win = window.open('', '_blank');
    setPreviewing(true);
    try {
      if (!(await flush())) {
        win?.close();
        return;
      }
      await bitIncidentApi.previewPdf(id, win);
    } catch (err) {
      win?.close();
      showToast(getApiErrorMessage(err, 'Could not generate the PDF preview'), 'error');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleDownload() {
    if (!report) return;
    setDownloading(true);
    try {
      await bitIncidentApi.downloadPdf(id, report.reportNo ?? report.ticketNo);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not download the PDF'), 'error');
    } finally {
      setDownloading(false);
    }
  }

  async function handleSaveDraft() {
    if (await flush()) showToast('Draft saved', 'success');
  }

  function openSubmit() {
    setAttempted(true);
    setConfirmed(false);
    setSubmitOpen(true);
  }

  function confirmSubmit() {
    if (!form) return;
    submitting.current = true;
    submitMutation.mutate(form);
  }

  const missing = useMemo(() => (form ? missingOf(form) : new Set<RequiredKey>()), [form]);
  const invalid = (k: RequiredKey) => attempted && missing.has(k);
  const downtime = form ? minutesBetween(form.startedAt, form.restoredAt) : null;
  const restoreBeforeStart =
    !!form?.startedAt && !!form?.restoredAt && new Date(form.restoredAt) < new Date(form.startedAt);

  const { data: ticket, refetch: refetchTicket } = useQuery({
    queryKey: ['bit-ticket', id],
    queryFn: () => bitTicketApi.get(id),
    enabled: Number.isFinite(id) && !!report,
  });

  async function importUpdates() {
    if (!form) return;
    const detail = ticket ?? (await refetchTicket()).data;
    if (!detail) return;
    const lines = detail.comments
      .filter((c) => c.kind === 'update')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => `• ${format(new Date(c.createdAt), 'HH:mm')} ${c.authorName}: ${c.body.trim()}`)
      .filter((line) => !form.immediateAction.includes(line));
    if (lines.length === 0) {
      showToast('No new ticket updates to import', 'info');
      return;
    }
    const base = form.immediateAction.trimEnd();
    update({ immediateAction: base ? `${base}\n${lines.join('\n')}` : lines.join('\n') });
  }

  // ── Render states ─────────────────────────────────────────────────

  if (isLoading || (report && !form)) return <PageSkeleton />;

  if (error || !report || !form) {
    const notOnAir = isAxiosError(error) && error.response?.status === 400;
    return (
      <Card className="mx-auto max-w-4xl rounded-xl">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle size={28} className={notOnAir ? 'text-warning' : 'text-destructive'} />
          <p className="max-w-md text-sm text-muted-foreground">
            {notOnAir
              ? 'This ticket is not flagged as an on-air incident, so it has no incident report. Mark it as an on-air incident from the ticket to start one.'
              : getApiErrorMessage(error, 'Failed to load the incident report.')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(ticketPath(id))}>
              <ArrowLeft />
              Back to ticket
            </Button>
            {!notOnAir && <Button onClick={() => refetch()}>Retry</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const due = isSubmitted ? null : reportDueText(report.dueAt, now);
  const statusTone = isSubmitted ? 'success' : report.status === 'draft' ? 'info' : 'muted';
  const statusLabel = isSubmitted ? 'Submitted' : report.status === 'draft' ? 'Draft' : 'New';
  const preparedBy = report.preparedByName || user?.displayName || user?.username || '—';

  const saveIndicator =
    saveState === 'saving'
      ? 'Saving…'
      : saveState === 'dirty'
        ? 'Unsaved changes'
        : saveState === 'error'
          ? 'Save failed'
          : lastSavedAt
            ? `Saved · ${format(lastSavedAt, 'HH:mm')}`
            : report.updatedAt && report.status !== 'new'
              ? `Saved · ${format(new Date(report.updatedAt), 'HH:mm')}`
              : '';

  const textArea = (
    key: keyof SaveIncidentReport & ('problemObserved' | 'conditions' | 'impact' | 'immediateAction' | 'rootCause' | 'correctiveActions' | 'preventiveActions' | 'recommendations' | 'pendingFollowups'),
    label: string,
    opts: { rows?: number; required?: RequiredKey; placeholder?: string; helper?: React.ReactNode } = {}
  ) => (
    <Field
      label={label}
      htmlFor={`ir-${key}`}
      error={opts.required ? invalid(opts.required) : false}
      helper={readOnly ? undefined : opts.helper}
    >
      {readOnly ? (
        <ReadText value={form[key]} />
      ) : (
        <Textarea
          id={`ir-${key}`}
          value={form[key]}
          rows={opts.rows ?? 4}
          placeholder={opts.placeholder}
          onChange={(e) => update({ [key]: e.target.value })}
          aria-invalid={opts.required ? invalid(opts.required) : false}
          className={cn(opts.required && invalid(opts.required) && 'border-destructive')}
        />
      )}
    </Field>
  );

  const textInput = (key: 'department' | 'location' | 'reportedByName', label: string) => (
    <Field label={label} htmlFor={`ir-${key}`}>
      {readOnly ? (
        <ReadText value={form[key]} />
      ) : (
        <Input id={`ir-${key}`} value={form[key]} onChange={(e) => update({ [key]: e.target.value })} />
      )}
    </Field>
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="space-y-4 pb-6">
        {/* Summary bar */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="rounded-xl">
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Report no</p>
                <p className={cn('font-mono text-sm tabular-nums', report.reportNo ? 'text-card-foreground' : 'text-muted-foreground')}>
                  {report.reportNo ?? 'Not saved yet'}
                </p>
              </div>
              <span className={pillClass(statusTone)}>{statusLabel}</span>
              <span className="text-xs tabular-nums text-muted-foreground">Revision {Math.max(1, report.revision)}</span>
              {due && (
                <span className={`${pillClass(due.overdue ? 'destructive' : 'warning')} tabular-nums`}>{due.text}</span>
              )}
              <span
                className={cn(
                  'ml-auto text-xs tabular-nums',
                  saveState === 'error' ? 'text-destructive' : 'text-muted-foreground'
                )}
                aria-live="polite"
              >
                {readOnly ? '' : saveIndicator}
              </span>
            </CardContent>
          </Card>
        </motion.div>

        {/* 1 General information */}
        <SectionCard n={1} title="General information" ar="معلومات عامة">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Report date" htmlFor="ir-reportDate">
              {readOnly ? (
                <ReadText value={form.reportDate ? format(new Date(`${form.reportDate}T00:00:00`), 'd MMM yyyy') : null} />
              ) : (
                <Input
                  id="ir-reportDate"
                  type="date"
                  value={form.reportDate ?? ''}
                  onChange={(e) => update({ reportDate: e.target.value || null })}
                  className="tabular-nums"
                />
              )}
            </Field>
            {textInput('department', 'Department')}
            {textInput('location', 'Location')}
            {textInput('reportedByName', 'Report by')}
          </div>
        </SectionCard>

        {/* 2 Equipment */}
        <SectionCard n={2} title="Equipment details" ar="تفاصيل الأجهزة">
          <div className="space-y-2">
            <div className="hidden grid-cols-[repeat(5,minmax(0,1fr))_2rem] gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid">
              <span className={cn(invalid('equipment') && 'text-destructive')}>Equipment name</span>
              <span>Brand</span>
              <span>Model</span>
              <span>Serial no.</span>
              <span>Location</span>
              <span />
            </div>
            {form.equipment.map((e, i) => (
              <div
                key={i}
                className="grid grid-cols-1 gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-2 md:grid-cols-[repeat(5,minmax(0,1fr))_2rem] md:border-0 md:p-0"
              >
                {readOnly ? (
                  <>
                    <ReadText value={e.name} />
                    <ReadText value={e.brand} />
                    <ReadText value={e.model} />
                    <ReadText value={e.serialNo} />
                    <ReadText value={e.location} />
                  </>
                ) : (
                  <>
                    <Input
                      aria-label={`Equipment name, row ${i + 1}`}
                      placeholder="Equipment name"
                      value={e.name}
                      onChange={(ev) => updateEquipment(i, { name: ev.target.value })}
                      aria-invalid={invalid('equipment') && i === 0}
                      className={cn(invalid('equipment') && i === 0 && 'border-destructive')}
                    />
                    <Input
                      aria-label={`Brand, row ${i + 1}`}
                      placeholder="Brand"
                      value={e.brand}
                      onChange={(ev) => updateEquipment(i, { brand: ev.target.value })}
                    />
                    <Input
                      aria-label={`Model, row ${i + 1}`}
                      placeholder="Model"
                      value={e.model}
                      onChange={(ev) => updateEquipment(i, { model: ev.target.value })}
                    />
                    <Input
                      aria-label={`Serial number, row ${i + 1}`}
                      placeholder="Serial no."
                      value={e.serialNo}
                      onChange={(ev) => updateEquipment(i, { serialNo: ev.target.value })}
                    />
                    <Input
                      aria-label={`Location, row ${i + 1}`}
                      placeholder="Location"
                      value={e.location}
                      onChange={(ev) => updateEquipment(i, { location: ev.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Remove row ${i + 1}`}
                      disabled={form.equipment.length <= 1}
                      onClick={() => update({ equipment: form.equipment.filter((_, idx) => idx !== i) })}
                    >
                      <Trash2 />
                    </Button>
                  </>
                )}
              </div>
            ))}
            {invalid('equipment') && <p className="text-xs text-destructive">Add at least one piece of equipment.</p>}
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update({ equipment: [...form.equipment, { ...EMPTY_EQUIPMENT }] })}
              >
                <Plus />
                Add equipment
              </Button>
            )}
          </div>
        </SectionCard>

        {/* 3 Problem description */}
        <SectionCard n={3} title="Problem description" ar="وصف المشكلة">
          {textArea('problemObserved', 'Problem observed', { required: 'problemObserved', rows: 4 })}
          {textArea('conditions', 'Conditions when occurred', { rows: 3 })}

          <div className="space-y-2">
            <Label id="ir-frequency-label">Frequency</Label>
            {readOnly ? (
              <ReadText value={form.frequency ? FREQUENCY_LABELS[form.frequency] : null} />
            ) : (
              <div role="radiogroup" aria-labelledby="ir-frequency-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FREQUENCIES.map((f) => {
                  const selected = form.frequency === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ frequency: (selected ? '' : f) as IncidentFrequency })}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-primary/30 bg-primary/10 text-primary ring-1 ring-current'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {FREQUENCY_LABELS[f]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {textArea('impact', 'On-air impact', {
            required: 'impact',
            rows: 3,
            placeholder: 'What did viewers see or hear? Which programmes or channels were affected?',
          })}

          <div className="space-y-2">
            <Label id="ir-priority-label">Priority</Label>
            {readOnly ? (
              <span className={pillClass(REPORT_PRIORITY_TONES[form.priority])}>{REPORT_PRIORITY_LABELS[form.priority]}</span>
            ) : (
              <div role="radiogroup" aria-labelledby="ir-priority-label" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REPORT_PRIORITIES.map((p: IncidentReportPriority) => {
                  const selected = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => update({ priority: p })}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? cn(TONE_PILL[REPORT_PRIORITY_TONES[p]], 'ring-1 ring-current')
                          : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      {REPORT_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Timeline */}
        <SectionCard title="Incident timeline" ar="الجدول الزمني">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Started at" htmlFor="ir-startedAt" error={invalid('startedAt')}>
              {readOnly ? (
                <ReadText value={report.startedAt ? format(new Date(report.startedAt), 'd MMM yyyy, HH:mm') : null} />
              ) : (
                <Input
                  id="ir-startedAt"
                  type="datetime-local"
                  value={toLocalInput(form.startedAt)}
                  onChange={(e) => update({ startedAt: fromLocalInput(e.target.value) })}
                  aria-invalid={invalid('startedAt')}
                  className={cn('tabular-nums', invalid('startedAt') && 'border-destructive')}
                />
              )}
            </Field>
            <Field label="Restored at" htmlFor="ir-restoredAt">
              {readOnly ? (
                <ReadText value={form.restoredAt ? format(new Date(form.restoredAt), 'd MMM yyyy, HH:mm') : null} />
              ) : (
                <Input
                  id="ir-restoredAt"
                  type="datetime-local"
                  value={toLocalInput(form.restoredAt)}
                  onChange={(e) => update({ restoredAt: fromLocalInput(e.target.value) })}
                  className="tabular-nums"
                />
              )}
            </Field>
            <div className="space-y-1.5">
              <p className="text-sm font-medium leading-none text-card-foreground">On-air downtime</p>
              <span
                className={`${pillClass(restoreBeforeStart ? 'warning' : downtime === null ? 'muted' : 'destructive')} h-9 px-3 text-sm tabular-nums`}
              >
                {restoreBeforeStart ? 'Check times' : formatDowntime(downtime)}
              </span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Immediate action taken" ar="الإجراء الفوري">
          {textArea('immediateAction', 'Immediate action taken', {
            required: 'immediateAction',
            rows: 5,
            helper: (
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => void importUpdates()}>
                  <Wand2 />
                  Import from ticket updates
                </Button>
              </div>
            ),
          })}
        </SectionCard>

        <SectionCard title="Root cause" ar="السبب الجذري">
          {textArea('rootCause', 'Root cause', {
            required: 'rootCause',
            rows: 4,
            helper: (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">Write 'Under investigation' if not yet identified.</p>
                <button
                  type="button"
                  onClick={() => update({ rootCause: 'Under investigation' })}
                  className="rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  Under investigation
                </button>
              </div>
            ),
          })}
        </SectionCard>

        <SectionCard title="Corrective actions" ar="الإجراءات التصحيحية">
          {textArea('correctiveActions', 'Corrective actions', {
            required: 'actions',
            helper: <p className="text-xs text-muted-foreground">A corrective or a preventive action is required.</p>,
          })}
        </SectionCard>

        <SectionCard title="Preventive actions" ar="الإجراءات الوقائية">
          {textArea('preventiveActions', 'Preventive actions', { required: 'actions' })}
        </SectionCard>

        <SectionCard title="Recommendations" ar="التوصيات">
          {textArea('recommendations', 'Recommendations')}
        </SectionCard>

        <SectionCard title="Pending follow-up actions" ar="إجراءات المتابعة">
          {textArea('pendingFollowups', 'Pending follow-up actions')}
        </SectionCard>

        <SectionCard title="Prepared by" ar="إعداد">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium text-card-foreground">{preparedBy}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Signature</p>
              {isSubmitted && report.signedAt ? (
                <p className="inline-flex items-center gap-1.5 text-sm text-success">
                  <FileCheck2 size={14} aria-hidden />
                  Signed {format(new Date(report.signedAt), 'd MMM yyyy, HH:mm')}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Signed automatically on submission</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => void handleBack()} className="text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft />
            Back to ticket
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {readOnly ? (
              <>
                <Button variant="outline" disabled={downloading} onClick={() => void handleDownload()}>
                  {downloading ? <Loader2 className="animate-spin" /> : <Download />}
                  Download PDF
                </Button>
                <Button onClick={() => setReviseMode(true)}>
                  <Pencil />
                  Revise report
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" disabled={previewing} onClick={() => void handlePreview()}>
                  {previewing ? <Loader2 className="animate-spin" /> : <Eye />}
                  Preview PDF
                </Button>
                <Button variant="outline" disabled={saveState === 'saving'} onClick={() => void handleSaveDraft()}>
                  {saveState === 'saving' ? <Loader2 className="animate-spin" /> : <Save />}
                  Save draft
                </Button>
                <Button onClick={openSubmit} disabled={submitMutation.isPending}>
                  <Send />
                  Submit report
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Submit dialog */}
      <Dialog open={submitOpen} onOpenChange={(o) => !submitMutation.isPending && setSubmitOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit incident report</DialogTitle>
            <DialogDescription>
              The PDF is generated and emailed to management. Check that everything required is filled in.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {REQUIRED_ORDER.map((k) => {
              const ok = !missing.has(k);
              return (
                <li key={k} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                      ok ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    {ok ? <Check size={12} aria-hidden /> : <X size={12} aria-hidden />}
                  </span>
                  <span className={ok ? 'text-card-foreground' : 'text-muted-foreground'}>{REQUIRED_LABELS[k]}</span>
                  <span className="sr-only">{ok ? 'done' : 'missing'}</span>
                </li>
              );
            })}
          </ul>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3 text-sm text-card-foreground">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(c) => setConfirmed(c === true)}
              className="mt-0.5"
            />
            I confirm this report is accurate and complete
          </label>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={submitMutation.isPending} onClick={() => setSubmitOpen(false)}>
              Keep editing
            </Button>
            <Button disabled={missing.size > 0 || !confirmed || submitMutation.isPending} onClick={confirmSubmit}>
              {submitMutation.isPending ? <Loader2 className="animate-spin" /> : <Send />}
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
