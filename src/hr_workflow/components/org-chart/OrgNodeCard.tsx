import { Building2, ChevronDown, Crown, Layers, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHrLanguage } from '../../context/HrLanguageContext';
import type { OrgNode } from './orgTree';
import { orgIcon } from './orgIcons';
import { unitStyle } from './orgColors';

export type OrgMatchState = 'match' | 'dim' | 'none';

interface Props {
  node: OrgNode;
  expanded?: boolean;
  onToggle?: () => void;
  onSelect: (n: OrgNode) => void;
  matchState?: OrgMatchState;
}

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const MOTION = 'transition duration-200 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

export function OrgNodeCard({ node, expanded = false, onToggle, onSelect, matchState = 'none' }: Props) {
  const { language, t } = useHrLanguage();
  const primary = language === 'ar' ? node.nameAr : node.nameEn;
  const secondary = language === 'ar' ? node.nameEn : node.nameAr;
  const stateClass = cn(
    matchState === 'dim' && 'opacity-40',
    matchState === 'match' && 'ring-2 ring-qbc-blue ring-offset-2 ring-offset-background',
  );

  if (node.kind === 'root') {
    return (
      <div className={cn('relative w-72 overflow-hidden rounded-xl bg-qbc-blue-deep text-primary-foreground shadow-md', MOTION, stateClass)}>
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={cn('flex w-full items-center gap-3 px-4 py-4 text-start hover:bg-primary-foreground/5', MOTION, FOCUS)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-qbc-yellow text-qbc-yellow-foreground">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold leading-tight">{t('generalManager')}</span>
            <span dir="auto" className="block truncate text-[11px] text-primary-foreground/70">{secondary}</span>
            <span className="mt-0.5 block text-xs tabular-nums text-primary-foreground/80">
              {node.headcount.total} {t('headcount')}
            </span>
          </span>
        </button>
        <div className="h-1.5 bg-qbc-yellow" aria-hidden="true" />
      </div>
    );
  }

  if (node.kind === 'section') {
    const SectionIcon = orgIcon(node.icon, Layers);
    return (
      <button
          type="button"
          onClick={() => onSelect(node)}
          style={unitStyle(node)}
          className={cn(
            'flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-start text-card-foreground shadow-sm border-s-2 border-s-unit/70',
            'hover:-translate-y-0.5 hover:border-unit/60 hover:shadow-md',
            MOTION,
            FOCUS,
            stateClass,
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-unit/10 text-unit ring-1 ring-inset ring-unit/15">
            <SectionIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{primary}</span>
            <span dir="auto" className="block truncate text-[11px] text-muted-foreground">{secondary}</span>
          </span>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {node.headcount.total}
          </span>
        </button>
    );
  }

  const hasSections = node.children.length > 0;
  const DeptIcon = orgIcon(node.icon, Building2);
  return (
    <div className={cn('relative w-60', hasSections && 'pb-3')} style={unitStyle(node)}>
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm',
          'hover:-translate-y-0.5 hover:shadow-md',
          MOTION,
          stateClass,
        )}
      >
        <button type="button" onClick={() => onSelect(node)} className={cn('block w-full text-start', FOCUS)}>
          <span className="relative flex h-[4.5rem] flex-col items-center justify-center border-b-[3px] border-qbc-yellow bg-unit px-3 text-center text-primary-foreground">
            <span className="flex max-w-full items-center gap-1.5">
              <DeptIcon className="h-4 w-4 shrink-0 text-primary-foreground/80" aria-hidden="true" />
              <span className="line-clamp-2 text-sm font-semibold leading-snug">{primary}</span>
            </span>
            <span dir="auto" className="mt-0.5 w-full truncate text-[11px] text-primary-foreground/70">{secondary}</span>
          </span>
          <span className="flex flex-col gap-2 px-3 pb-4 pt-3">
            <span className="flex items-center gap-1.5 text-xs">
              <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {node.headName ? (
                <span className="truncate font-medium">{node.headName}</span>
              ) : (
                <span className="truncate text-muted-foreground">{t('noHeadAssigned')}</span>
              )}
            </span>
            <span className="flex items-center gap-2 text-[11px] tabular-nums">
              <span className="rounded-full bg-unit/10 px-2 py-0.5 font-semibold text-unit dark:bg-unit/30 dark:text-primary-foreground">{node.headcount.total}</span>
              <span className="text-muted-foreground">{t('permanent')} {node.headcount.permanent}</span>
              <span className="text-violet-600 dark:text-violet-300">{t('freelance')} {node.headcount.freelance}</span>
            </span>
          </span>
        </button>
      </div>
      {hasSections && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${t('sectionsCount')}: ${node.children.length}`}
          className={cn(
            'absolute bottom-0 start-1/2 flex h-6 -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-card px-2 text-[11px] font-medium tabular-nums text-muted-foreground shadow-sm hover:border-unit hover:text-unit rtl:translate-x-1/2',
            MOTION,
            FOCUS,
            matchState === 'dim' && 'opacity-40',
          )}
        >
          {node.children.length}
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none', expanded && 'rotate-180')} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
