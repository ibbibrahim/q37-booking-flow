import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ChevronRight, Crown, Layers, UserRound, Users } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useHrLanguage } from '../../context/HrLanguageContext';
import { EmployeeAvatar } from '../EmployeeAvatar';
import { employeesForNode, type OrgNode, type OrgTree } from './orgTree';
import { orgIcon } from './orgIcons';
import { unitStyle } from './orgColors';
import type { HrEmployee } from '../../types/hrApi';

interface Props {
  node: OrgNode | null;
  activeEmployees: HrEmployee[];
  onClose: () => void;
  onSelect: (n: OrgNode) => void;
  /** Needed so the root can list its departments (root.children is empty). */
  tree?: OrgTree;
}

function StatTile({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <p className={cn('text-xl font-semibold tabular-nums', className)}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function UnitRow({ unit, onSelect }: { unit: OrgNode; onSelect: (n: OrgNode) => void }) {
  const { language } = useHrLanguage();
  const Icon = orgIcon(unit.icon, unit.kind === 'section' ? Layers : Building2);
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(unit)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium">{language === 'ar' ? unit.nameAr : unit.nameEn}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{unit.headcount.total}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
      </button>
    </li>
  );
}

export function OrgUnitDrawer({ node, activeEmployees, onClose, onSelect, tree }: Props) {
  const { language, dir, t } = useHrLanguage();
  // Keep the last node mounted while the sheet slides out, otherwise it blanks mid-animation.
  const lastNode = useRef<OrgNode | null>(node);
  if (node) lastNode.current = node;
  const shown = node ?? lastNode.current;

  const kindLabel = !shown ? '' : shown.kind === 'root' ? t('generalManager') : shown.kind === 'department' ? t('department') : t('section');
  const primary = !shown ? '' : shown.kind === 'root' ? t('generalManager') : language === 'ar' ? shown.nameAr : shown.nameEn;
  const secondary = !shown ? '' : language === 'ar' ? shown.nameEn : shown.nameAr;

  const isRoot = shown?.kind === 'root';
  const HeaderIcon = !shown ? Building2 : isRoot ? Crown : orgIcon(shown.icon, shown.kind === 'section' ? Layers : Building2);
  const breakdown = isRoot && tree ? [...tree.staffOffices, ...tree.lineDepartments] : [];
  const employees = shown && !isRoot ? employeesForNode(shown, activeEmployees) : [];

  return (
    <Sheet open={node !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side={dir === 'rtl' ? 'left' : 'right'} dir={dir} className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {shown && (
          <>
            <SheetHeader className="space-y-1 border-b px-6 pb-5 pt-6 text-start">
              <div className="flex items-center gap-3 pe-6" style={unitStyle(shown)}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", shown.kind === 'section' ? 'bg-unit/10 text-unit' : shown.kind === 'department' ? 'bg-unit text-primary-foreground' : 'bg-qbc-blue-deep text-primary-foreground')}>
                  <HeaderIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <span className="block w-fit rounded-full bg-qbc-yellow/25 px-2.5 py-0.5 text-[11px] font-medium text-qbc-yellow-foreground dark:text-qbc-yellow">{kindLabel}</span>
                  <SheetTitle className="text-lg">{primary}</SheetTitle>
                </div>
              </div>
              <SheetDescription dir="auto" className="text-start">{secondary}</SheetDescription>
              {shown.kind === 'department' && (
                <p className="flex items-center gap-1.5 pt-1 text-sm">
                  <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">{t('departmentHead')}:</span>
                  <span className={cn('font-medium', !shown.headName && 'text-muted-foreground')}>{shown.headName ?? t('noHeadAssigned')}</span>
                </p>
              )}
            </SheetHeader>

            <div className="grid grid-cols-3 gap-3 border-b px-6 py-4">
              <StatTile label={t('total')} value={shown.headcount.total} className="text-primary" />
              <StatTile label={t('permanent')} value={shown.headcount.permanent} className="text-success" />
              <StatTile label={t('freelance')} value={shown.headcount.freelance} className="text-violet-600 dark:text-violet-300" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="space-y-5 px-4 py-4">
                {(shown.kind === 'department' && shown.children.length > 0) && (
                  <section>
                    <h3 className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t('sectionsCount')} ({shown.children.length})
                    </h3>
                    <ul>{shown.children.map((s) => <UnitRow key={s.id} unit={s} onSelect={onSelect} />)}</ul>
                  </section>
                )}

                {isRoot ? (
                  <section>
                    <h3 className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('departmentsCount')}</h3>
                    <ul>{breakdown.map((d) => <UnitRow key={d.id} unit={d} onSelect={onSelect} />)}</ul>
                  </section>
                ) : (
                  <section>
                    <h3 className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('viewEmployees')}</h3>
                    {employees.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                        <Users className="h-8 w-8 opacity-50" aria-hidden="true" />
                        {t('noEmployeesInUnit')}
                      </div>
                    ) : (
                      <ul>
                        {employees.map((e) => (
                          <li key={e.id}>
                            <Link
                              to={`/hr/employees/${e.contractType.toLowerCase()}/${e.id}`}
                              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <EmployeeAvatar
                                profilePictureUrl={e.profilePictureUrl}
                                gender={e.gender}
                                name={language === 'ar' ? e.fullNameAr : e.fullNameEn}
                                size="sm"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{language === 'ar' ? e.fullNameAr : e.fullNameEn}</span>
                                <span className="block truncate text-xs text-muted-foreground">{language === 'ar' ? e.jobTitleAr : e.jobTitleEn}</span>
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                                  e.contractType === 'Permanent' ? 'bg-success/15 text-success' : 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
                                )}
                              >
                                {e.contractType === 'Permanent' ? t('permanent') : t('freelance')}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
