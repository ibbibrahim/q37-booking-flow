import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Eye, Loader2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/contexts/ToastContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { hrApi } from '../api/hrApi';
import { freelanceProfileReviewApi } from '../api/freelanceProfileApi';
import { formatDate } from '../utils/hrUtils';
import type { FreelanceProfileStatus } from '../types/freelanceProfile';

const STATUS_BADGE: Record<FreelanceProfileStatus, string> = {
  Pending: 'border-transparent bg-warning/15 text-warning',
  Approved: 'border-transparent bg-success/15 text-success',
  Rejected: 'border-transparent bg-destructive/15 text-destructive',
};

/** HRAdmin's queue for the freelance profile submissions collected via the
 * public /freelance-profile form. Approving merges the submission onto the
 * selected employee's record (fill-gaps-only — see backend
 * HrFreelanceProfileService.MergeIntoEmployee); leaving the employee
 * unselected just records the review, for submissions from people not yet
 * in the system (create them separately via Add Employee). */
export function FreelanceProfileReviewPage() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [detailId, setDetailId] = useState<number | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [approving, setApproving] = useState(false);

  const listQuery = useQuery({
    queryKey: ['hr-freelance-profile-submissions'],
    queryFn: freelanceProfileReviewApi.getAll,
  });

  const detailQuery = useQuery({
    queryKey: ['hr-freelance-profile-submission', detailId],
    queryFn: () => freelanceProfileReviewApi.getById(detailId as number),
    enabled: detailId !== null,
  });

  const employeesQuery = useQuery({
    queryKey: ['hr-employees', 'Freelance', 'profile-review'],
    queryFn: () => hrApi.searchEmployees({ contractType: 'Freelance', page: 1, pageSize: 2000 }),
    enabled: detailId !== null,
  });
  const employees = employeesQuery.data?.items ?? [];

  const openDetail = (id: number, suggestedEmployeeId: number | null) => {
    setDetailId(id);
    setTargetEmployeeId(suggestedEmployeeId ? String(suggestedEmployeeId) : '');
    setReviewNotes('');
    setRejectReason('');
  };

  const closeDetail = () => setDetailId(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['hr-freelance-profile-submissions'] });
  };

  const handleApprove = async () => {
    if (!detailId) return;
    setApproving(true);
    try {
      await freelanceProfileReviewApi.approve(detailId, targetEmployeeId ? Number(targetEmployeeId) : null, reviewNotes || null);
      showToast('Submission approved.', 'success');
      refresh();
      closeDetail();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to approve submission.'), 'error');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!detailId) return;
    if (!rejectReason.trim()) {
      showToast('A reason is required to reject.', 'error');
      return;
    }
    setRejecting(true);
    try {
      await freelanceProfileReviewApi.reject(detailId, rejectReason.trim());
      showToast('Submission rejected.', 'success');
      refresh();
      closeDetail();
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Failed to reject submission.'), 'error');
    } finally {
      setRejecting(false);
    }
  };

  const submissions = listQuery.data ?? [];
  const detail = detailQuery.data;

  const fileLink = (label: string, url: string | null) =>
    url ? <a href={url} target="_blank" rel="noreferrer" className="text-primary underline text-xs">{label}</a> : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Freelance Profile Submissions</h1>
        <p className="text-sm text-muted-foreground mt-1">Review profiles submitted via the public form, then approve to merge or reject.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>QID</TableHead>
                <TableHead>Matched Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listQuery.isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Loading…</TableCell></TableRow>
              )}
              {!listQuery.isLoading && submissions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">No submissions yet.</TableCell></TableRow>
              )}
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-foreground">{s.fullNameEn}</TableCell>
                  <TableCell className="tabular-nums">{s.qid}</TableCell>
                  <TableCell className="text-muted-foreground">{s.matchedEmployeeName ?? '—'}</TableCell>
                  <TableCell><Badge className={STATUS_BADGE[s.status]}>{s.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openDetail(s.id, s.matchedEmployeeId)}>
                      <Eye size={14} /> {s.status === 'Pending' ? 'Review' : 'View'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">{detail?.fullNameEn ?? 'Loading…'}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">QID {detail?.qid}</p>
              </div>
              <Button variant="outline" size="icon" onClick={closeDetail}><XCircle size={16} /></Button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-sm">
              {!detail && <p className="text-muted-foreground">Loading…</p>}
              {detail && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <p><span className="text-muted-foreground">Nationality:</span> {detail.nationality ?? '—'}</p>
                    <p><span className="text-muted-foreground">DOB:</span> {detail.dob ? formatDate(detail.dob) : '—'}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {detail.phoneNumber ?? '—'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {detail.personalEmail ?? '—'}</p>
                    <p><span className="text-muted-foreground">Employer:</span> {detail.employer ?? '—'}</p>
                    <p><span className="text-muted-foreground">Gender / Blood:</span> {detail.gender ?? '—'} / {detail.bloodType ?? '—'}</p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    {fileLink('QID image', detail.qidImageUrl)}
                    {fileLink('Photo', detail.photoUrl)}
                    {fileLink('CV', detail.cvUrl)}
                    {fileLink('NOC letter', detail.employerNocLetterUrl)}
                    {fileLink('Establishment card', detail.employerEstablishmentCardUrl)}
                    {fileLink('Bank certificate', detail.bankCertificateUrl)}
                  </div>

                  {detail.education.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">EDUCATION</p>
                      {detail.education.map((e) => (
                        <p key={e.id} className="text-xs">{e.qualificationLevel} — {fileLink('file', e.fileUrl)}</p>
                      ))}
                    </div>
                  )}
                  {detail.experience.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">EXPERIENCE</p>
                      {detail.experience.map((e) => (
                        <p key={e.id} className="text-xs">{e.companyName} · {e.jobTitle} · {e.country} — {fileLink('file', e.fileUrl)}</p>
                      ))}
                    </div>
                  )}
                  {detail.certificates.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">CERTIFICATES</p>
                      {detail.certificates.map((c) => (
                        <p key={c.id} className="text-xs">{c.title ?? 'Certificate'} — {fileLink('file', c.fileUrl)}</p>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">BANK DETAILS</p>
                    <p className="text-xs">{detail.bankBeneficiaryName ?? '—'} · {detail.bankName ?? '—'} · {detail.bankBranch ?? '—'} · {detail.bankAccountNumber ?? '—'} · {detail.bankIban ?? '—'}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">RELATIVES AT QBC</p>
                    <p className="text-xs">
                      {detail.hasRelativesAtQbc
                        ? `${detail.relativeFullName} (${detail.relativeRelationship}) — ${detail.relativeDepartment}`
                        : 'None declared'}
                    </p>
                  </div>

                  {detail.status === 'Pending' ? (
                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium text-foreground mb-1.5">Link to existing employee (fill-gaps merge) or leave as new hire</p>
                        <Select value={targetEmployeeId} onValueChange={setTargetEmployeeId}>
                          <SelectTrigger><SelectValue placeholder="New hire — no employee record yet" /></SelectTrigger>
                          <SelectContent>
                            {employees.map((e) => (
                              <SelectItem key={e.id} value={String(e.id)}>{e.fullNameEn} (QID {e.qid})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Textarea placeholder="Review notes (optional)" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} />
                      <Textarea placeholder="Rejection reason (only needed if rejecting)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                      <div className="flex gap-2">
                        <Button variant="destructive" className="flex-1 gap-1.5" disabled={rejecting || approving} onClick={handleReject}>
                          {rejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle size={14} />} Reject
                        </Button>
                        <Button className="flex-1 gap-1.5" disabled={rejecting || approving} onClick={handleApprove}>
                          {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={14} />} Approve &amp; Merge
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-border pt-4 text-xs text-muted-foreground">
                      {detail.status} {detail.reviewedAt ? `on ${formatDate(detail.reviewedAt)}` : ''} {detail.reviewNotes ? `— ${detail.reviewNotes}` : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

