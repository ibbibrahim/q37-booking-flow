import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  Briefcase, Building2, Calendar, CheckCircle2, ChevronRight, Clock, ClipboardList, Copy,
  FileSignature, FileText, Landmark, Link as LinkIcon, Loader2, PenTool, Phone, Plus, Save, ScanLine, Search as SearchIcon, Tag,
  ShieldCheck, Upload, UserX, Users, UserCheck, X, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { cn } from '@/lib/utils';
import { StatTile } from '../components/StatTile';
import { useToast } from '@/contexts/ToastContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { freelanceProfileReviewApi, freelanceProfilePublicApi } from '../api/freelanceProfileApi';
import { SignaturePad } from '../components/SignaturePad';
import { stampEmployeeStartSignature } from '../utils/hiringFormsPdf';
import { formatDate } from '../utils/hrUtils';
import {
  HIRING_REQUEST_STATUS_LABELS,
  type HiringRequestDetail, type HiringRequestStatus, type InterviewRecommendation,
} from '../types/hiringRequest';

const STAGE_ORDER: HiringRequestStatus[] = [
  'Requested', 'LinkGenerated', 'ProfileSubmitted', 'InterviewSubmitted',
  'AwaitingCeoApproval', 'CeoApproved', 'StartingDateSet', 'Converted',
];

const STAGE_LABELS: Partial<Record<HiringRequestStatus, string>> = {
  Requested: 'Requested',
  LinkGenerated: 'Link Generated',
  ProfileSubmitted: 'Profile In',
  InterviewSubmitted: 'Interviewed',
  AwaitingCeoApproval: 'GM Approved',
  CeoApproved: 'CEO Approved',
  StartingDateSet: 'Starting Date',
  Converted: 'Hired',
};

function initials(name: string | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

/** Horizontal progress stepper across the main hiring stages — not shown
 * for the two terminal error paths (Rejected / NotStarted), which get a
 * plain status banner instead. */
function StatusStepper({ status }: { status: HiringRequestStatus }) {
  // The stage matching `status` is itself already complete (its label names
  // an action that already happened to reach this status), so every stage up
  // to and including it gets a green check. The blue/ring "current" marker
  // moves one stage ahead, onto whatever's next pending — not onto the
  // stage that's already done.
  const doneIndex = STAGE_ORDER.indexOf(status);
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STAGE_ORDER.map((stage, i) => {
        const isDone = doneIndex >= 0 && i <= doneIndex;
        const isCurrent = i === doneIndex + 1;
        return (
          <div key={stage} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1 w-[84px]">
              <div
                className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  isDone ? 'bg-success text-success-foreground'
                  : isCurrent ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
                  : 'bg-muted text-muted-foreground'
                }`}
              >
                {isDone ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span className={`text-[10px] text-center leading-tight ${isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {i < STAGE_ORDER.length - 1 && (
              <div className={`h-0.5 w-6 -mt-4 shrink-0 ${isDone ? 'bg-success' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// A deliberate color scale instead of one catch-all tone: gray = not
// started, blue = in motion, amber = waiting on someone outside HR,
// indigo = internally cleared / onboarding, green = done, red = stopped.
const STATUS_BADGE: Record<HiringRequestStatus, string> = {
  Requested: 'border-transparent bg-muted text-muted-foreground',
  LinkGenerated: 'border-transparent bg-info/15 text-info',
  ProfileSubmitted: 'border-transparent bg-info/15 text-info',
  InterviewSubmitted: 'border-transparent bg-info/15 text-info',
  AwaitingGmApproval: 'border-transparent bg-warning/15 text-warning',
  Rejected: 'border-transparent bg-destructive/15 text-destructive',
  AwaitingCeoApproval: 'border-transparent bg-warning/15 text-warning',
  CeoApproved: 'border-transparent bg-primary/15 text-primary',
  StartingDateSet: 'border-transparent bg-primary/15 text-primary',
  Converted: 'border-transparent bg-success/15 text-success',
  NotStarted: 'border-transparent bg-destructive/15 text-destructive',
};

type StageBucket = 'Active' | 'AwaitingApproval' | 'Converted' | 'Stopped';

const BUCKET_LABELS: Record<StageBucket, string> = {
  Active: 'Active',
  AwaitingApproval: 'Awaiting Approval',
  Converted: 'Converted',
  Stopped: 'Rejected / Did Not Start',
};

function bucketOf(status: HiringRequestStatus): StageBucket {
  if (status === 'Converted') return 'Converted';
  if (status === 'Rejected' || status === 'NotStarted') return 'Stopped';
  if (status === 'AwaitingCeoApproval' || status === 'AwaitingGmApproval') return 'AwaitingApproval';
  return 'Active';
}

const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  RecommendForHire: 'Recommend For Hire',
  PracticalTest: 'Practical Test',
  NotAMatch: 'Not A Match',
  DecisionNotYetMade: 'Decision Not Yet Made',
};

const HIRING_EVENT_LABELS: Record<string, string> = {
  Requested: 'Request created',
  LinkGenerated: 'Candidate link generated',
  ProfileSubmitted: 'Candidate profile submitted',
  InterviewSubmitted: 'Interview evaluation submitted',
  InterviewManagerReviewed: 'Department Head reviewed interview evaluation',
  ForwardedToGm: 'Forwarded to GM',
  GmApproved: 'GM approval recorded',
  GmRejected: 'GM rejection recorded',
  CeoApprovalRecorded: 'QMC CEO approval recorded',
  StartingDateSet: 'Starting date set',
  StartingDateDocumentsSaved: 'Candidate documents saved',
  EmployeeStartSigned: 'Candidate signed — confirmed started',
  NotStartingReported: 'Coordinator reported candidate did not start',
  ManagerStartSigned: 'Department Head signed starting date confirmation',
  Converted: 'Converted to employee',
  NotStarted: 'Recorded as did not start',
};

/** The New Freelancer/Candidate Hiring workflow — distinct from Contract
 * Renewal. One list, role-scoped by the backend (Department Heads only see
 * their own department's requests); the detail panel exposes only the
 * action(s) relevant to the request's current stage and the viewer's role. */
export function HiringRequestsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isHRAdmin = user?.roles?.includes('HRAdmin') ?? false;
  const isDepartmentCoordinator = user?.roles?.includes('DepartmentCoordinator') ?? false;

  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(() => {
    const open = searchParams.get('open');
    return open ? Number(open) : null;
  });
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StageBucket | 'all'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const paginationStorageKey = 'hr-hiring-requests';
  const [page, setPage] = useState(() => getInitialPage(paginationStorageKey, 1));
  const [pageSize, setPageSize] = useState(() => getInitialPageSize(paginationStorageKey, 10));
  const handlePageSizeChange = (n: number) => { setPageSize(n); setPage(1); };

  // Deep links (from email notifications) land here as ?open=<id> — open the
  // detail panel automatically, then drop the query param so it doesn't
  // reopen on every refresh.
  useEffect(() => {
    const open = searchParams.get('open');
    if (open) {
      setDetailId(Number(open));
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('open');
        return next;
      }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const listQuery = useQuery({ queryKey: ['hr-hiring-requests'], queryFn: hiringRequestApi.getAll });
  const detailQuery = useQuery({
    queryKey: ['hr-hiring-request', detailId],
    queryFn: () => hiringRequestApi.getById(detailId as number),
    enabled: detailId !== null,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-hiring-requests'] });
    if (detailId !== null) queryClient.invalidateQueries({ queryKey: ['hr-hiring-request', detailId] });
  };

  // Real-time: every hiring request change (any stage, by anyone) is
  // broadcast company-wide to the HR role groups — just refetch rather than
  // trying to merge the partial payload into two different query shapes.
  const { listen } = useSignalR();
  useEffect(() => listen('HiringRequestChanged', refresh), [listen]);

  useEffect(() => { setPage(1); }, [search, statusFilter, departmentFilter]);

  const requests = listQuery.data ?? [];
  const detail = detailQuery.data;

  const counts: Record<StageBucket, number> = { Active: 0, AwaitingApproval: 0, Converted: 0, Stopped: 0 };
  for (const r of requests) counts[bucketOf(r.status)]++;

  const departments = Array.from(
    new Map(requests.map((r) => [r.departmentId, r.departmentNameEn ?? String(r.departmentId)])).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const q = search.trim().toLowerCase();
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && bucketOf(r.status) !== statusFilter) return false;
    if (departmentFilter !== 'all' && String(r.departmentId) !== departmentFilter) return false;
    if (
      q &&
      !r.candidateName.toLowerCase().includes(q) &&
      !r.positionTitle.toLowerCase().includes(q) &&
      !r.applicationRef?.toLowerCase().includes(q)
    ) return false;
    return true;
  });

  const hasActiveFilters = !!search.trim() || statusFilter !== 'all' || departmentFilter !== 'all';
  const clearAllFilters = () => { setSearch(''); setStatusFilter('all'); setDepartmentFilter('all'); };
  const selectedDepartmentLabel = departments.find(([id]) => String(id) === departmentFilter)?.[1];

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedRequests = filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize);

  usePageHeader('New Freelancer Hiring', 'Track freelancer hiring from first contact through onboarding.');

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3">
        {(isHRAdmin || isDepartmentCoordinator) && (
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Request Candidate Link
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <StatTile label="All" value={requests.length} icon={Users} />
        <StatTile label={BUCKET_LABELS.Active} value={counts.Active} icon={ClipboardList} accentClassName="bg-info/15 text-info" />
        <StatTile label={BUCKET_LABELS.AwaitingApproval} value={counts.AwaitingApproval} icon={Clock} accentClassName="bg-warning/15 text-warning" />
        <StatTile label={BUCKET_LABELS.Converted} value={counts.Converted} icon={UserCheck} accentClassName="bg-success/15 text-success" />
        <StatTile label={BUCKET_LABELS.Stopped} value={counts.Stopped} icon={XCircle} accentClassName="bg-destructive/15 text-destructive" />
      </div>

      <ListFilterBar
        activeFiltersRow={
          hasActiveFilters ? (
            <FilterActiveFiltersRow onClearAll={clearAllFilters}>
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Tag size={12} />
                  {BUCKET_LABELS[statusFilter]}
                  <button type="button" onClick={() => setStatusFilter('all')} className="ml-1 hover:bg-muted-foreground/20 rounded-full" aria-label="Remove status filter">
                    <X size={12} />
                  </button>
                </Badge>
              )}
              {departmentFilter !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  <Building2 size={12} />
                  {selectedDepartmentLabel ?? departmentFilter}
                  <button type="button" onClick={() => setDepartmentFilter('all')} className="ml-1 hover:bg-muted-foreground/20 rounded-full" aria-label="Remove department filter">
                    <X size={12} />
                  </button>
                </Badge>
              )}
              {search.trim() && (
                <Badge variant="secondary" className="gap-1">
                  <SearchIcon size={12} />
                  &quot;{search}&quot;
                  <button type="button" onClick={() => setSearch('')} className="ml-1 hover:bg-muted-foreground/20 rounded-full" aria-label="Remove search">
                    <X size={12} />
                  </button>
                </Badge>
              )}
            </FilterActiveFiltersRow>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search candidate or position…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(([id, name]) => <SelectItem key={id} value={String(id)}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StageBucket | 'all')}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {(Object.keys(BUCKET_LABELS) as StageBucket[]).map((bucket) => (
                <SelectItem key={bucket} value={bucket}>{BUCKET_LABELS[bucket]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ListFilterBar>

      <ListPaginationBar
        currentPage={safePage}
        totalItems={filteredRequests.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        storageKey={paginationStorageKey}
        disabled={listQuery.isLoading}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              )}
              {!listQuery.isLoading && filteredRequests.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  {requests.length === 0 ? 'No hiring requests yet.' : 'No requests match your search or filter.'}
                </TableCell></TableRow>
              )}
              {pagedRequests.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => setDetailId(r.id)}
                >
                  <TableCell className="font-medium text-foreground">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials(r.candidateName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate">{r.candidateName}</p>
                        {r.applicationRef && <p className="text-[11px] font-normal text-muted-foreground tabular-nums">{r.applicationRef}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground">{r.positionTitle}</p>
                    <p className="text-xs text-muted-foreground">{r.departmentNameEn ?? '—'}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.requestedAt)}</TableCell>
                  <TableCell><Badge className={STATUS_BADGE[r.status]}>{HIRING_REQUEST_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell><ChevronRight size={16} className="text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {createOpen && (
        <CreateRequestModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); refresh(); }}
        />
      )}

      {detailId !== null && (
        <DetailModal
          detail={detail}
          loading={detailQuery.isLoading}
          isHRAdmin={isHRAdmin}
          isDepartmentCoordinator={isDepartmentCoordinator}
          busy={busy}
          setBusy={setBusy}
          onClose={() => setDetailId(null)}
          onChanged={refresh}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function CreateRequestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const isHRAdmin = user?.roles?.includes('HRAdmin') ?? false;

  const departmentsQuery = useQuery({ queryKey: ['hr-departments'], queryFn: hrApi.getDepartments });
  const myCoordinatorDeptsQuery = useQuery({
    queryKey: ['hr-department-coordinator-me'],
    queryFn: hrApi.getMyDepartmentCoordinatorIds,
    enabled: !isHRAdmin,
  });

  const [departmentId, setDepartmentId] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [saving, setSaving] = useState(false);

  // HRAdmin picks any department. A Coordinator with exactly one department
  // has it fixed automatically; with more than one, they pick among just
  // their own (not the full company list).
  const myDeptIds = myCoordinatorDeptsQuery.data ?? [];
  const fixedDepartmentId = !isHRAdmin && myDeptIds.length === 1 ? myDeptIds[0] : undefined;
  const effectiveDepartmentId = fixedDepartmentId ? String(fixedDepartmentId) : departmentId;
  const myDepartmentOptions = (departmentsQuery.data ?? []).filter((d) => myDeptIds.includes(d.id));

  const handleSubmit = async () => {
    if (!effectiveDepartmentId || !positionTitle.trim() || !candidateName.trim()) {
      showToast('Department, position title, and candidate name are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await hiringRequestApi.create({
        departmentId: Number(effectiveDepartmentId),
        positionTitle: positionTitle.trim(),
        candidateName: candidateName.trim(),
        candidateEmail: candidateEmail.trim() || undefined,
      });
      showToast('Hiring request created. HR will generate the candidate link next.', 'success');
      onCreated();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to create hiring request.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Request a Candidate Link" onClose={onClose}>
      <div className="space-y-3">
        {isHRAdmin ? (
          <div>
            <Label className="mb-1.5 block">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {(departmentsQuery.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : myDeptIds.length > 1 ? (
          <div>
            <Label className="mb-1.5 block">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
              <SelectContent>
                {myDepartmentOptions.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.nameEn}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Requesting on behalf of your department.</p>
        )}
        <div>
          <Label className="mb-1.5 block">Position Title</Label>
          <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="e.g. Camera Operator" />
        </div>
        <div>
          <Label className="mb-1.5 block">Candidate Name</Label>
          <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block">Candidate Email (optional)</Label>
          <Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} />
        </div>
        <Button className="w-full gap-1.5" disabled={saving} onClick={handleSubmit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus size={14} />} Submit Request
        </Button>
      </div>
    </Modal>
  );
}

interface DetailModalProps {
  detail: ReturnType<typeof useQuery>['data'];
  loading: boolean;
  isHRAdmin: boolean;
  isDepartmentCoordinator: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: () => void;
  onChanged: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

function DetailModal({ detail, loading, isHRAdmin, isDepartmentCoordinator, busy, setBusy, onClose, onChanged, showToast }: any) {
  const navigate = useNavigate();
  const [ceoOpen, setCeoOpen] = useState(false);
  const [gmApproveOpen, setGmApproveOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notStartedReason, setNotStartedReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notStartedOpen, setNotStartedOpen] = useState(false);
  const [employeeSignOpen, setEmployeeSignOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    icon?: LucideIcon;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);
  // Shown once after a successful Convert — the hiring flow ends here; this
  // replaces the "Candidate Converted to Employee" / "Next Step: Start the
  // Contract" emails that used to fire at this point (removed on request),
  // so the handoff to Contract → New is still communicated, just in-app.
  const [convertedInfo, setConvertedInfo] = useState<{ candidateName: string } | null>(null);

  const run = async (fn: () => Promise<any>, successMsg: string, failMsg: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(successMsg, 'success');
      onChanged();
    } catch (err) {
      showToast(getApiErrorMessage(err, failMsg), 'error');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = () => {
    if (!detail?.linkToken) return;
    const url = `${window.location.origin}/freelance-profile/${detail.linkToken}`;
    navigator.clipboard.writeText(url);
    showToast('Link copied — forward it to the candidate.', 'success');
  };

  const isTerminalError = detail?.status === 'Rejected' || detail?.status === 'NotStarted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-11 w-11 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials(detail?.candidateName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground truncate">{detail ? detail.candidateName : 'Loading…'}</h3>
              {detail && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {detail.applicationRef && (
                    <>
                      <span className="font-medium text-foreground tabular-nums">{detail.applicationRef}</span>
                      <span className="text-border">&middot;</span>
                    </>
                  )}
                  <Briefcase size={11} /> {detail.positionTitle}
                  <span className="text-border">&middot;</span>
                  {detail.departmentNameEn}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {detail && <Badge className={STATUS_BADGE[detail.status as HiringRequestStatus]}>{HIRING_REQUEST_STATUS_LABELS[detail.status as HiringRequestStatus]}</Badge>}
            <Button variant="outline" size="icon" onClick={onClose}><XCircle size={16} /></Button>
          </div>
        </div>

        {loading || !detail ? (
          <p className="text-muted-foreground text-sm p-5">Loading…</p>
        ) : (
          <>
            {/* Stepper / terminal banner */}
            <div className="px-5 pt-4 shrink-0">
              {isTerminalError ? (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive flex items-center gap-1.5">
                  <XCircle size={13} />
                  {detail.status === 'Rejected' ? 'This hiring request was rejected.' : 'The candidate did not start.'}
                </div>
              ) : (
                <StatusStepper status={detail.status as HiringRequestStatus} />
              )}
            </div>

            <Tabs defaultValue="overview" className="flex-1 min-h-0 flex flex-col">
              <div className="px-5 pt-3 shrink-0">
                <TabsList>
                  <TabsTrigger value="overview" className="gap-1.5"><ClipboardList size={13} /> Overview</TabsTrigger>
                  <TabsTrigger value="profile" className="gap-1.5"><FileText size={13} /> Profile &amp; Documents</TabsTrigger>
                  <TabsTrigger value="interview" className="gap-1.5"><CheckCircle2 size={13} /> Interview</TabsTrigger>
                  <TabsTrigger value="starting-date" className="gap-1.5"><Calendar size={13} /> Starting Date</TabsTrigger>
                  <TabsTrigger value="history" className="gap-1.5"><Clock size={13} /> History</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-5 pt-3">
                <TabsContent value="overview" className="mt-0 space-y-4 text-sm pb-1">
                  <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg border border-border p-3.5">
                    <p className="flex items-center gap-1.5"><Briefcase size={13} className="text-muted-foreground" /> <span className="text-muted-foreground">Position:</span> {detail.positionTitle}</p>
                    <p className="flex items-center gap-1.5"><Users size={13} className="text-muted-foreground" /> <span className="text-muted-foreground">Department:</span> {detail.departmentNameEn}</p>
                    <p className="flex items-center gap-1.5"><Calendar size={13} className="text-muted-foreground" /> <span className="text-muted-foreground">Requested:</span> {formatDate(detail.requestedAt)}</p>
                    {detail.contractStatus && (
                      <p className="flex items-center gap-1.5"><FileText size={13} className="text-muted-foreground" /> <span className="text-muted-foreground">Contract:</span> {detail.contractStatus}</p>
                    )}
                  </div>

          {/* Requested -> generate link (HR) */}
          {detail.status === 'Requested' && isHRAdmin && (
            <ActionBlock title="Generate the candidate link">
              <Button
                className="gap-1.5" disabled={busy}
                onClick={() => setConfirmAction({
                  title: 'Generate candidate link?',
                  description: 'A 30-day link will be created for this candidate to submit their profile. You can copy and forward it to them afterward.',
                  confirmLabel: 'Generate Link',
                  icon: LinkIcon,
                  onConfirm: () => run(() => hiringRequestApi.generateLink(detail.id), 'Link generated.', 'Failed to generate link.'),
                })}
              >
                <LinkIcon size={14} /> Generate Link
              </Button>
            </ActionBlock>
          )}

          {/* LinkGenerated -> show link to copy/forward, or regenerate if lost/expired */}
          {detail.linkToken && !detail.freelanceProfileSubmissionId && (
            <ActionBlock title="Candidate link — forward this to the candidate">
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/freelance-profile/${detail.linkToken}`} className="text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink}><Copy size={14} /></Button>
              </div>
              {detail.linkExpiresAt && <p className="text-xs text-muted-foreground mt-1">Expires {formatDate(detail.linkExpiresAt)}</p>}
              {isHRAdmin && (
                <Button
                  size="sm" variant="ghost" className="gap-1.5 mt-1.5 text-muted-foreground"
                  disabled={busy}
                  onClick={() => setConfirmAction({
                    title: 'Regenerate the candidate link?',
                    description: 'The current link will stop working. If you already sent it to the candidate, you’ll need to forward the new one.',
                    confirmLabel: 'Regenerate Link',
                    icon: LinkIcon,
                    destructive: true,
                    onConfirm: () => run(() => hiringRequestApi.generateLink(detail.id), 'Link regenerated.', 'Failed to regenerate link.'),
                  })}
                >
                  <LinkIcon size={12} /> Regenerate Link
                </Button>
              )}
            </ActionBlock>
          )}

          {/* ProfileSubmitted -> see Profile & Documents tab, then open interview form */}
          {detail.status === 'ProfileSubmitted' && (
            <ActionBlock title="Candidate profile submitted">
              <p className="text-xs text-muted-foreground mb-2">See the "Profile &amp; Documents" tab above for everything the candidate submitted.</p>
              <Button size="sm" className="gap-1.5" onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${detail.id}/interview`)}>
                <ClipboardList size={14} /> Record Interview Evaluation
              </Button>
            </ActionBlock>
          )}

          {/* InterviewSubmitted -> HR records the GM's decision directly
              (the GM's approval happens outside the system, same shallow
              logging as CEO approval — no separate "forward" step). Gated
              on the Department Head's review/sign-off below, same pattern
              as the Starting Date signature chain's manager-signs gate. */}
          {detail.status === 'InterviewSubmitted' && isHRAdmin && (
            <ActionBlock title="Record the GM's hiring decision">
              {detail.interviewRecommendation && (
                <p className="text-xs text-muted-foreground mb-1">
                  Interviewer recommendation: <span className="font-medium text-foreground">{RECOMMENDATION_LABELS[detail.interviewRecommendation as InterviewRecommendation]}</span>
                  {detail.interviewFinalValuePercent != null && ` · ${detail.interviewFinalValuePercent}%`}
                </p>
              )}
              {detail.interviewPdfUrl && <a href={detail.interviewPdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View interview evaluation PDF</a>}

              {detail.managerReviewedAt ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Department Head reviewed{detail.managerReviewedByName ? ` by ${detail.managerReviewedByName}` : ''} on {formatDate(detail.managerReviewedAt)}.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1 gap-1.5" disabled={busy} onClick={() => setRejectOpen(true)}>
                      <XCircle size={14} /> Reject
                    </Button>
                    <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => setGmApproveOpen(true)}>
                      <CheckCircle2 size={14} /> Approve
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning flex items-center gap-1.5">
                  <Clock size={13} />
                  Awaiting Department Head review and sign-off before the GM decision can be recorded.
                </div>
              )}
            </ActionBlock>
          )}
          {detail.status === 'Rejected' && (
            <ActionBlock title="Rejected">
              <p className="text-xs text-muted-foreground">{detail.gmRejectReason}</p>
            </ActionBlock>
          )}

          {/* AwaitingCeoApproval -> HR records date/time (external approval) */}
          {detail.status === 'AwaitingCeoApproval' && isHRAdmin && (
            <ActionBlock title="Record the QMC CEO's approval (happens outside the system)">
              <Button className="gap-1.5" disabled={busy} onClick={() => setCeoOpen(true)}>
                <ShieldCheck size={14} /> Record CEO Approval
              </Button>
            </ActionBlock>
          )}

          {/* CeoApproved -> Coordinator sets starting date + creates the employee.
              The approval letter can contain sensitive CEO-only correspondence,
              so that link is HRAdmin-only — Coordinators/Dept Heads still see
              the reward figure (they need it for the starting date paperwork)
              but never the letter itself. */}
          {detail.status === 'CeoApproved' && (isDepartmentCoordinator || isHRAdmin) && (
            <ActionBlock title={`CEO approved on ${detail.ceoApprovalAt ? formatDate(detail.ceoApprovalAt) : ''} (Ref: ${detail.ceoApprovalReferenceNo})`}>
              {(detail.monthlyReward != null || (isHRAdmin && detail.ceoApprovalLetterUrl)) && (
                <div className="flex items-center gap-3 mb-2 text-xs text-muted-foreground">
                  {detail.monthlyReward != null && (
                    <span>Monthly Reward: <span className="font-medium text-foreground">QAR {detail.monthlyReward.toLocaleString()}</span></span>
                  )}
                  {isHRAdmin && <FileChip label="Approval Letter" url={detail.ceoApprovalLetterUrl} />}
                </div>
              )}
              {isDepartmentCoordinator && (
                <Button className="gap-1.5" disabled={busy} onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${detail.id}/starting-date`)}>
                  <ClipboardList size={14} /> Set Starting Date &amp; Create Employee
                </Button>
              )}
            </ActionBlock>
          )}

          {/* StartingDateSet -> Coordinator records whether the candidate
              showed up, then the Department Head signs; HRAdmin converts or
              marks not-started once that's done. Gated on the Department
              Head's signature below, same pattern as the Interview
              evaluation's manager-review gate. */}
          {detail.status === 'StartingDateSet' && (
            <ActionBlock title={`Starting date: ${detail.startingDate ? formatDate(detail.startingDate) : ''}`}>
              {detail.startingDatePdfUrl && <a href={detail.startingDatePdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View starting date form</a>}

              {!detail.startIntent && isDepartmentCoordinator && (
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline" className="flex-1 gap-1.5" disabled={busy}
                    onClick={() => setConfirmAction({
                      title: 'Report candidate did not show up?',
                      description: 'This records that the candidate did not show up for the starting date, and sends it for Department Head sign-off.',
                      confirmLabel: 'Report Did Not Show Up',
                      icon: UserX,
                      destructive: true,
                      onConfirm: () => run(() => hiringRequestApi.recordNotStarting(detail.id), 'Recorded — awaiting Department Head sign-off.', 'Failed to record.'),
                    })}
                  >
                    <UserX size={14} /> Report Did Not Show Up
                  </Button>
                  <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => setEmployeeSignOpen(true)}>
                    <CheckCircle2 size={14} /> Candidate Here — Sign
                  </Button>
                </div>
              )}

              {detail.startIntent && (
                <p className="text-xs text-muted-foreground mb-1">
                  {detail.startIntent === 'Started' ? 'Candidate started' : 'Candidate did not show up'}
                  {detail.employeeStartSignedAt && ` · Employee signed ${formatDate(detail.employeeStartSignedAt)}`}
                  {detail.managerStartSignedAt
                    ? ` · Department Head signed ${formatDate(detail.managerStartSignedAt)}`
                    : ' · awaiting Department Head signature'}
                </p>
              )}

              <p className="text-xs text-muted-foreground mb-2">
                Employee record created (Onboarding). HR converts to employee or records a non-start below once the signature chain above is complete.
              </p>
              {isHRAdmin && (detail.managerStartSignedAt ? (
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1 gap-1.5" disabled={busy} onClick={() => setNotStartedOpen(true)}>
                    <UserX size={14} /> Did Not Start
                  </Button>
                  <Button
                    className="flex-1 gap-1.5" disabled={busy}
                    onClick={() => setConfirmAction({
                      title: 'Convert candidate to employee?',
                      description: 'This finalizes the candidate as an active employee and moves the request to the Contract Renewal module to start their contract.',
                      confirmLabel: 'Convert to Employee',
                      icon: CheckCircle2,
                      onConfirm: async () => {
                        setBusy(true);
                        try {
                          await hiringRequestApi.convert(detail.id);
                          onChanged();
                          // The hiring flow ends here — no auto-navigate into
                          // an ad hoc, batch-less contract draft (that used to
                          // skip "Start New Contract" entirely). Just tell HR
                          // what's next; they start it properly from there.
                          setConvertedInfo({ candidateName: detail.candidateName });
                        } catch (err) {
                          showToast(getApiErrorMessage(err, 'Failed to convert.'), 'error');
                        } finally {
                          setBusy(false);
                        }
                      },
                    })}
                  >
                    <CheckCircle2 size={14} /> Convert to Employee
                  </Button>
                </div>
              ) : (
                <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 text-xs text-warning flex items-center gap-1.5">
                  <Clock size={13} />
                  Awaiting Department Head signature before HR can convert or mark not-started.
                </div>
              ))}
            </ActionBlock>
          )}

          {detail.status === 'Converted' && (
            <ActionBlock title="Converted to employee">
              <p className="text-xs text-muted-foreground">Converted on {formatDate(detail.convertedAt)}.</p>
            </ActionBlock>
          )}
          {detail.status === 'NotStarted' && (
            <ActionBlock title="Did not start">
              <p className="text-xs text-muted-foreground">{detail.notStartedReason}</p>
            </ActionBlock>
          )}
                </TabsContent>

                <TabsContent value="profile" className="mt-0">
                  <CandidateProfileTab submissionId={detail.freelanceProfileSubmissionId} />
                </TabsContent>

                <TabsContent value="interview" className="mt-0">
                  <InterviewTab detail={detail} />
                </TabsContent>

                <TabsContent value="starting-date" className="mt-0">
                  <StartingDateTab detail={detail} />
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  <HistoryTab hiringRequestId={detail.id} />
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </div>

      {detail && ceoOpen && (
        <CeoApprovalModal
          hiringRequestId={detail.id}
          onClose={() => setCeoOpen(false)}
          onSaved={() => { setCeoOpen(false); onChanged(); showToast('CEO approval recorded.', 'success'); }}
          showToast={showToast}
        />
      )}

      {detail && gmApproveOpen && (
        <GmApproveModal
          hiringRequestId={detail.id}
          onClose={() => setGmApproveOpen(false)}
          onSaved={() => { setGmApproveOpen(false); onChanged(); showToast('Hiring approved.', 'success'); }}
          showToast={showToast}
        />
      )}

      {detail && employeeSignOpen && (
        <EmployeeStartSignModal
          hiringRequestId={detail.id}
          candidateName={detail.candidateName}
          onClose={() => setEmployeeSignOpen(false)}
          onSaved={() => { setEmployeeSignOpen(false); onChanged(); showToast('Signed — awaiting Department Head sign-off.', 'success'); }}
          showToast={showToast}
        />
      )}

      {detail && rejectOpen && (
        <Modal title="Reject this hiring?" onClose={() => setRejectOpen(false)}>
          <div className="space-y-3">
            <Textarea placeholder="Reason (required)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} />
            <Button
              variant="destructive"
              className="w-full gap-1.5"
              disabled={busy || !rejectReason.trim()}
              onClick={async () => {
                await run(() => hiringRequestApi.gmReject(detail.id, rejectReason.trim()), 'Hiring request rejected.', 'Failed to reject.');
                setRejectOpen(false);
              }}
            >
              <XCircle size={14} /> Reject
            </Button>
          </div>
        </Modal>
      )}

      {detail && notStartedOpen && (
        <Modal title="Candidate did not start?" onClose={() => setNotStartedOpen(false)}>
          <div className="space-y-3">
            <Textarea placeholder="Reason (required)" value={notStartedReason} onChange={(e) => setNotStartedReason(e.target.value)} rows={3} />
            <Button
              variant="destructive"
              className="w-full gap-1.5"
              disabled={busy || !notStartedReason.trim()}
              onClick={async () => {
                await run(() => hiringRequestApi.markNotStarted(detail.id, notStartedReason.trim()), 'Recorded as did-not-start.', 'Failed to record.');
                setNotStartedOpen(false);
              }}
            >
              <UserX size={14} /> Confirm
            </Button>
          </div>
        </Modal>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-8',
                confirmAction?.destructive
                  ? 'bg-destructive/10 text-destructive ring-destructive/5'
                  : 'bg-primary/10 text-primary ring-primary/5'
              )}
            >
              {confirmAction?.icon && <confirmAction.icon size={19} strokeWidth={2.25} />}
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
              <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className={cn(
                'gap-1.5',
                confirmAction?.destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
              onClick={() => {
                confirmAction?.onConfirm();
                setConfirmAction(null);
              }}
            >
              {confirmAction?.icon && <confirmAction.icon size={14} />}
              {confirmAction?.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!convertedInfo} onOpenChange={(open) => !open && setConvertedInfo(null)}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-success/10 text-success ring-8 ring-success/5">
              <CheckCircle2 size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Candidate converted to employee</AlertDialogTitle>
              <AlertDialogDescription>
                {convertedInfo?.candidateName} is now an active employee — the hiring process ends here. Next step: start
                their contract from Contract → New.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            <AlertDialogAction className="gap-1.5" onClick={() => { setConvertedInfo(null); navigate('/hr/freelance-hiring/contract-new'); }}>
              <FileSignature size={14} /> Go to Contract → New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CeoApprovalModal({ hiringRequestId, onClose, onSaved, showToast }: any) {
  const [referenceNo, setReferenceNo] = useState('');
  const [approvalAt, setApprovalAt] = useState('');
  // Both optional — the letter and the reward aren't always known/available
  // yet when HR is recording the CEO's approval itself.
  const [monthlyReward, setMonthlyReward] = useState('');
  const [letter, setLetter] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmitClick = () => {
    if (!referenceNo.trim() || !approvalAt) {
      showToast('Reference number and approval date/time are required.', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await hiringRequestApi.recordCeoApproval(
        hiringRequestId,
        referenceNo.trim(),
        new Date(approvalAt).toISOString(),
        monthlyReward.trim() ? Number(monthlyReward) : null,
        letter ?? undefined
      );
      onSaved();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to record CEO approval.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record QMC CEO Approval" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block">CEO Hiring Approval Reference No.</Label>
          <Input value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block">Approval Date &amp; Time</Label>
          <Input type="datetime-local" value={approvalAt} onChange={(e) => setApprovalAt(e.target.value)} />
        </div>
        <div>
          <Label className="mb-1.5 block">Monthly Reward (QAR)</Label>
          <Input
            type="number" min={0} step="0.01" placeholder="Freelancer's salary"
            value={monthlyReward} onChange={(e) => setMonthlyReward(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block">Approval Letter</Label>
          <input
            id="ceo-approval-letter-input"
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setLetter(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button" variant="outline" size="sm" className="max-w-full gap-1.5"
            onClick={() => document.getElementById('ceo-approval-letter-input')?.click()}
          >
            <Upload size={14} />
            <span className="truncate">{letter ? letter.name : 'Choose file (optional)'}</span>
          </Button>
        </div>
        <Button className="w-full gap-1.5" disabled={saving} onClick={handleSubmitClick}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={14} />} Record Approval
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <ShieldCheck size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Record the QMC CEO approval?</AlertDialogTitle>
              <AlertDialogDescription>
                Ref. {referenceNo.trim()}{approvalAt ? ` · ${formatDate(approvalAt)}` : ''}. This moves the request forward to the Starting Date step.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="gap-1.5"
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit();
              }}
            >
              <ShieldCheck size={14} /> Record Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
}

function GmApproveModal({ hiringRequestId, onClose, onSaved, showToast }: any) {
  const [approvalDate, setApprovalDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSubmitClick = () => {
    if (!approvalDate) {
      showToast('The date GM approved is required.', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await hiringRequestApi.gmApprove(hiringRequestId, new Date(approvalDate).toISOString());
      onSaved();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to record approval.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record GM Approval" onClose={onClose}>
      <div className="space-y-3">
        <div>
          <Label className="mb-1.5 block">Date GM Approved</Label>
          <Input type="date" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} />
        </div>
        <Button className="w-full gap-1.5" disabled={saving} onClick={handleSubmitClick}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={14} />} Record Approval
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[420px]">
          <AlertDialogHeader className="flex-row items-start gap-3.5 text-left">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
              <CheckCircle2 size={19} strokeWidth={2.25} />
            </div>
            <div className="space-y-1.5 pt-0.5">
              <AlertDialogTitle>Record GM approval?</AlertDialogTitle>
              <AlertDialogDescription>
                This logs the GM's hiring decision as approved on {approvalDate ? formatDate(approvalDate) : ''} and moves the request to CEO approval.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="gap-1.5"
              onClick={() => {
                setConfirmOpen(false);
                handleSubmit();
              }}
            >
              <CheckCircle2 size={14} /> Record Approval
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Modal>
  );
}

function EmployeeStartSignModal({ hiringRequestId, candidateName, onClose, onSaved, showToast }: any) {
  const [padOpen, setPadOpen] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSign = async (blob: Blob, _method: string) => {
    setSigning(true);
    try {
      const buffer = await hiringRequestApi.getPdfBytes(hiringRequestId);
      const imageBytes = new Uint8Array(await blob.arrayBuffer());
      const { bytes: signed, verificationId } = await stampEmployeeStartSignature(new Uint8Array(buffer), imageBytes, 'png');
      const signedBlob = new Blob([new Uint8Array(signed)], { type: 'application/pdf' });

      await hiringRequestApi.recordEmployeeStartSignature(
        hiringRequestId, signedBlob, candidateName ?? 'Candidate', verificationId, { bytes: imageBytes, type: 'png' }
      );
      onSaved();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to sign.'), 'error');
    } finally {
      setSigning(false);
      setPadOpen(false);
    }
  };

  return (
    <Modal title="Candidate Signature" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Have {candidateName} sign below to confirm they started, then this routes to the Department Head.</p>
        <Button className="w-full gap-1.5" disabled={signing} onClick={() => setPadOpen(true)}>
          {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenTool size={14} />} Sign
        </Button>
      </div>
      <SignaturePad open={padOpen} defaultName={candidateName} onCancel={() => setPadOpen(false)} onConfirm={handleSign} />
    </Modal>
  );
}

function ActionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-xs font-semibold text-foreground mb-2">{title}</p>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className={`bg-card border border-border rounded-lg shadow-xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
        <div className="p-5 border-b border-border flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <Button variant="outline" size="icon" onClick={onClose}><XCircle size={16} /></Button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
      {icon}{children}
    </p>
  );
}

function FileChip({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url} target="_blank" rel="noreferrer"
      className="inline-flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/70 text-foreground rounded-md px-2.5 py-1.5 border border-border transition-colors"
    >
      <FileText size={12} className="text-primary" /> {label}
    </a>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-foreground">{value ?? '—'}</p>
    </div>
  );
}

/** The candidate's submitted profile — personal info, emergency contact,
 * documents, education/experience/certificate files, bank details, relative
 * declarations. Same source data the HRAdmin review queue uses
 * (FreelanceProfileReviewPage), just read-only here and reusable by
 * Coordinators too. */
function CandidateProfileTab({ submissionId }: { submissionId: number | null }) {
  const query = useQuery({
    queryKey: ['hr-freelance-profile-submission', submissionId],
    queryFn: () => freelanceProfileReviewApi.getById(submissionId as number),
    enabled: submissionId !== null,
  });

  if (submissionId === null) {
    return <p className="text-sm text-muted-foreground py-8 text-center">The candidate hasn't submitted their profile yet.</p>;
  }
  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  }
  const p = query.data;
  if (!p) {
    return <p className="text-sm text-destructive py-8 text-center">Failed to load the candidate's profile.</p>;
  }

  return (
    <div className="space-y-5 text-sm">
      <div className="rounded-lg border border-border bg-muted/30 p-3.5">
        <SectionHeading icon={<Users size={12} />}>Personal Information</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Full Name (EN)" value={p.fullNameEn} />
          <Field label="Full Name (AR)" value={p.fullNameAr} />
          <Field label="QID" value={p.qid} />
          <Field label="QID Expiry" value={p.qidExpiry ? formatDate(p.qidExpiry) : null} />
          <Field label="Passport No." value={p.passportNumber} />
          <Field label="Passport Expiry" value={p.passportExpiry ? formatDate(p.passportExpiry) : null} />
          <Field label="Nationality" value={p.nationality} />
          <Field label="Date of Birth" value={p.dob ? formatDate(p.dob) : null} />
          <Field label="Gender" value={p.gender} />
          <Field label="Blood Type" value={p.bloodType} />
          <Field label="Marital Status" value={p.maritalStatus} />
          <Field label="Employer" value={p.employer} />
          <Field label="Residence Country" value={p.residenceCountry} />
          <Field label="Languages" value={p.languages} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <SectionHeading icon={<Phone size={12} />}>Contact</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Phone" value={p.phoneNumber} />
          <Field label="Personal Email" value={p.personalEmail} />
          <Field label="Address" value={p.address} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <SectionHeading icon={<Users size={12} />}>Emergency Contact</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Name" value={p.emergencyContactName} />
          <Field label="Relationship" value={p.emergencyContactRelationship} />
          <Field label="Phone" value={p.emergencyContactPhone} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <SectionHeading icon={<FileText size={12} />}>Submitted Documents</SectionHeading>
        <div className="flex flex-wrap gap-2">
          <FileChip label="QID Image" url={p.qidImageUrl} />
          <FileChip label="Photo" url={p.photoUrl} />
          <FileChip label="CV / Resume" url={p.cvUrl} />
          <FileChip label="Employer NOC Letter" url={p.employerNocLetterUrl} />
          <FileChip label="Establishment Card" url={p.employerEstablishmentCardUrl} />
          <FileChip label="Bank Certificate" url={p.bankCertificateUrl} />
        </div>
        {!p.qidImageUrl && !p.photoUrl && !p.cvUrl && !p.employerNocLetterUrl && !p.employerEstablishmentCardUrl && !p.bankCertificateUrl && (
          <p className="text-xs text-muted-foreground">No documents on file.</p>
        )}
      </div>

      {p.education.length > 0 && (
        <div className="rounded-lg border border-border p-3.5">
          <SectionHeading icon={<FileText size={12} />}>Education</SectionHeading>
          <div className="space-y-1.5">
            {p.education.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{e.qualificationLevel}{e.major ? ` — ${e.major}` : ''} {e.attested && <span className="text-success">(attested)</span>}</span>
                <FileChip label="View" url={e.fileUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      {p.experience.length > 0 && (
        <div className="rounded-lg border border-border p-3.5">
          <SectionHeading icon={<Briefcase size={12} />}>Experience</SectionHeading>
          <div className="space-y-1.5">
            {p.experience.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{e.jobTitle} · {e.companyName} · {e.country}</span>
                <FileChip label="View" url={e.fileUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      {p.certificates.length > 0 && (
        <div className="rounded-lg border border-border p-3.5">
          <SectionHeading icon={<FileText size={12} />}>Certificates</SectionHeading>
          <div className="space-y-1.5">
            {p.certificates.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-xs">
                <span>{c.title ?? 'Certificate'}</span>
                <FileChip label="View" url={c.fileUrl} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border p-3.5">
        <SectionHeading icon={<Landmark size={12} />}>Bank Details</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Beneficiary" value={p.bankBeneficiaryName} />
          <Field label="Bank" value={p.bankName} />
          <Field label="Branch" value={p.bankBranch} />
          <Field label="Account No." value={p.bankAccountNumber} />
          <Field label="IBAN" value={p.bankIban} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-3.5">
        <SectionHeading icon={<Users size={12} />}>Relatives at QBC</SectionHeading>
        <p className="text-xs text-foreground">
          {p.hasRelativesAtQbc
            ? `${p.relativeFullName ?? '—'} (${p.relativeRelationship ?? '—'}) — ${p.relativeDepartment ?? '—'}`
            : 'None declared'}
        </p>
      </div>
    </div>
  );
}

/** Interview evaluation summary — the per-criteria scores and signature live
 * only on the official PDF (filled directly on the document), so this just
 * surfaces the handful of fields captured back to the system plus the PDF
 * itself. */
function InterviewTab({ detail }: { detail: HiringRequestDetail }) {
  if (!detail.interviewPdfUrl && !detail.interviewerName) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No interview evaluation recorded yet.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Interview Date" value={detail.interviewDate ? formatDate(detail.interviewDate) : null} />
          <Field label="Interviewer" value={detail.interviewerName} />
          <Field label="Final Value" value={detail.interviewFinalValuePercent != null ? `${detail.interviewFinalValuePercent}%` : null} />
          <Field
            label="Recommendation"
            value={detail.interviewRecommendation ? RECOMMENDATION_LABELS[detail.interviewRecommendation as InterviewRecommendation] : null}
          />
          <Field
            label="Reviewed By (Dept. Head)"
            value={
              detail.managerReviewedByName
                ? `${detail.managerReviewedByName}${detail.managerReviewedAt ? ` · ${formatDate(detail.managerReviewedAt)}` : ''}`
                : null
            }
          />
        </div>
        {detail.interviewComments && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[11px] text-muted-foreground mb-1">Comments</p>
            <p className="text-xs text-foreground whitespace-pre-wrap">{detail.interviewComments}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The full scored criteria and signature are recorded directly on the official evaluation form.
      </p>
      {detail.interviewPdfUrl ? (
        <FileChip label="View Interview Evaluation PDF" url={detail.interviewPdfUrl} />
      ) : (
        <p className="text-xs text-muted-foreground">No PDF on file.</p>
      )}
    </div>
  );
}

/** Starting Date summary — the signature chain (candidate confirming they
 * started, Department Head countersigning) lives only on the official PDF,
 * same pattern as the Interview tab, so this just surfaces the handful of
 * fields captured back to the system plus the PDF itself. Also owns the NOC
 * letter/establishment card/bank certificate uploads — these aren't part of
 * the Starting Date PDF submission itself since they often aren't on hand at
 * exactly that moment; this tab lets the Coordinator attach them whenever
 * they come in, and scan the bank certificate to fill the bank fields. */
function StartingDateTab({ detail }: { detail: HiringRequestDetail }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const submissionId = detail.freelanceProfileSubmissionId;

  const submissionQuery = useQuery({
    queryKey: ['hr-freelance-profile-submission', submissionId],
    queryFn: () => freelanceProfileReviewApi.getById(submissionId as number),
    enabled: submissionId !== null,
  });
  const submission = submissionQuery.data;

  const [employerNocLetter, setEmployerNocLetter] = useState<File | null>(null);
  const [employerEstablishmentCard, setEmployerEstablishmentCard] = useState<File | null>(null);
  const [bankCertificate, setBankCertificate] = useState<File | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<'BankTransfer' | 'Cheque'>('BankTransfer');
  const [bankBeneficiaryName, setBankBeneficiaryName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIban, setBankIban] = useState('');
  const seededRef = useRef(false);

  // Seeds the editable fields from whatever's already on the submission
  // exactly once, so a SignalR-driven re-fetch while the Coordinator is
  // mid-edit doesn't clobber what they've typed.
  useEffect(() => {
    if (seededRef.current || !submission) return;
    seededRef.current = true;
    setPaymentMethod(submission.paymentMethod ?? 'BankTransfer');
    setBankBeneficiaryName(submission.bankBeneficiaryName ?? '');
    setBankName(submission.bankName ?? '');
    setBankBranch(submission.bankBranch ?? '');
    setBankAccountNumber(submission.bankAccountNumber ?? '');
    setBankIban(submission.bankIban ?? '');
  }, [submission]);

  const [scanning, setScanning] = useState(false);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleScanBankCertificate = async () => {
    if (!bankCertificate) return;
    setScanning(true);
    try {
      const result = await freelanceProfilePublicApi.scanBankCertificate(bankCertificate);
      if (result.beneficiaryName) setBankBeneficiaryName(result.beneficiaryName);
      if (result.bankName) setBankName(result.bankName);
      if (result.branch) setBankBranch(result.branch);
      if (result.accountNumber) setBankAccountNumber(result.accountNumber);
      if (result.iban) setBankIban(result.iban);
      setScanWarnings(result.warnings);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to scan bank certificate.'), 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await hiringRequestApi.saveStartingDateDocuments(
        detail.id,
        {
          employerNocLetter: employerNocLetter ?? undefined,
          employerEstablishmentCard: employerEstablishmentCard ?? undefined,
          bankCertificate: bankCertificate ?? undefined,
        },
        paymentMethod,
        { bankBeneficiaryName, bankName, bankBranch, bankAccountNumber, bankIban }
      );
      setEmployerNocLetter(null);
      setEmployerEstablishmentCard(null);
      setBankCertificate(null);
      queryClient.invalidateQueries({ queryKey: ['hr-freelance-profile-submission', submissionId] });
      showToast('Documents saved.', 'success');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to save documents.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!detail.startingDatePdfUrl && !detail.startingDate) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No starting date set yet.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5">
          <Field label="Starting Date" value={detail.startingDate ? formatDate(detail.startingDate) : null} />
          <Field label="CEO Approval Ref" value={detail.ceoApprovalReferenceNo} />
          <Field label="Monthly Reward" value={detail.monthlyReward != null ? `QAR ${detail.monthlyReward.toLocaleString()}` : null} />
          <Field
            label="Outcome"
            value={detail.startIntent === 'Started' ? 'Started' : detail.startIntent === 'NotStarted' ? 'Did not show up' : null}
          />
          <Field
            label="Candidate Signed"
            value={detail.employeeStartSignedByName ? `${detail.employeeStartSignedByName} · ${detail.employeeStartSignedAt ? formatDate(detail.employeeStartSignedAt) : ''}` : null}
          />
          <Field
            label="Dept. Head Signed"
            value={detail.managerStartSignedByName ? `${detail.managerStartSignedByName} · ${detail.managerStartSignedAt ? formatDate(detail.managerStartSignedAt) : ''}` : null}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        The signature chain (candidate confirming they started, Department Head countersigning) is recorded directly on the official form.
      </p>
      {detail.startingDatePdfUrl ? (
        <FileChip label="View Starting Date PDF" url={detail.startingDatePdfUrl} />
      ) : (
        <p className="text-xs text-muted-foreground">No PDF on file.</p>
      )}

      {submissionId !== null && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Candidate Documents</p>
            <PaymentMethodToggle value={paymentMethod} onChange={setPaymentMethod} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DocumentSlot
              label="NOC Letter"
              file={employerNocLetter}
              existingUrl={submission?.employerNocLetterUrl}
              onSelect={setEmployerNocLetter}
            />
            <DocumentSlot
              label="Establishment Card"
              file={employerEstablishmentCard}
              existingUrl={submission?.employerEstablishmentCardUrl}
              onSelect={setEmployerEstablishmentCard}
            />
            {paymentMethod === 'BankTransfer' && (
              <DocumentSlot
                label="Bank Certificate"
                file={bankCertificate}
                existingUrl={submission?.bankCertificateUrl}
                onSelect={setBankCertificate}
              />
            )}
          </div>

          {paymentMethod === 'BankTransfer' ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <p className="text-xs text-muted-foreground">Bank details — fill in by hand, or scan the certificate above.</p>
                <Button
                  type="button" size="sm" variant="outline" className="h-8 gap-1.5"
                  disabled={!bankCertificate || scanning}
                  onClick={handleScanBankCertificate}
                >
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanLine size={13} />}
                  {scanning ? 'Reading…' : 'Scan & Fill Bank Details'}
                </Button>
              </div>
              {scanWarnings.length > 0 && (
                <p className="text-[11px] text-warning -mt-2">Couldn't read: {scanWarnings.join(', ')}</p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Beneficiary Name</Label>
                  <Input className="h-9" value={bankBeneficiaryName} onChange={(e) => setBankBeneficiaryName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Bank Name</Label>
                  <Input className="h-9" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Branch</Label>
                  <Input className="h-9" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Account Number</Label>
                  <Input className="h-9" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs mb-1 block">IBAN</Label>
                  <Input className="h-9" value={bankIban} onChange={(e) => setBankIban(e.target.value)} />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2.5 flex items-center gap-2">
              <Landmark size={14} className="text-warning shrink-0" />
              <p className="text-xs text-foreground">
                Paid by cheque — no bank details needed. If they open a bank account later, update it from their employee record.
              </p>
            </div>
          )}

          <Button size="sm" className="gap-1.5" disabled={saving} onClick={handleSave}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save size={14} />} {saving ? 'Saving…' : 'Save Documents'}
          </Button>
        </div>
      )}
    </div>
  );
}

/** Segmented control — Bank Transfer is the default, matching how every
 * existing record behaves; Cheque is the explicit opt-in for candidates who
 * don't have a bank account yet. */
function PaymentMethodToggle({
  value, onChange,
}: { value: 'BankTransfer' | 'Cheque'; onChange: (v: 'BankTransfer' | 'Cheque') => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 shrink-0">
      {(['BankTransfer', 'Cheque'] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            value === option ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option === 'BankTransfer' ? 'Bank Transfer' : 'Cheque'}
        </button>
      ))}
    </div>
  );
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

/** A document upload slot that actually shows the file, not just its name —
 * an image thumbnail, an inline PDF preview, or a generic document icon as
 * the fallback, plus View/Replace actions. Works the same whether showing a
 * file just picked locally (not yet saved) or one already on the record. */
function DocumentSlot({
  label, file, existingUrl, onSelect,
}: { label: string; file: File | null; existingUrl?: string | null; onSelect: (file: File | null) => void }) {
  const inputId = useRef(`doc-upload-${Math.random().toString(36).slice(2)}`).current;
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setLocalPreviewUrl(null); return; }
    const url = URL.createObjectURL(file);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = localPreviewUrl ?? existingUrl ?? null;
  const isImage = file ? file.type.startsWith('image/') : !!existingUrl && isLikelyImageUrl(existingUrl);
  const isPdf = file ? file.type === 'application/pdf' : !!existingUrl && existingUrl.toLowerCase().includes('.pdf');
  const hasSomething = !!file || !!existingUrl;

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <input
        id={inputId}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => onSelect(e.target.files?.[0] ?? null)}
      />
      {hasSomething ? (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={label} className="w-full h-28 object-cover bg-muted" />
          ) : isPdf && previewUrl ? (
            <embed src={previewUrl} type="application/pdf" className="w-full h-28 bg-muted" />
          ) : (
            <div className="w-full h-28 flex items-center justify-center bg-muted">
              <FileText size={26} className="text-muted-foreground" />
            </div>
          )}
          <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 border-t border-border">
            <span className="text-[11px] text-foreground truncate" title={file?.name}>
              {file ? file.name : 'Uploaded'}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {previewUrl && (
                <a href={previewUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary hover:underline">
                  View
                </a>
              )}
              <button
                type="button"
                onClick={() => document.getElementById(inputId)?.click()}
                className="text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => document.getElementById(inputId)?.click()}
          className="w-full h-28 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <Upload size={18} />
          <span className="text-[11px] font-medium">Click to upload</span>
        </button>
      )}
    </div>
  );
}

/** Complete append-only activity log for this hiring request — same event
 * data RequestHistoryModal shows elsewhere, rendered as an inline timeline
 * instead of a separate popup so it sits alongside the other tabs. */
function HistoryTab({ hiringRequestId }: { hiringRequestId: number }) {
  const query = useQuery({
    queryKey: ['hr-hiring-request-audit', hiringRequestId],
    queryFn: () => hiringRequestApi.getAudit(hiringRequestId),
  });

  if (query.isLoading) return <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>;
  const events = query.data ?? [];
  if (events.length === 0) return <p className="text-sm text-muted-foreground py-8 text-center">No activity recorded yet.</p>;

  return (
    <ul className="relative space-y-5 pl-1">
      {events.map((e, i) => (
        <li key={e.id} className="flex gap-3">
          <div className="flex flex-col items-center shrink-0">
            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Clock size={13} />
            </div>
            {i < events.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
          </div>
          <div className="min-w-0 text-sm pb-1">
            <p className="font-medium text-foreground">{HIRING_EVENT_LABELS[e.eventType] ?? e.eventType}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {e.actorName ? ` · ${e.actorName}` : ''}
            </p>
            {e.metadata && <p className="text-xs text-foreground/80 mt-0.5 italic">{e.metadata}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
