import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronsDownUp, ChevronsUpDown, ListTree, Network, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { hrApi } from '../api/hrApi';
import { useHrLanguage } from '../context/HrLanguageContext';
import { OrgChartCanvas } from '../components/org-chart/OrgChartCanvas';
import { OrgOutlineView } from '../components/org-chart/OrgOutlineView';
import { OrgUnitDrawer } from '../components/org-chart/OrgUnitDrawer';
import { buildOrgTree, nodeMatches, type OrgNode } from '../components/org-chart/orgTree';

type View = 'chart' | 'outline';

export function OrganizationStructurePage() {
  const { t } = useHrLanguage();
  usePageHeader(t('orgStructure'), t('orgStructureSubtitle'));

  // Same query keys as HRDashboardPage so the cache is shared between the two.
  const departmentsQuery = useQuery({
    queryKey: ['hr-departments'],
    queryFn: hrApi.getDepartments,
    staleTime: 5 * 60 * 1000,
  });
  const employeesQuery = useQuery({
    queryKey: ['hr-employees-dashboard'],
    queryFn: () => hrApi.searchEmployees({ page: 1, pageSize: 2000 }),
  });
  // Heads are cosmetic here, so a failure just renders "no head assigned".
  const headsQuery = useQuery({
    queryKey: ['hr-department-heads'],
    queryFn: hrApi.getDepartmentHeads,
    staleTime: 5 * 60 * 1000,
  });

  const departments = departmentsQuery.data;
  const employees = employeesQuery.data?.items;
  const heads = headsQuery.data;

  const activeEmployees = useMemo(() => (employees ?? []).filter((e) => e.status === 'Active'), [employees]);
  const tree = useMemo(
    () => buildOrgTree(departments ?? [], activeEmployees, heads ?? []),
    [departments, activeEmployees, heads],
  );
  const allDepartments = useMemo(() => [...tree.staffOffices, ...tree.lineDepartments], [tree]);

  const [expandedState, setExpanded] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<OrgNode | null>(null);
  const [view, setView] = useState<View>(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? 'outline' : 'chart',
  );

  // null = untouched, which means "everything expanded" even once data loads late.
  const baseExpanded = useMemo(
    () => expandedState ?? new Set(allDepartments.map((d) => d.id)),
    [expandedState, allDepartments],
  );

  const trimmed = query.trim();
  // matchIds: null = no active search. A department also counts as a hit when one of its sections matches.
  const matchIds = useMemo(() => {
    if (!trimmed) return null;
    const ids = new Set<string>();
    for (const dept of allDepartments) {
      const selfHit = nodeMatches(dept, trimmed);
      const childHits = dept.children.filter((c) => nodeMatches(c, trimmed));
      if (selfHit || childHits.length > 0) ids.add(dept.id);
      childHits.forEach((c) => ids.add(c.id));
    }
    return ids;
  }, [trimmed, allDepartments]);

  const expanded = useMemo(() => {
    if (!matchIds) return baseExpanded;
    const next = new Set(baseExpanded);
    for (const dept of allDepartments) {
      if (dept.children.some((c) => matchIds.has(c.id)) || matchIds.has(dept.id)) next.add(dept.id);
    }
    return next;
  }, [baseExpanded, matchIds, allDepartments]);

  const toggle = useCallback(
    (id: string) => {
      setExpanded(() => {
        const next = new Set(baseExpanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [baseExpanded],
  );

  if (departmentsQuery.isLoading || employeesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (departmentsQuery.isError || employeesQuery.isError) {
    return <div className="text-center py-16 text-muted-foreground">{t('errorLoading')}</div>;
  }

  const sectionCount = allDepartments.reduce((sum, d) => sum + d.children.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchUnits')}
            aria-label={t('searchUnits')}
            className="ps-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set(allDepartments.map((d) => d.id)))}>
          <ChevronsUpDown className="me-1.5 h-4 w-4" />
          {t('expandAll')}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExpanded(new Set())}>
          <ChevronsDownUp className="me-1.5 h-4 w-4" />
          {t('collapseAll')}
        </Button>
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="chart" className="gap-1.5">
              <Network className="h-4 w-4" />
              {t('chartView')}
            </TabsTrigger>
            <TabsTrigger value="outline" className="gap-1.5">
              <ListTree className="h-4 w-4" />
              {t('outlineView')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="ms-auto text-sm tabular-nums text-muted-foreground">
          {allDepartments.length} {t('departmentsCount')} · {sectionCount} {t('sectionsCount')} · {tree.root.headcount.total} {t('headcount')}
        </p>
      </div>

      {view === 'chart' ? (
        <OrgChartCanvas
          tree={tree}
          expanded={expanded}
          onToggle={toggle}
          onSelect={setSelected}
          matchIds={matchIds}
          escapeSuspended={selected !== null}
        />
      ) : (
        <OrgOutlineView tree={tree} expanded={expanded} onToggle={toggle} onSelect={setSelected} matchIds={matchIds} />
      )}

      <OrgUnitDrawer
        node={selected}
        tree={tree}
        activeEmployees={activeEmployees}
        onClose={() => setSelected(null)}
        onSelect={setSelected}
      />
    </div>
  );
}
