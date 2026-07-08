import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Save,
  Send,
  UserCircle2,
  Users,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { bitChecklistApi, getApiErrorMessage, isAlreadyCompletedError } from '@/api/bitChecklistApi';
import { VendorBadge } from '../components/VendorBadge';
import {
  checklistTypeLabel,
  engineersOn,
  freshItemsFrom,
  isChecklistType,
  periodLabelFor,
  periodLabelForDate,
  sectionNamesFrom,
  submissionStatusBadgeClass,
  submissionStatusLabel,
} from '../utils/checklistUtils';
import type {
  ChecklistItem,
  ChecklistSubmissionStatus,
  ChecklistTemplate,
  ChecklistType,
} from '../types/checklist';

export function BITChecklistFormPage({ readOnly = false }: { readOnly?: boolean }) {
  const { type, id } = useParams<{ type: string; id?: string }>();

  if (!isChecklistType(type)) {
    return <Navigate to="/bit" replace />;
  }

  if (readOnly) {
    const viewId = Number(id);
    if (!Number.isInteger(viewId)) {
      return <Navigate to={`/bit/checklist/${type}`} replace />;
    }
    return <ChecklistForm key={`view-${viewId}`} type={type} viewId={viewId} />;
  }

  // Keyed by type so state fully resets when navigating between checklist types
  return <ChecklistForm key={type} type={type} />;
}

function ChecklistForm({ type, viewId }: { type: ChecklistType; viewId?: number }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();

  const isViewMode = viewId !== undefined;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [items, setItems] = useState<Record<number, ChecklistItem>>({});
  const [status, setStatus] = useState<ChecklistSubmissionStatus | undefined>(undefined);
  const [engineerName, setEngineerName] = useState('');
  const [periodDate, setPeriodDate] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const sections = useMemo(() => sectionNamesFrom(templates), [templates]);

  const applyItems = (source: ChecklistItem[], loadedTemplates: ChecklistTemplate[]) => {
    const byId = new Map(source.map((item) => [item.templateId, item]));
    setItems(
      Object.fromEntries(
        loadedTemplates.map((t) => {
          const item = byId.get(t.id);
          return [
            t.id,
            item
              ? { ...item }
              : { templateId: t.id, isCompleted: false, completionTime: '', remarks: '', completedBy: '' },
          ];
        })
      )
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isViewMode) {
        const [loadedTemplates, submission] = await Promise.all([
          bitChecklistApi.getTemplates(type),
          bitChecklistApi.getSubmissionById(viewId!),
        ]);
        setTemplates(loadedTemplates);
        applyItems(submission.items, loadedTemplates);
        setStatus(submission.status);
        setEngineerName(submission.engineerName);
        setPeriodDate(submission.periodDate);
        setOpenSections(Object.fromEntries(sectionNamesFrom(loadedTemplates).map((s) => [s, true])));
      } else {
        const [loadedTemplates, current] = await Promise.all([
          bitChecklistApi.getTemplates(type),
          bitChecklistApi.getCurrentSubmission(type),
        ]);
        setTemplates(loadedTemplates);
        applyItems(current?.items ?? freshItemsFrom(loadedTemplates), loadedTemplates);
        setStatus(current?.status);
        setEngineerName(current?.engineerName ?? '');
        setPeriodDate(current?.periodDate ?? null);
        setOpenSections(Object.fromEntries(sectionNamesFrom(loadedTemplates).map((s) => [s, true])));
      }
    } catch (err) {
      console.error('Failed to load checklist:', err);
      if (isViewMode && isAxiosError(err) && err.response?.status === 404) {
        showToast('Checklist submission not found.', 'warning');
        navigate(`/bit/checklist/${type}`, { replace: true });
        return;
      }
      setLoadError(getApiErrorMessage(err, 'Failed to load the checklist. Please try again.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, viewId, isViewMode]);

  useEffect(() => {
    load();
  }, [load]);

  // Completed submissions are read-only even on the form route
  const readOnly = isViewMode || status === 'completed';

  const completedCount = Object.values(items).filter((i) => i.isCompleted).length;
  const pct = templates.length ? Math.round((completedCount / templates.length) * 100) : 0;
  const engineers = useMemo(() => engineersOn(Object.values(items)), [items]);

  const updateRemarks = (templateId: number, remarks: string) => {
    setItems((prev) => ({ ...prev, [templateId]: { ...prev[templateId], remarks } }));
  };

  const toggleItem = (templateId: number, checked: boolean) => {
    setItems((prev) => {
      const item = prev[templateId];
      return {
        ...prev,
        [templateId]: {
          ...item,
          isCompleted: checked,
          // completionTime/completedBy are stamped by the SERVER on save. Locally we only
          // clear them on uncheck; a newly checked row shows them after Save Progress.
          completionTime: checked ? item.completionTime : '',
          completedBy: checked ? item.completedBy : '',
        },
      };
    });
  };

  const buildSaveBody = (submit: boolean) => ({
    submit,
    items: templates.map((t) => ({
      templateId: t.id,
      isCompleted: items[t.id]?.isCompleted ?? false,
      remarks: items[t.id]?.remarks ?? '',
    })),
  });

  const handleWriteError = (err: unknown, fallback: string) => {
    if (isAlreadyCompletedError(err)) {
      setStatus('completed');
      showToast('This checklist was already submitted and can no longer be edited.', 'warning');
      return;
    }
    showToast(getApiErrorMessage(err, fallback), 'error');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await bitChecklistApi.saveCurrentSubmission(type, buildSaveBody(false));
      applyItems(saved.items, templates);
      setStatus(saved.status);
      setEngineerName(saved.engineerName);
      setPeriodDate(saved.periodDate);
      showToast('Progress saved.', 'success');
    } catch (err) {
      console.error('Failed to save checklist progress:', err);
      handleWriteError(err, 'Failed to save progress. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const remaining = templates.length - completedCount;
    if (remaining > 0) {
      showToast(`${remaining} check${remaining === 1 ? '' : 's'} still incomplete — complete all items before submitting.`, 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await bitChecklistApi.saveCurrentSubmission(type, buildSaveBody(true));
      showToast(`${checklistTypeLabel(type)} checklist submitted.`, 'success');
      navigate(`/bit/checklist/${type}`);
    } catch (err) {
      console.error('Failed to submit checklist:', err);
      handleWriteError(err, 'Failed to submit the checklist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const periodLabel = periodDate ? periodLabelForDate(type, periodDate) : periodLabelFor(type);
  const busy = saving || submitting;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="icon" onClick={() => navigate(`/bit/checklist/${type}`)}>
          <ArrowLeft size={16} />
        </Button>
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <Button
            variant="outline"
            size="icon"
            className="shrink-0 mt-0.5"
            onClick={() => navigate(`/bit/checklist/${type}`)}
          >
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {checklistTypeLabel(type)} System Readiness Checklist
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {readOnly
                ? 'Read-only view of a checklist submission'
                : 'Check each application using the provided IP addresses — time and engineer are recorded automatically'}
            </p>
          </div>
        </div>
        <Badge className={cn('self-start sm:self-center', submissionStatusBadgeClass(status))}>
          {submissionStatusLabel(status)}
        </Badge>
      </motion.div>

      {/* Period / engineers / progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Period</p>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/40 text-sm font-medium text-card-foreground">
                <CalendarDays size={16} className="text-primary shrink-0" />
                {periodLabel}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">
                {engineers.length > 1 ? 'Engineers' : 'Engineer'}
              </p>
              <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/40 text-sm font-medium text-card-foreground overflow-hidden">
                <Users size={16} className="text-primary shrink-0" />
                <span className="truncate" title={engineers.join(', ')}>
                  {engineers.length > 0 ? engineers.join(', ') : engineerName || '—'}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-muted-foreground">Progress</p>
                <p className="text-xs font-semibold text-card-foreground tabular-nums">
                  {completedCount}/{templates.length}
                </p>
              </div>
              <Progress value={pct} className="h-2.5" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Section tables */}
      {sections.map((section, sectionIndex) => {
        const sectionTemplates = templates.filter((t) => t.sectionName === section);
        const sectionDone = sectionTemplates.filter((t) => items[t.id]?.isCompleted).length;
        const isOpen = openSections[section] ?? true;

        return (
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + sectionIndex * 0.07 }}
            className="rounded-lg border border-border bg-card overflow-hidden"
          >
            {/* Section title bar — Excel-style light blue band */}
            <button
              onClick={() => setOpenSections((prev) => ({ ...prev, [section]: !isOpen }))}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left bg-sky-500/10 dark:bg-sky-500/15 hover:bg-sky-500/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <ClipboardCheck size={16} className="text-sky-700 dark:text-sky-300 shrink-0" />
                <span className="font-semibold text-sm uppercase tracking-wide text-sky-900 dark:text-sky-200 truncate">
                  {section}
                </span>
                <Badge
                  className={cn(
                    'border-transparent tabular-nums',
                    sectionDone === sectionTemplates.length
                      ? 'bg-success/15 text-success'
                      : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                  )}
                >
                  {sectionDone}/{sectionTemplates.length}
                </Badge>
              </div>
              <ChevronDown
                size={16}
                className={cn('shrink-0 text-sky-700 dark:text-sky-300 transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[880px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="w-12 py-2 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Done
                          </th>
                          <th className="w-56 py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Application
                          </th>
                          <th className="py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Action Steps
                          </th>
                          <th className="w-40 py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Completed
                          </th>
                          <th className="w-56 py-2 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionTemplates.map((template) => {
                          const item = items[template.id];
                          if (!item) return null;
                          return (
                            <tr
                              key={template.id}
                              className={cn(
                                'border-b border-border last:border-b-0 align-top transition-colors',
                                item.isCompleted ? 'bg-success/5' : 'hover:bg-muted/30'
                              )}
                            >
                              <td
                                className={cn(
                                  'py-3 px-3 text-center border-l-[3px] transition-colors',
                                  item.isCompleted ? 'border-l-success' : 'border-l-transparent'
                                )}
                              >
                                <Checkbox
                                  checked={item.isCompleted}
                                  disabled={readOnly || busy}
                                  onCheckedChange={(checked) => toggleItem(template.id, checked === true)}
                                  className="mt-0.5"
                                />
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <VendorBadge vendor={template.vendor} />
                                  <span className="font-medium text-sm text-card-foreground">
                                    {template.applicationName}
                                  </span>
                                </div>
                                <p className="text-xs font-mono text-muted-foreground mt-1">{template.ip}</p>
                              </td>
                              <td className="py-3 px-3">
                                <ol className="list-decimal list-inside space-y-0.5">
                                  {template.actionSteps.map((step, i) => (
                                    <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              </td>
                              <td className="py-3 px-3">
                                {item.isCompleted ? (
                                  item.completionTime || item.completedBy ? (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-card-foreground tabular-nums">
                                        <Clock size={13} className="text-success shrink-0" />
                                        {item.completionTime || '—'}
                                      </span>
                                      {item.completedBy && (
                                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <UserCircle2 size={12} className="shrink-0" />
                                          <span className="truncate" title={item.completedBy}>
                                            {item.completedBy}
                                          </span>
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      Recorded on save
                                    </span>
                                  )
                                ) : (
                                  <span className="text-sm text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {readOnly ? (
                                  <span className="text-sm text-muted-foreground">{item.remarks || '—'}</span>
                                ) : (
                                  <Input
                                    value={item.remarks}
                                    disabled={busy}
                                    onChange={(e) => updateRemarks(template.id, e.target.value)}
                                    placeholder="Remarks"
                                    className="h-8 text-sm"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Actions */}
      {!readOnly && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {completedCount === templates.length
                    ? 'All checks complete — ready to submit.'
                    : `${templates.length - completedCount} of ${templates.length} checks remaining.`}
                </p>
                {user && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Signed in as <span className="font-medium">{user.username}</span> — completed steps are
                    recorded under your name.
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleSave} disabled={busy}>
                  <Save size={16} className="mr-1.5" /> {saving ? 'Saving…' : 'Save Progress'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={busy || completedCount !== templates.length}
                >
                  <Send size={16} className="mr-1.5" /> {submitting ? 'Submitting…' : 'Submit Checklist'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
