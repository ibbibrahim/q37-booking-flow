import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Layers, Users, Clock, CheckCircle2, ChevronRight, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { useAuth } from '@/contexts/AuthContext';
import { StartContractRenewalModal } from '../components/StartContractRenewalModal';
import { StatTile } from '../components/StatTile';
import { hrApi } from '../api/hrApi';
import { useHrLanguage } from '../context/HrLanguageContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { formatDate } from '../utils/hrUtils';
import type { HrContractBatch } from '../types/hrApi';

const STORAGE_KEY = 'hr-contract-renewal';

/** A renewal's at-a-glance stage, derived purely from its signed/total
 * counts — not a stored field, just a friendlier read on the same numbers
 * the progress bar already shows. */
function renewalStage(signed: number, total: number): { label: string; badgeClass: string } {
  if (total > 0 && signed === total) return { label: 'Completed', badgeClass: 'border-transparent bg-success/15 text-success' };
  if (signed === 0) return { label: 'Awaiting signatures', badgeClass: 'border-transparent bg-warning/15 text-warning' };
  return { label: 'In progress', badgeClass: 'border-transparent bg-info/15 text-info' };
}

/** A clean horizontal bar + fraction — how many of a renewal's contracts
 * have reached Completed out of its total member count. Turns success-green
 * once every member is fully signed. */
function SignedProgress({ signed, total }: { signed: number; total: number }) {
  const pct = total > 0 ? Math.round((signed / total) * 100) : 0;
  const done = total > 0 && signed === total;
  return (
    <div className="flex items-center gap-2.5 min-w-[160px]">
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? 'bg-success' : 'bg-primary'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {signed}/{total}
      </span>
    </div>
  );
}

function sumStatusCounts(renewals: HrContractBatch[], statuses: string[]): number {
  return renewals.reduce(
    (sum, r) => sum + statuses.reduce((s, status) => s + (r.statusCounts[status as keyof typeof r.statusCounts] ?? 0), 0),
    0
  );
}

/** Contract Renewal — one list, one shape: every "Start Contract Renewal"
 * submission as its own row. Clicking into one shows its member employees
 * and the familiar per-contract actions (edit/view/sign/status/...). Only
 * HRAdmin can start a new renewal; everyone with read access can see
 * renewals relevant to them (a Department Coordinator's view is scoped
 * server-side to their own department). */
export function ContractRenewalPage() {
  const { t } = useHrLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [startRenewalOpen, setStartRenewalOpen] = useState(false);
  const [page, setPage] = useState(() => getInitialPage(STORAGE_KEY, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(STORAGE_KEY, 10));

  const isHRAdmin = user?.roles?.includes('HRAdmin') ?? false;

  const renewalsQuery = useQuery({
    queryKey: ['hr-contract-batches'],
    queryFn: hrApi.getContractBatches,
  });

  const renewals = useMemo(() => renewalsQuery.data ?? [], [renewalsQuery.data]);
  const pagedRenewals = useMemo(
    () => renewals.slice((page - 1) * pageSize, page * pageSize),
    [renewals, page, pageSize]
  );

  const handlePageSizeChange = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  const totalEmployees = useMemo(() => renewals.reduce((sum, r) => sum + r.employeeCount, 0), [renewals]);
  const inProgress = useMemo(
    () => sumStatusCounts(renewals, ['AwaitingEmployeeSignature', 'AwaitingDepartmentHeadSignature', 'AwaitingFinalSignature']),
    [renewals]
  );
  const completed = useMemo(() => sumStatusCounts(renewals, ['Completed']), [renewals]);

  usePageHeader(t('contractRenewal'), t('contractRenewalSubtitle'));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {isHRAdmin && (
          <div className="flex justify-end">
            <Button onClick={() => setStartRenewalOpen(true)}>
              <Plus size={16} className="mr-1" /> Start Contract Renewal
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile label="Renewals" value={renewals.length} icon={Layers} />
          <StatTile label="Employees" value={totalEmployees} icon={Users} accentClassName="bg-info/15 text-info" />
          <StatTile label="In Progress" value={inProgress} icon={Clock} accentClassName="bg-warning/15 text-warning" />
          <StatTile label="Fully Signed" value={completed} icon={CheckCircle2} accentClassName="bg-success/15 text-success" />
        </div>

        <ListPaginationBar
          currentPage={page}
          totalItems={renewals.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          storageKey={STORAGE_KEY}
          disabled={renewalsQuery.isLoading}
        />

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="bg-muted/40 text-[11px] uppercase tracking-wide">Renewal</TableHead>
                  <TableHead className="bg-muted/40 text-[11px] uppercase tracking-wide">Period</TableHead>
                  <TableHead className="bg-muted/40 text-[11px] uppercase tracking-wide">People</TableHead>
                  <TableHead className="bg-muted/40 text-[11px] uppercase tracking-wide">Stage</TableHead>
                  <TableHead className="bg-muted/40 text-[11px] uppercase tracking-wide">Signed</TableHead>
                  <TableHead className="bg-muted/40 w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewalsQuery.isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {renewalsQuery.isError && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-destructive py-10">
                      Failed to load renewals.
                    </TableCell>
                  </TableRow>
                )}
                {!renewalsQuery.isLoading && !renewalsQuery.isError && renewals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                      <div className="mx-auto h-11 w-11 rounded-full bg-muted flex items-center justify-center mb-3">
                        <Layers size={20} className="text-muted-foreground/60" />
                      </div>
                      <p className="font-medium text-foreground">No contract renewals yet</p>
                      <p className="text-sm mt-0.5">
                        {isHRAdmin ? 'Use "Start Contract Renewal" to begin one.' : 'Nothing to show yet.'}
                      </p>
                    </TableCell>
                  </TableRow>
                )}
                {pagedRenewals.map((renewal) => {
                  const signed = renewal.statusCounts.Completed ?? 0;
                  const stage = renewalStage(signed, renewal.employeeCount);
                  return (
                    <TableRow
                      key={renewal.id}
                      className="cursor-pointer group"
                      onClick={() => navigate(`/hr/freelance-hiring/contract-renewal/renewals/${renewal.id}`)}
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <FileSignature size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{renewal.label}</p>
                            <p className="text-[11px] text-muted-foreground">Created {formatDate(renewal.createdAt)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(renewal.startDate)} – {formatDate(renewal.endDate)}
                      </TableCell>
                      <TableCell className="tabular-nums">{renewal.employeeCount}</TableCell>
                      <TableCell>
                        <Badge className={stage.badgeClass}>{stage.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <SignedProgress signed={signed} total={renewal.employeeCount} />
                      </TableCell>
                      <TableCell>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {isHRAdmin && (
          <StartContractRenewalModal
            open={startRenewalOpen}
            onClose={() => setStartRenewalOpen(false)}
            onCompleted={() => queryClient.invalidateQueries({ queryKey: ['hr-contract-batches'] })}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
