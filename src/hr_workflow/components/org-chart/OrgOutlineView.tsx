import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Briefcase, Building2, ChevronDown, Crown, Layers, UserRound, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useHrLanguage } from '../../context/HrLanguageContext';
import type { HrEmployee } from '../../types/hrApi';
import type { OrgNode, OrgTree } from './orgTree';
import { orgIcon } from './orgIcons';
import { EmployeeAvatar } from '../EmployeeAvatar';

interface Props {
  tree: OrgTree;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (n: OrgNode) => void;
  matchIds: Set<string> | null;
  activeEmployees: HrEmployee[];
}

type Variant = 'root' | 'unit' | 'department' | 'section';

const INDENT = 28; // px per level; the elbow geometry below depends on it

function names(node: OrgNode, language: string) {
  return language === 'ar'
    ? { primary: node.nameAr, secondary: node.nameEn }
    : { primary: node.nameEn, secondary: node.nameAr };
}

// The light "└" connector: ends at the row's vertical centre, starting under the parent's chevron.
function Elbow({ level }: { level: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-0 h-1/2 w-3.5 rounded-es-md border-b border-s border-border"
      style={{ insetInlineStart: level * INDENT - 4 }}
    />
  );
}

function KindTile({ node, variant }: { node: OrgNode; variant: Variant }) {
  const config = {
    root: { cls: 'bg-primary text-primary-foreground', Icon: Crown },
    unit: { cls: 'bg-warning/15 text-warning', Icon: orgIcon(node.icon, Briefcase) },
    department: { cls: 'bg-primary/10 text-primary', Icon: orgIcon(node.icon, Building2) },
    section: { cls: 'bg-primary/5 text-primary/80 ring-1 ring-inset ring-primary/10', Icon: orgIcon(node.icon, Layers) },
  }[variant];
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', config.cls)}>
      <config.Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}

function Meta({ node, variant }: { node: OrgNode; variant: Variant }) {
  const { t, language } = useHrLanguage();
  const { secondary } = names(node, language);

  const parts: ReactNode[] = [
    <span key="alt" dir="auto" className="max-w-[14rem] truncate">{secondary}</span>,
  ];
  if (variant === 'unit' || variant === 'department') {
    parts.push(
      <span key="head" className={cn('flex min-w-0 items-center gap-1', !node.headName && 'text-muted-foreground/70')}>
        <UserRound className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span className="truncate">{node.headName ?? t('noHeadAssigned')}</span>
      </span>,
    );
  }
  const kindLabel =
    variant === 'unit' ? t('reportsDirectlyToGm') : variant === 'department' ? t('department') : variant === 'section' ? t('section') : null;
  if (kindLabel) parts.push(<span key="kind" className="truncate">{kindLabel}</span>);

  return (
    <span className="hidden min-w-0 items-center gap-2 truncate text-xs text-muted-foreground sm:flex">
      {parts.map((p, i) => (
        <span key={i} className="contents">
          {i > 0 && <span aria-hidden="true" className="text-muted-foreground/50">•</span>}
          {p}
        </span>
      ))}
    </span>
  );
}

function TreeRow({ node, level, variant, open, onToggle, onSelect, matchIds }: {
  node: OrgNode;
  level: number;
  variant: Variant;
  open?: boolean;
  onToggle?: () => void;
  onSelect: (n: OrgNode) => void;
  matchIds: Set<string> | null;
}) {
  const { t, language } = useHrLanguage();
  const { primary } = names(node, language);
  const isParent = variant !== 'section';
  const showSplit = isParent;
  const hasToggle = !!onToggle;

  const searching = matchIds !== null && variant !== 'root';
  const isMatch = searching && matchIds.has(node.id);
  const { permanent, freelance, total } = node.headcount;

  return (
    <div
      className={cn(
        'relative flex h-12 items-center gap-2 border-b border-border/70 pe-4 transition-colors hover:bg-muted/40',
        isMatch && 'bg-primary/5',
        searching && !isMatch && 'opacity-40',
      )}
      style={{ paddingInlineStart: 12 + level * INDENT }}
    >
      {level >= 1 && <Elbow level={level} />}

      {hasToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!!open}
          aria-label={primary}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none',
              !open && 'ltr:-rotate-90 rtl:rotate-90',
            )}
            aria-hidden="true"
          />
        </button>
      ) : (
        <span className="h-6 w-6 shrink-0" aria-hidden="true" />
      )}

      <KindTile node={node} variant={variant} />

      <button
        type="button"
        onClick={() => onSelect(node)}
        className={cn(
          'max-w-[16rem] truncate rounded-sm text-start text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isParent
            ? 'font-semibold text-primary underline-offset-4 hover:underline'
            : cn('font-medium hover:text-primary', isMatch ? 'text-primary' : 'text-foreground'),
        )}
      >
        {primary}
      </button>

      <Meta node={node} variant={variant} />

      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
          total > 0 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
        title={`${total} ${t('headcount')} · ${t('permanent')} ${permanent} · ${t('freelance')} ${freelance}`}
        aria-label={`${total} ${t('headcount')}`}
      >
        <Users className="h-3 w-3" aria-hidden="true" />
        {total}
      </span>

      {showSplit && (
        <span className="ms-auto hidden items-center gap-3 text-[11px] tabular-nums md:flex">
          <span className="text-muted-foreground">{t('permanent')} {permanent}</span>
          <span className="text-violet-600 dark:text-violet-300">{t('freelance')} {freelance}</span>
        </span>
      )}
    </div>
  );
}

function EmployeeRow({ employee: e, level }: { employee: HrEmployee; level: number }) {
  const { t, language } = useHrLanguage();
  const name = language === 'ar' ? e.fullNameAr : e.fullNameEn;
  const jobTitle = language === 'ar' ? e.jobTitleAr : e.jobTitleEn;

  return (
    <div
      className="relative flex h-12 items-center gap-2 border-b border-border/70 pe-4 transition-colors hover:bg-muted/40"
      style={{ paddingInlineStart: 12 + level * INDENT }}
    >
      <Elbow level={level} />

      <span className="h-6 w-6 shrink-0" aria-hidden="true" />

      <EmployeeAvatar profilePictureUrl={e.profilePictureUrl} gender={e.gender} name={name} size="sm" className="h-7 w-7" />

      <Link
        to={`/hr/employees/${e.contractType.toLowerCase()}/${e.id}`}
        className="max-w-[16rem] truncate rounded-sm text-sm font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {name}
      </Link>

      <span dir="auto" className="hidden min-w-0 max-w-[18rem] truncate text-xs text-muted-foreground sm:flex">
        {jobTitle}
      </span>

      <span
        className={cn(
          'ms-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
          e.contractType === 'Permanent' ? 'bg-success/15 text-success' : 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
        )}
      >
        {e.contractType === 'Permanent' ? t('permanent') : t('freelance')}
      </span>
    </div>
  );
}

// Children sit inside the animated group so the row dividers stay continuous while it opens.
function Group({ open, children }: { open: boolean; children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          role="group"
          initial={reduce ? false : { height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.18, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function OrgOutlineView({ tree, expanded, onToggle, onSelect, matchIds, activeEmployees }: Props) {
  const { t, language } = useHrLanguage();
  const [rootOpen, setRootOpen] = useState(true);
  // Section rows open locally; the chart shares `expanded`, so sections stay out of it.
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set());

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const { bySection, directByDept } = useMemo(() => {
    const unitNodes = [...tree.staffOffices, ...tree.lineDepartments];
    const sectionIdsByDept = new Map<number, Set<number>>();
    for (const unit of unitNodes) {
      if (unit.departmentId === null) continue;
      sectionIdsByDept.set(
        unit.departmentId,
        new Set(unit.children.flatMap((s) => (s.sectionId === null ? [] : [s.sectionId]))),
      );
    }

    const sectionMap = new Map<number, HrEmployee[]>();
    const directMap = new Map<number, HrEmployee[]>();
    const push = (map: Map<number, HrEmployee[]>, key: number, e: HrEmployee) => {
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    };
    for (const e of activeEmployees) {
      // Anyone whose section isn't one of the department's sections is listed directly, so nobody disappears.
      if (e.sectionId !== null && sectionIdsByDept.get(e.departmentId)?.has(e.sectionId)) {
        push(sectionMap, e.sectionId, e);
      } else {
        push(directMap, e.departmentId, e);
      }
    }

    const displayName = (e: HrEmployee) => (language === 'ar' ? e.fullNameAr : e.fullNameEn);
    const byName = (a: HrEmployee, b: HrEmployee) => displayName(a).localeCompare(displayName(b));
    sectionMap.forEach((list) => list.sort(byName));
    directMap.forEach((list) => list.sort(byName));
    return { bySection: sectionMap, directByDept: directMap };
  }, [tree, activeEmployees, language]);

  const level1: { node: OrgNode; variant: Variant }[] = [
    ...tree.staffOffices.map((node) => ({ node, variant: 'unit' as const })),
    ...tree.lineDepartments.map((node) => ({ node, variant: 'department' as const })),
  ];

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex h-10 items-center justify-between border-b bg-muted/40 px-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>{t('orgStructure')}</span>
        <span>{t('headcount')}</span>
      </div>

      {/* Every row draws its own bottom divider (each sits alone in its treeitem
          wrapper, so :last-child can't find the final one); -mb-px tucks the
          last divider under the container's border instead of doubling it. */}
      <div role="tree" aria-label={t('orgStructure')} className="-mb-px">
        <div role="treeitem" aria-level={1} aria-expanded={rootOpen}>
          <TreeRow
            node={tree.root}
            level={0}
            variant="root"
            open={rootOpen}
            onToggle={() => setRootOpen((v) => !v)}
            onSelect={onSelect}
            matchIds={matchIds}
          />
          <Group open={rootOpen}>
            {level1.map(({ node, variant }) => {
              const directEmployees = (node.departmentId !== null && directByDept.get(node.departmentId)) || [];
              const hasChildren = node.children.length > 0 || directEmployees.length > 0;
              const isOpen = expanded.has(node.id);
              return (
                <div
                  key={node.id}
                  role="treeitem"
                  aria-level={2}
                  aria-expanded={hasChildren ? isOpen : undefined}
                >
                  <TreeRow
                    node={node}
                    level={1}
                    variant={variant}
                    open={isOpen}
                    onToggle={hasChildren ? () => onToggle(node.id) : undefined}
                    onSelect={onSelect}
                    matchIds={matchIds}
                  />
                  {hasChildren && (
                    <Group open={isOpen}>
                      {node.children.map((section) => {
                        const sectionEmployees = (section.sectionId !== null && bySection.get(section.sectionId)) || [];
                        const hasEmployees = sectionEmployees.length > 0;
                        const sectionOpen = openSections.has(section.id);
                        return (
                          <div
                            key={section.id}
                            role="treeitem"
                            aria-level={3}
                            aria-expanded={hasEmployees ? sectionOpen : undefined}
                          >
                            <TreeRow
                              node={section}
                              level={2}
                              variant="section"
                              open={sectionOpen}
                              onToggle={hasEmployees ? () => toggleSection(section.id) : undefined}
                              onSelect={onSelect}
                              matchIds={matchIds}
                            />
                            {hasEmployees && (
                              <Group open={sectionOpen}>
                                {sectionEmployees.map((e) => (
                                  <div key={e.id} role="treeitem" aria-level={4}>
                                    <EmployeeRow employee={e} level={3} />
                                  </div>
                                ))}
                              </Group>
                            )}
                          </div>
                        );
                      })}
                      {directEmployees.map((e) => (
                        <div key={e.id} role="treeitem" aria-level={3}>
                          <EmployeeRow employee={e} level={2} />
                        </div>
                      ))}
                    </Group>
                  )}
                </div>
              );
            })}
          </Group>
        </div>
      </div>
    </div>
  );
}
