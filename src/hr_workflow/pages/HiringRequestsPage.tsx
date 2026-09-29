import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ClipboardList, Copy, Eye, Link as LinkIcon, Loader2, Plus,
  ShieldCheck, UserX, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { hiringRequestApi } from '../api/hiringRequestApi';
import { formatDate } from '../utils/hrUtils';
import {
  HIRING_REQUEST_STATUS_LABELS,
  type HiringRequestStatus, type InterviewRecommendation,
} from '../types/hiringRequest';

const STATUS_BADGE: Record<HiringRequestStatus, string> = {
  Requested: 'border-transparent bg-muted text-muted-foreground',
  LinkGenerated: 'border-transparent bg-info/15 text-info',
  ProfileSubmitted: 'border-transparent bg-info/15 text-info',
  InterviewSubmitted: 'border-transparent bg-info/15 text-info',
  AwaitingGmApproval: 'border-transparent bg-warning/15 text-warning',
  Rejected: 'border-transparent bg-destructive/15 text-destructive',
  AwaitingCeoApproval: 'border-transparent bg-warning/15 text-warning',
  CeoApproved: 'border-transparent bg-info/15 text-info',
  StartingDateSet: 'border-transparent bg-info/15 text-info',
  Converted: 'border-transparent bg-success/15 text-success',
  NotStarted: 'border-transparent bg-destructive/15 text-destructive',
};

const RECOMMENDATION_LABELS: Record<InterviewRecommendation, string> = {
  RecommendForHire: 'Recommend For Hire',
  PracticalTest: 'Practical Test',
  NotAMatch: 'Not A Match',
  DecisionNotYetMade: 'Decision Not Yet Made',
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
  const isDepartmentHead = user?.roles?.includes('DepartmentHead') ?? false;
  const isFinalSignatory = user?.roles?.includes('FinalSignatory') ?? false;

  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

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

  const requests = listQuery.data ?? [];
  const detail = detailQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Freelancer Hiring</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Candidate link &rarr; profile &rarr; interview &rarr; GM approval &rarr; CEO approval &rarr; starting date &rarr; conversion.
          </p>
        </div>
        {(isHRAdmin || isDepartmentHead) && (
          <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Request Candidate Link
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              )}
              {!listQuery.isLoading && requests.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No hiring requests yet.</TableCell></TableRow>
              )}
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-foreground">{r.candidateName}</TableCell>
                  <TableCell>{r.positionTitle}</TableCell>
                  <TableCell className="text-muted-foreground">{r.departmentNameEn ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(r.requestedAt)}</TableCell>
                  <TableCell><Badge className={STATUS_BADGE[r.status]}>{HIRING_REQUEST_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDetailId(r.id)}>
                      <Eye size={14} /> Open
                    </Button>
                  </TableCell>
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
          isFinalSignatory={isFinalSignatory}
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
  const myDeptHeadQuery = useQuery({ queryKey: ['hr-department-head-me'], queryFn: hrApi.getMyDepartmentHead, enabled: !isHRAdmin });

  const [departmentId, setDepartmentId] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fixedDepartmentId = !isHRAdmin ? myDeptHeadQuery.data?.departmentId : undefined;
  const effectiveDepartmentId = fixedDepartmentId ? String(fixedDepartmentId) : departmentId;

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
  isFinalSignatory: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  onClose: () => void;
  onChanged: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

function DetailModal({ detail, loading, isHRAdmin, isFinalSignatory, busy, setBusy, onClose, onChanged, showToast }: any) {
  const navigate = useNavigate();
  const [ceoOpen, setCeoOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notStartedReason, setNotStartedReason] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notStartedOpen, setNotStartedOpen] = useState(false);

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

  return (
    <Modal title={detail ? detail.candidateName : 'Loading…'} onClose={onClose} wide>
      {loading || !detail ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : (
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <p><span className="text-muted-foreground">Position:</span> {detail.positionTitle}</p>
            <p><span className="text-muted-foreground">Department:</span> {detail.departmentNameEn}</p>
            <p><span className="text-muted-foreground">Status:</span> <Badge className={STATUS_BADGE[detail.status as HiringRequestStatus]}>{HIRING_REQUEST_STATUS_LABELS[detail.status as HiringRequestStatus]}</Badge></p>
            <p><span className="text-muted-foreground">Requested:</span> {formatDate(detail.requestedAt)}</p>
          </div>

          {/* Requested -> generate link (HR) */}
          {detail.status === 'Requested' && isHRAdmin && (
            <ActionBlock title="Generate the candidate link">
              <Button className="gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.generateLink(detail.id), 'Link generated.', 'Failed to generate link.')}>
                <LinkIcon size={14} /> Generate Link
              </Button>
            </ActionBlock>
          )}

          {/* LinkGenerated -> show link to copy/forward */}
          {detail.linkToken && !detail.freelanceProfileSubmissionId && (
            <ActionBlock title="Candidate link — forward this to the candidate">
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/freelance-profile/${detail.linkToken}`} className="text-xs" />
                <Button size="sm" variant="outline" onClick={copyLink}><Copy size={14} /></Button>
              </div>
              {detail.linkExpiresAt && <p className="text-xs text-muted-foreground mt-1">Expires {formatDate(detail.linkExpiresAt)}</p>}
            </ActionBlock>
          )}

          {/* ProfileSubmitted -> link to review page + open interview form */}
          {detail.status === 'ProfileSubmitted' && (
            <ActionBlock title="Candidate profile submitted">
              <div className="flex flex-wrap gap-2">
                {isHRAdmin && (
                  <a href="/hr/freelance-hiring/profile-submissions" className="text-primary underline text-xs self-center">
                    View submitted profile
                  </a>
                )}
                <Button size="sm" className="gap-1.5" onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${detail.id}/interview`)}>
                  <ClipboardList size={14} /> Record Interview Evaluation
                </Button>
              </div>
            </ActionBlock>
          )}

          {/* InterviewSubmitted -> HR forwards to GM */}
          {detail.status === 'InterviewSubmitted' && isHRAdmin && (
            <ActionBlock title="Interview recorded — forward to GM for approval">
              {detail.interviewRecommendation && (
                <p className="text-xs text-muted-foreground mb-1">
                  Interviewer recommendation: <span className="font-medium text-foreground">{RECOMMENDATION_LABELS[detail.interviewRecommendation as InterviewRecommendation]}</span>
                  {detail.interviewFinalValuePercent != null && ` · ${detail.interviewFinalValuePercent}%`}
                </p>
              )}
              {detail.interviewPdfUrl && <a href={detail.interviewPdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View interview evaluation PDF</a>}
              <Button className="gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.forwardToGm(detail.id), 'Forwarded to GM.', 'Failed to forward.')}>
                <CheckCircle2 size={14} /> Forward to GM
              </Button>
            </ActionBlock>
          )}

          {/* AwaitingGmApproval -> GM approve/reject */}
          {detail.status === 'AwaitingGmApproval' && isFinalSignatory && (
            <ActionBlock title="Awaiting your decision as GM">
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
                <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.gmApprove(detail.id), 'Hiring approved.', 'Failed to approve.')}>
                  <CheckCircle2 size={14} /> Approve
                </Button>
              </div>
            </ActionBlock>
          )}
          {detail.status === 'Rejected' && (
            <ActionBlock title="Rejected by GM">
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

          {/* CeoApproved -> HR sets starting date + triggers contract */}
          {detail.status === 'CeoApproved' && isHRAdmin && (
            <ActionBlock title={`CEO approved on ${detail.ceoApprovalAt ? formatDate(detail.ceoApprovalAt) : ''} (Ref: ${detail.ceoApprovalReferenceNo})`}>
              <Button className="gap-1.5" disabled={busy} onClick={() => navigate(`/hr/freelance-hiring/hiring-requests/${detail.id}/starting-date`)}>
                <ClipboardList size={14} /> Set Starting Date &amp; Create Employee
              </Button>
            </ActionBlock>
          )}

          {/* StartingDateSet -> contract signing proceeds elsewhere; HR converts or marks not-started */}
          {detail.status === 'StartingDateSet' && isHRAdmin && (
            <ActionBlock title={`Starting date: ${detail.startingDate ? formatDate(detail.startingDate) : ''}`}>
              {detail.startingDatePdfUrl && <a href={detail.startingDatePdfUrl} target="_blank" rel="noreferrer" className="text-primary underline text-xs block mb-2">View starting date form</a>}
              <p className="text-xs text-muted-foreground mb-2">
                Employee record created (Onboarding). Send the contract for signature from Contract Renewal as usual, then convert once signed and started.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" className="flex-1 gap-1.5" disabled={busy} onClick={() => setNotStartedOpen(true)}>
                  <UserX size={14} /> Did Not Start
                </Button>
                <Button className="flex-1 gap-1.5" disabled={busy} onClick={() => run(() => hiringRequestApi.convert(detail.id), 'Candidate converted to employee.', 'Failed to convert.')}>
                  <CheckCircle2 size={14} /> Convert to Employee
                </Button>
              </div>
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
        </div>
      )}

      {ceoOpen && (
        <CeoApprovalModal
          hiringRequestId={detail.id}
          onClose={() => setCeoOpen(false)}
          onSaved={() => { setCeoOpen(false); onChanged(); showToast('CEO approval recorded.', 'success'); }}
          showToast={showToast}
        />
      )}

      {rejectOpen && (
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

      {notStartedOpen && (
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
    </Modal>
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
