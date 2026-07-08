import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ListChecks,
  UserCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { bitChecklistApi, getApiErrorMessage } from '@/api/bitChecklistApi';
import {
  checklistTypeLabel,
  engineersOn,
  periodLabelFor,
  sectionNamesFrom,
  submissionStatusBadgeClass,
  submissionStatusLabel,
} from '../utils/checklistUtils';
import type { ChecklistSubmission, ChecklistTemplate, ChecklistType } from '../types/checklist';

const CHECKLIST_TYPES: { type: ChecklistType; icon: React.ElementType; description: string }[] = [
  { type: 'daily', icon: CalendarCheck, description: 'Run at the start of each broadcast day' },
  { type: 'weekly', icon: CalendarRange, description: 'Run once a week at the end of the day' },
  { type: 'monthly', icon: CalendarDays, description: 'Run at the end of the month' },
];

interface TypeOverview {
  templates: ChecklistTemplate[];
  current: ChecklistSubmission | null;
}

export function BITChecklistDashboardPage() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Partial<Record<ChecklistType, TypeOverview>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        CHECKLIST_TYPES.map(async ({ type }) => {
          const [templates, current] = await Promise.all([
            bitChecklistApi.getTemplates(type),
            bitChecklistApi.getCurrentSubmission(type),
          ]);
          return [type, { templates, current }] as const;
        })
      );
      setOverview(Object.fromEntries(results));
    } catch (err) {
      console.error('Failed to load BIT checklist overview:', err);
      setError(getApiErrorMessage(err, 'Failed to load checklists. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-foreground">BIT Checklists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daily, weekly and monthly system readiness checks for broadcast IT applications
        </p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CHECKLIST_TYPES.map(({ type, icon: Icon, description }, index) => {
            const data = overview[type];
            const templates = data?.templates ?? [];
            const current = data?.current ?? null;
            const sections = sectionNamesFrom(templates);
            const completed = current ? current.items.filter((i) => i.isCompleted).length : 0;
            const pct = templates.length ? Math.round((completed / templates.length) * 100) : 0;
            const engineerLabel = current ? engineersOn(current.items).join(', ') || current.engineerName : '';

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.08 + index * 0.08 }}
                whileHover={{ y: -2 }}
              >
              <Card
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/bit/checklist/${type}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/bit/checklist/${type}`)}
                className="group h-full cursor-pointer transition-all hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon size={20} />
                    </div>
                    <Badge className={submissionStatusBadgeClass(current?.status)}>
                      {submissionStatusLabel(current?.status)}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-lg font-semibold text-card-foreground">
                        {checklistTypeLabel(type)} Checklist
                      </h2>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      />
                    </div>
                    <p className="text-sm font-medium text-primary mt-0.5">{periodLabelFor(type)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold text-card-foreground tabular-nums">
                        {completed}/{templates.length}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks size={14} />
                      {templates.length} checks · {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                    </span>
                    {engineerLabel && (
                      <span className="inline-flex items-center gap-1.5 truncate">
                        <UserCircle2 size={14} className="shrink-0" />
                        <span className="truncate" title={engineerLabel}>{engineerLabel}</span>
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
