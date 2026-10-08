import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSignalR } from '@/contexts/SignalRContext';
import {
  Briefcase, Building2, Calendar, CheckCircle2, ChevronRight, Clock, ClipboardList, Copy,
  FileText, Landmark, Link as LinkIcon, Loader2, PenTool, Phone, Plus, Search as SearchIcon, Tag,
  ShieldCheck, UserX, Users, UserCheck, X, XCircle,
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
import { ListFilterBar, FilterActiveFiltersRow } from '@/components/ui/list-filter-bar';
import { ListPaginationBar, getInitialPage, getInitialPageSize } from '@/components/ui/list-pagination-bar';
import { StatTile } from '../components/StatTile';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { freelanceProfileReviewApi } from '../api/freelanceProfileApi';
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
  LinkGenerated: 'Link Sent',
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
  const currentIndex = STAGE_ORDER.indexOf(status);
  return (
    <div className="flex items-center overflow-x-auto pb-1">
      {STAGE_ORDER.map((stage, i) => {
        const isDone = currentIndex >= 0 && i < currentIndex;
        const isCurrent = i === currentIndex;
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
  ForwardedToGm: 'Forwarded to GM',
  GmApproved: 'GM approval recorded',
  GmRejected: 'GM rejection recorded',
  CeoApprovalRecorded: 'QMC CEO approval recorded',
  StartingDateSet: 'Starting date set',
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
    if (q && !r.candidateName.toLowerCase().includes(q) && !r.positionTitle.toLowerCase().includes(q)) return false;
    return true;
  });

  const hasActiveFilters = !!search.trim() || statusFilter !== 'all' || departmentFilter !== 'all';
  const clearAllFilters = () => { setSearch(''); setStatusFilter('all'); setDepartmentFilter('all'); };
  const selectedDepartmentLabel = departments.find(([id]) => String(id) === departmentFilter)?.[1];

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pagedRequests = filteredRequests.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Freelancer Hiring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track freelancer hiring from first contact through onboarding.
          </p>
        </div>
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
                      {r.candidateName}
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
              <Button className="gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.generateLink(detail.id), 'Link generated.', 'Failed to generate link.')}>
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
                  onClick={() => run(() => hiringRequestApi.generateLink(detail.id), 'Link regenerated.', 'Failed to regenerate link.')}
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
              logging as CEO approval — no separate "forward" step). */}
          {detail.status === 'InterviewSubmitted' && isHRAdmin && (
            <ActionBlock title="Record the GM's hiring decision">
              {detail.interviewRecommendation && (
                <p className="text-xs text-muted-foreground mb-1">
                  Interviewer recommendation: <span className="font-medium text-foreground">{RECOMMENDATION_LABELS[detail.interviewRecommendation as InterviewRecommendation]}</span>
                  {detail.interviewFinalValuePercent != null && ` · ${detail.interviewFinalValuePercent}%`}
                </p>
              )}
              {detail.interviewPdfUrl && <a href={detail.interviewPdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View interview evaluation PDF</a>}
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1 gap-1.5" disabled={busy} onClick={() => setRejectOpen(true)}>
                  <XCircle size={14} /> Reject
                </Button>
                <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => setGmApproveOpen(true)}>
                  <CheckCircle2 size={14} /> Approve
                </Button>
              </div>
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

          {/* CeoApproved -> Coordinator sets starting date + creates the employee */}
          {detail.status === 'CeoApproved' && isDepartmentCoordinator && (
            <ActionBlock title={`CEO approved on ${detail.ceoApprovalAt ? formatDate(detail.ceoApprovalAt) : ''} (Ref: ${detail.ceoApprovalReferenceNo})`}>
              <Button className="gap-1.5" disabled={busy} onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${detail.id}/starting-date`)}>
                <ClipboardList size={14} /> Set Starting Date &amp; Create Employee
              </Button>
            </ActionBlock>
          )}

          {/* StartingDateSet -> Coordinator records whether the candidate
              showed up, then the Department Head signs; HRAdmin converts or
              marks not-started once that's done (unchanged from before). */}
          {detail.status === 'StartingDateSet' && (
            <ActionBlock title={`Starting date: ${detail.startingDate ? formatDate(detail.startingDate) : ''}`}>
              {detail.startingDatePdfUrl && <a href={detail.startingDatePdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View starting date form</a>}

              {!detail.startIntent && isDepartmentCoordinator && (
                <div className="flex gap-2 mb-2">
                  <Button variant="outline" className="flex-1 gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.recordNotStarting(detail.id), 'Recorded — awaiting Department Head sign-off.', 'Failed to record.')}>
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
              {isHRAdmin && (
                <div className="flex gap-2">
                  <Button variant="destructive" className="flex-1 gap-1.5" disabled={busy} onClick={() => setNotStartedOpen(true)}>
                    <UserX size={14} /> Did Not Start
                  </Button>
                  <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.convert(detail.id), 'Candidate converted to employee.', 'Failed to convert.')}>
                    <CheckCircle2 size={14} /> Convert to Employee
                  </Button>
                </div>
              )}
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
    </div>
  );
}

function CeoApprovalModal({ hiringRequestId, onClose, onSaved, showToast }: any) {
  const [referenceNo, setReferenceNo] = useState('');
  const [approvalAt, setApprovalAt] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!referenceNo.trim() || !approvalAt) {
      showToast('Reference number and approval date/time are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await hiringRequestApi.recordCeoApproval(hiringRequestId, referenceNo.trim(), new Date(approvalAt).toISOString());
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
        <Button className="w-full gap-1.5" disabled={saving} onClick={handleSubmit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck size={14} />} Record Approval
        </Button>
      </div>
    </Modal>
  );
}

function GmApproveModal({ hiringRequestId, onClose, onSaved, showToast }: any) {
  const [approvalDate, setApprovalDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!approvalDate) {
      showToast('The date GM approved is required.', 'error');
      return;
    }
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
        <Button className="w-full gap-1.5" disabled={saving} onClick={handleSubmit}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={14} />} Record Approval
        </Button>
      </div>
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
