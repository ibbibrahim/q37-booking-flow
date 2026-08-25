import type { ReactNode } from 'react';
import { UserPlus, ArrowRightLeft, Building2, Layers, TrendingUp, BadgeCheck, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useHrLanguage, bilingual } from '../context/HrLanguageContext';
import { formatDate } from '../utils/hrUtils';
import type { HrEmployeeHistoryEvent, HrHistoryEventType } from '../types/hrApi';

const EVENT_STYLE: Record<HrHistoryEventType, { icon: typeof UserPlus; accent: string }> = {
  Hired: { icon: UserPlus, accent: 'bg-success/15 text-success' },
  ContractType: { icon: ArrowRightLeft, accent: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  Department: { icon: Building2, accent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  Section: { icon: Layers, accent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
  JobTitle: { icon: TrendingUp, accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  Grade: { icon: BadgeCheck, accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-300' },
  Status: { icon: Activity, accent: 'bg-primary/15 text-primary' },
};

function describeEvent(
  e: HrEmployeeHistoryEvent,
  language: 'en' | 'ar',
  t: (key: 'eventHired' | 'eventContractType' | 'eventDepartment' | 'eventSection' | 'eventJobTitle' | 'eventGrade' | 'eventStatus') => string
): { title: string; detail: ReactNode } {
  switch (e.eventType) {
    case 'Hired': {
      const parts: ReactNode[] = [];
      if (e.toJobTitleEn) parts.push(bilingual(language, e.toJobTitleEn, e.toJobTitleAr));
      if (e.toContractType) parts.push(e.toContractType);
      if (e.toDepartmentId) parts.push(bilingual(language, e.toDepartmentNameEn, e.toDepartmentNameAr));
      return {
        title: t('eventHired'),
        detail: parts.length > 0 ? parts.join(' · ') : e.toContractType,
      };
    }
    case 'ContractType':
      return { title: t('eventContractType'), detail: `${e.fromContractType} → ${e.toContractType}` };
    case 'Department':
      return {
        title: t('eventDepartment'),
        detail: `${e.fromDepartmentId ? bilingual(language, e.fromDepartmentNameEn, e.fromDepartmentNameAr) : '—'} → ${bilingual(language, e.toDepartmentNameEn, e.toDepartmentNameAr)}`,
      };
    case 'Section':
      return {
        title: t('eventSection'),
        detail: `${e.fromSectionId ? bilingual(language, e.fromSectionNameEn, e.fromSectionNameAr) : '—'} → ${e.toSectionId ? bilingual(language, e.toSectionNameEn, e.toSectionNameAr) : '—'}`,
      };
    case 'JobTitle':
      return {
        title: t('eventJobTitle'),
        detail: `${bilingual(language, e.fromJobTitleEn, e.fromJobTitleAr)} → ${bilingual(language, e.toJobTitleEn, e.toJobTitleAr)}`,
      };
    case 'Grade':
      return { title: t('eventGrade'), detail: `${e.fromGrade ?? '—'} → ${e.toGrade ?? '—'}` };
    case 'Status':
      return { title: t('eventStatus'), detail: `${e.fromStatus} → ${e.toStatus}` };
  }
}

export function EmployeeHistoryTimeline({ events }: { events: HrEmployeeHistoryEvent[] }) {
  const { language, t } = useHrLanguage();

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('noHistory')}</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <ol className="space-y-5">
          {events.map((e, idx) => {
            const { icon: Icon, accent } = EVENT_STYLE[e.eventType];
            const { title, detail } = describeEvent(e, language, t);
            const isLast = idx === events.length - 1;

            return (
              <li key={e.id} className="relative flex gap-3">
                {!isLast && (
                  <span className="absolute left-4 top-9 bottom-[-1.25rem] w-px bg-border" aria-hidden />
                )}
                <div className={cn('relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', accent)}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground shrink-0">{formatDate(e.changeDate)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{detail}</p>
                  {(e.reason && e.reason !== 'Initial hire') || e.note ? (
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {e.reason && e.reason !== 'Initial hire' ? e.reason : ''}
                      {e.reason && e.reason !== 'Initial hire' && e.note ? ' — ' : ''}
                      {e.note}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
