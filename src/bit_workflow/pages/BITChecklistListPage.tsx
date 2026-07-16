import { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertCircle, ArrowLeft, ClipboardList, Eye, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { bitChecklistApi, getApiErrorMessage } from '@/api/bitChecklistApi';
import {
  checklistTypeLabel,
  isChecklistType,
  periodDateFor,
  periodLabelFor,
  periodLabelForDate,
  submissionStatusBadgeClass,
  submissionStatusLabel,
} from '../utils/checklistUtils';
import type { ChecklistSubmissionSummary, ChecklistType } from '../types/checklist';

const START_LABEL: Record<ChecklistType, string> = {
  daily: "Start Today's Checklist",
  weekly: "Start This Week's Checklist",
  monthly: "Start This Month's Checklist",
};

const CONTINUE_LABEL: Record<ChecklistType, string> = {
  daily: "Continue Today's Checklist",
  weekly: "Continue This Week's Checklist",
  monthly: "Continue This Month's Checklist",
};

export function BITChecklistListPage() {
  const { type } = useParams<{ type: string }>();

  if (!isChecklistType(type)) {
    return <Navigate to="/bit" replace />;
  }

  return <ChecklistList key={type} type={type} />;
}

function ChecklistList({ type }: { type: ChecklistType }) {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<ChecklistSubmissionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubmissions(await bitChecklistApi.getSubmissionSummaries(type));
    } catch (err) {
      console.error('Failed to load checklist submissions:', err);
      setError(getApiErrorMessage(err, 'Failed to load submissions. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    load();
  }, [load]);

  // Display-only comparison to label the current-period row and pick the button text —
  // the server remains the authority for what the current period actually is.
  const currentPeriodDate = periodDateFor(type);
  const hasCurrent = submissions.some((s) => s.periodDate === currentPeriodDate);

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="shrink-0 mt-0.5" onClick={() => navigate('/bit')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{checklistTypeLabel(type)} Checklists</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Submission history — current period: {periodLabelFor(type)}
            </p>
          </div>
        </div>
        <Button onClick={() => navigate(`/bit/checklist/${type}/form`)} className="self-start sm:self-center">
          <Play size={16} className="mr-1.5" />
          {hasCurrent ? CONTINUE_LABEL[type] : START_LABEL[type]}
        </Button>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
        </div>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={28} className="text-destructive" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                    Date
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                    Engineer Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                    Progress
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-card-foreground whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center">
                      <ClipboardList size={32} className="mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No {type} checklist submissions yet — start the first one above.
                      </p>
                    </td>
                  </tr>
                )}
                {submissions.map((submission, index) => {
                  const pct = submission.totalCount
                    ? Math.round((submission.completedCount / submission.totalCount) * 100)
                    : 0;
                  const isCurrent = submission.periodDate === currentPeriodDate;
                  // engineers is the new summary field; fall back to engineerName until
                  // the backend change is deployed (field absent → undefined).
                  const engineerLabel =
                    submission.engineers?.join(', ') || submission.engineerName || '—';

                  return (
                    <motion.tr
                      key={submission.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: 0.08 + index * 0.04 }}
                      className="border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/bit/checklist/${type}/view/${submission.id}`)}
                    >
                      <td className="py-3 px-4 text-sm font-medium text-card-foreground whitespace-nowrap">
                        {periodLabelForDate(type, submission.periodDate)}
                        {isCurrent && (
                          <Badge className="ml-2 border-transparent bg-primary/15 text-primary">Current</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground max-w-[260px]">
                        <span className="block truncate" title={engineerLabel}>
                          {engineerLabel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <Progress value={pct} className="h-1.5 w-20" />
                          <span className="text-sm text-card-foreground tabular-nums whitespace-nowrap">
                            {submission.completedCount}/{submission.totalCount}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={submissionStatusBadgeClass(submission.status)}>
                          {submissionStatusLabel(submission.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/bit/checklist/${type}/view/${submission.id}`);
                          }}
                        >
                          <Eye size={14} className="mr-1.5" /> View
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
