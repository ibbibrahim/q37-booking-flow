import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowLeft, Check, Copy, FileText, FolderOpen, Info, Link2 } from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatFileSize } from '@/lib/formatFileSize';
import {
  approveCreativeRequest,
  completeCreativeRequest,
  getCreativeRequest,
  getCreativeRequestTransitions,
  unapproveCreativeRequest,
  uploadCreativeAttachment,
} from '../services/creativeApi';
import { useCreativeRequestChanged } from '../hooks/useCreativeRequestChanged';
import { CreativeCommentThread } from './CreativeCommentThread';
import {
  CREATIVE_REQUEST_STATUS,
  CREATIVE_REQUEST_TYPE,
  CREATIVE_REQUEST_TYPE_LABEL,
  GRAPHICS_TEAM_REQUEST_TYPES,
  canFulfill,
  creativePermissionsFor,
  type CreativeRequestTransition,
  type FillerData,
  type LowerThirdData,
  type NewsHeadlineData,
  type ProgramVideoWallData,
  type SocialMediaHeadlineData,
  type SpecialRequestData,
  type UploadedFileRef,
  type VideoWallPresentationData,
} from '../types/creative';

const statusColors: Record<string, string> = {
  Submitted: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  Completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  NeedsRevision: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  Approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
};

const priorityColors: Record<string, string> = {
  Normal: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  Urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
};

// Requires a share-folder path response, per the doc ("Response should be path on share
// folder"), rather than a drive link or an Image Library upload.
const RESPONSE_PATH_TYPES: string[] = [
  CREATIVE_REQUEST_TYPE.Filler,
  CREATIVE_REQUEST_TYPE.LowerThird,
  CREATIVE_REQUEST_TYPE.SpecialRequest,
];

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Turns a raw status transition into a plain-English sentence for the activity trail, instead
// of showing the raw "Submitted → Completed" status codes.
function describeTransition(t: CreativeRequestTransition, teamLabel: string): string {
  if (!t.fromStatus) return `Request submitted and routed to ${teamLabel}`;
  switch (t.toStatus) {
    case CREATIVE_REQUEST_STATUS.Completed:
      return 'Delivery marked complete, awaiting approval';
    case CREATIVE_REQUEST_STATUS.Approved:
      return 'Approved and ready to air';
    case CREATIVE_REQUEST_STATUS.NeedsRevision:
      return 'Sent back for revision';
    default:
      return `${t.fromStatus} → ${t.toStatus}`;
  }
}

export function CreativeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const requestId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const perms = creativePermissionsFor(user?.roles ?? []);

  const [uploading, setUploading] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [responsePath, setResponsePath] = useState('');
  const [completeComment, setCompleteComment] = useState('');
  const [completing, setCompleting] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState<null | 'approve' | 'unapprove'>(null);
  const [confirmAction, setConfirmAction] = useState<null | 'approve' | 'unapprove'>(null);

  const queryKey = ['creative-request', requestId];
  const { data: request, isLoading } = useQuery({
    queryKey,
    queryFn: () => getCreativeRequest(requestId),
    enabled: Number.isFinite(requestId),
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ['creative-request-transitions', requestId],
    queryFn: () => getCreativeRequestTransitions(requestId),
    enabled: Number.isFinite(requestId),
  });

  useCreativeRequestChanged((updated) => {
    if (updated.id === requestId) {
      queryClient.setQueryData(queryKey, updated);
      queryClient.invalidateQueries({ queryKey: ['creative-request-transitions', requestId] });
    }
  });

  const typeData = useMemo(() => {
    if (!request?.typeSpecificData) return null;
    try {
      return JSON.parse(request.typeSpecificData);
    } catch {
      return null;
    }
  }, [request?.typeSpecificData]);

  // Pre-fill the drive link / response path if this request already has one (e.g. Graphics
  // Team is resubmitting after Social Media unapproved it) — seeds once per request load
  // without clobbering further edits.
  useEffect(() => {
    if (typeData?.driveLink && !driveLink) setDriveLink(typeData.driveLink);
    if (typeData?.responsePath && !responsePath) setResponsePath(typeData.responsePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeData]);

  if (isLoading || !request) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  const canFulfillThis = canFulfill(user?.roles ?? [], request.requestType);
  const isSocialMediaHeadline = request.requestType === CREATIVE_REQUEST_TYPE.SocialMediaHeadline;
  const needsResponsePath = RESPONSE_PATH_TYPES.includes(request.requestType);
  const needsImageUpload = !isSocialMediaHeadline && !needsResponsePath;
  const canMarkComplete =
    canFulfillThis &&
    (request.status === CREATIVE_REQUEST_STATUS.Submitted || request.status === CREATIVE_REQUEST_STATUS.NeedsRevision);
  const canApproveOrUnapprove =
    perms.canApproveSocialMedia && isSocialMediaHeadline && request.status === CREATIVE_REQUEST_STATUS.Completed;

  // Which department originated it, and which Creative sub-team it's routed to — both
  // derivable from the request type without any extra data.
  const departmentLabel = isSocialMediaHeadline ? 'Social Media' : 'News & Programs';
  const teamShortLabel = GRAPHICS_TEAM_REQUEST_TYPES.includes(request.requestType) ? 'Graphics' : 'Motion Graphics';

  // The single thing the requester is actually waiting on — surfaced in a prominent callout
  // at the top of the page instead of buried as one more line in the spec list below.
  const deliverable = isSocialMediaHeadline
    ? typeData?.driveLink
      ? { label: 'Drive Link', value: typeData.driveLink as string, icon: Link2, isLink: true,
          tooltip: 'Where the finished graphics were uploaded for Social Media to review.' }
      : null
    : needsResponsePath && typeData?.responsePath
      ? { label: 'Response Path (Share Folder)', value: typeData.responsePath as string, icon: FolderOpen, isLink: false,
          tooltip: 'Where the finished files were saved on the shared folder.' }
      : null;

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  }

  async function handleCompleteSubmit() {
    if (isSocialMediaHeadline && !driveLink.trim()) {
      showToast('A drive link is required to mark this request complete', 'error');
      return;
    }
    if (needsResponsePath && !responsePath.trim()) {
      showToast('A share-folder path is required to mark this request complete', 'error');
      return;
    }
    if (needsImageUpload && request!.attachments.length === 0) {
      showToast('Upload at least one image before marking this request complete', 'error');
      return;
    }

    setCompleting(true);
    try {
      await completeCreativeRequest(requestId, {
        driveLink: isSocialMediaHeadline ? driveLink.trim() : undefined,
        responsePath: needsResponsePath ? responsePath.trim() : undefined,
        comment: completeComment.trim() || undefined,
      });
      showToast('Marked as completed', 'success');
      setCompleteComment('');
    } catch {
      showToast('Could not mark this request complete', 'error');
    } finally {
      setCompleting(false);
    }
  }

  // Both actions are a one-way handoff signal to another department, so the buttons only
  // open a confirmation dialog — the actual API call happens from there (see handleApprove /
  // handleUnapprove below).
  function requestApprove() {
    setConfirmAction('approve');
  }

  function requestUnapprove() {
    if (!approvalNote.trim()) {
      showToast('Add a note explaining what needs to change', 'error');
      return;
    }
    setConfirmAction('unapprove');
  }

  async function handleApprove() {
    setSubmittingApproval('approve');
    try {
      await approveCreativeRequest(requestId, approvalNote.trim() || undefined);
      showToast('Approved', 'success');
      setApprovalNote('');
    } catch {
      showToast('Could not approve this request', 'error');
    } finally {
      setSubmittingApproval(null);
      setConfirmAction(null);
    }
  }

  async function handleUnapprove() {
    setSubmittingApproval('unapprove');
    try {
      await unapproveCreativeRequest(requestId, approvalNote.trim());
      showToast('Sent back for revision', 'success');
      setApprovalNote('');
    } catch {
      showToast('Could not send this back for revision', 'error');
    } finally {
      setSubmittingApproval(null);
      setConfirmAction(null);
    }
  }

  async function handleAttachmentUpload(file: File) {
    setUploading(true);
    try {
      await uploadCreativeAttachment(requestId, file, true);
      queryClient.invalidateQueries({ queryKey });
      showToast('Image uploaded', 'success');
    } catch {
      showToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Button variant="outline" size="icon" onClick={() => navigate('/creative-requests')}>
        <ArrowLeft size={20} />
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {deliverable && (
            <DeliveryCallout
              icon={deliverable.icon}
              label={deliverable.label}
              tooltip={deliverable.tooltip}
              value={deliverable.value}
              isLink={deliverable.isLink}
              onCopy={() => copyToClipboard(deliverable.value)}
            />
          )}

          <Card>
            <CardContent className="pt-6 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`${statusColors[request.status] ?? ''} font-medium`}>{request.status}</Badge>
                  <Badge className={`${priorityColors[request.priority] ?? ''} font-medium`}>
                    {request.priority} priority
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground shrink-0">
                  Air date {format(new Date(request.airDate), 'yyyy-MM-dd')} · {request.airTime?.slice(0, 5)}
                </p>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-card-foreground">{request.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {CREATIVE_REQUEST_TYPE_LABEL[request.requestType] ?? request.requestType} • Created{' '}
                  {formatRelativeTime(request.createdAt)} by {request.createdByName || 'Unknown'}. Routed to{' '}
                  {teamShortLabel}.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatTile label="Air Date" value={format(new Date(request.airDate), 'yyyy-MM-dd')} />
                <StatTile label="Air Time" value={request.airTime?.slice(0, 5)} />
                <StatTile label="Priority" value={request.priority} />
                <StatTile label="Requester" value={request.createdByName || '—'} />
                <StatTile label="Department" value={departmentLabel} />
              </div>

              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-sm font-semibold text-card-foreground pt-4">Request Specification</p>
                <TypeSpecificDetails requestType={request.requestType} program={request.program} data={typeData} />
              </div>
            </CardContent>
          </Card>

          {request.attachments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Image Library</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {request.attachments.map((a) => (
                    <ImageThumb
                      key={a.id}
                      label={a.imageCode ?? undefined}
                      file={{ url: a.fileUrl, name: a.fileName, sizeBytes: a.fileSizeBytes, contentType: a.contentType ?? undefined }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {canMarkComplete && (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Complete Request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isSocialMediaHeadline && (
                  <div className="space-y-1.5">
                    <Label htmlFor="drive-link">Drive Link</Label>
                    <Input
                      id="drive-link"
                      placeholder="https://drive.google.com/…"
                      value={driveLink}
                      onChange={(e) => setDriveLink(e.target.value)}
                    />
                  </div>
                )}
                {needsResponsePath && (
                  <div className="space-y-1.5">
                    <Label htmlFor="response-path">Response Path (share folder)</Label>
                    <Input
                      id="response-path"
                      placeholder="\\share\folder\…"
                      value={responsePath}
                      onChange={(e) => setResponsePath(e.target.value)}
                    />
                  </div>
                )}
                {needsImageUpload && (
                  <div className="space-y-1.5">
                    <Label>Upload Image (ingests into Image Library)</Label>
                    <label className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted">
                      {uploading ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAttachmentUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {request.attachments.length === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Upload at least one image before marking this request complete.
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="complete-comment">Comment (optional)</Label>
                  <Textarea
                    id="complete-comment"
                    rows={2}
                    value={completeComment}
                    onChange={(e) => setCompleteComment(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={handleCompleteSubmit} disabled={completing}>
                  {completing ? 'Saving…' : 'Mark Complete'}
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Audit Log</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">Every handoff decision, in sequence</p>
              </div>
              <Activity className="h-5 w-5 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent>
              {transitions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No activity yet</div>
              ) : (
                <div className="divide-y divide-border">
                  {transitions.map((t) => {
                    const changedAt = new Date(t.changedAt);
                    return (
                      <div key={t.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-card-foreground">
                            {describeTransition(t, teamShortLabel)}
                          </p>
                          {t.comment && <p className="mt-0.5 text-sm text-muted-foreground">{t.comment}</p>}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {changedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ·{' '}
                            {changedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                            {t.changedByName || 'System'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {canApproveOrUnapprove && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Handoff Actions</CardTitle>
                <p className="text-sm text-muted-foreground">Available actions depend on your role.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="approval-note">Approval / Change Note</Label>
                  <Textarea
                    id="approval-note"
                    placeholder="If requesting changes, tell the designer what to revise."
                    rows={3}
                    value={approvalNote}
                    onChange={(e) => setApprovalNote(e.target.value)}
                    disabled={submittingApproval !== null}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button className="w-full" onClick={requestApprove} disabled={submittingApproval !== null}>
                    <Check className="h-4 w-4 mr-2" />
                    {submittingApproval === 'approve' ? 'Approving…' : 'Approve Design'}
                  </Button>
                  <Button className="w-full" variant="outline" onClick={requestUnapprove} disabled={submittingApproval !== null}>
                    {submittingApproval === 'unapprove' ? 'Sending…' : 'Request Changes with Note'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <CreativeCommentThread requestId={requestId} />
        </div>
      </div>

      <AlertDialog open={confirmAction === 'approve'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this design?</AlertDialogTitle>
            <AlertDialogDescription>
              This marks the request as approved and ready to air. This can't be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingApproval !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={submittingApproval !== null}>
              {submittingApproval === 'approve' ? 'Approving…' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmAction === 'unapprove'} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request changes?</AlertDialogTitle>
            <AlertDialogDescription>
              This sends the request back to {teamShortLabel} Team with your note, and they'll need to resubmit it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submittingApproval !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnapprove} disabled={submittingApproval !== null}>
              {submittingApproval === 'unapprove' ? 'Sending…' : 'Request Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// The prominent "here's the actual deliverable" banner — mirrors
// booking_workflow/components/RequestDetail.tsx's "Avid MediaCentral Path" callout, so a
// finished Drive Link or Response Path reads as the headline fact of the page, not one more
// line buried in the spec list below.
function DeliveryCallout({
  icon: Icon,
  label,
  tooltip,
  value,
  isLink,
  onCopy,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  value: string;
  isLink: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 tracking-wide mb-2">
        <Icon className="h-4 w-4" />
        {label}
        <span title={tooltip} className="cursor-help">
          <Info className="h-3.5 w-3.5 text-blue-400" />
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
          {isLink ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {value}
            </a>
          ) : (
            value
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onCopy} className="h-8 px-2 shrink-0" title="Copy">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-card-foreground">{value || '—'}</div>
    </div>
  );
}

function TypeSpecificDetails({
  requestType,
  program,
  data,
}: {
  requestType: string;
  program?: string | null;
  data: Record<string, unknown> | null;
}) {
  if (!data) return <p className="text-sm text-muted-foreground">No additional details.</p>;

  switch (requestType) {
    case CREATIVE_REQUEST_TYPE.SocialMediaHeadline: {
      const d = data as unknown as SocialMediaHeadlineData;
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <SpecRow label="Kind" value={d.requestKind} />
            {d.requestKind === 'EventPackage' && (
              <>
                <SpecRow label="Event Name" value={d.eventName} />
                <SpecRow label="Package" value={d.packageItems?.join(' / ')} />
              </>
            )}
            {d.requestKind === 'DailyRequest' && (
              <>
                <SpecRow label="Event Name" value={d.dailyEventName} />
                <SpecRow label="Subtype" value={d.selectType} />
                {d.selectType === 'Headline' && <SpecRow label="Headline Title" value={d.title} emphasis />}
                {d.selectType === 'Carrousel' && <SpecRow label="Platform" value={d.platform} />}
              </>
            )}
          </div>
          {d.requestKind === 'EventPackage' && d.eventLogo && <ImageThumb label="Event Logo" file={d.eventLogo} />}
          {d.requestKind === 'DailyRequest' && d.selectType === 'Headline' && d.backgroundImage && (
            <ImageThumb label="Background Image" file={d.backgroundImage} />
          )}
          {d.requestKind === 'DailyRequest' && d.selectType === 'Carrousel' && d.sections && d.sections.length > 0 && (
            <SubsectionList>
              {d.sections.map((s, i) => (
                <Subsection key={i} index={i} title={s.title}>
                  <div className="flex flex-wrap gap-3">
                    {s.backgroundImage && <ImageThumb label="Background" file={s.backgroundImage} />}
                    {s.icons?.map((icon, j) => <ImageThumb key={j} label="Icon" file={icon} />)}
                  </div>
                </Subsection>
              ))}
            </SubsectionList>
          )}
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.NewsHeadline: {
      const d = data as unknown as NewsHeadlineData;
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <SpecRow label="Screen" value={d.screen} />
            <SpecRow label="Headline Text" value={d.headlineText} emphasis />
          </div>
          {d.referenceImage && <ImageThumb label="Reference Image" file={d.referenceImage} />}
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.ProgramVideoWall: {
      const d = data as unknown as ProgramVideoWallData;
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            {program && <SpecRow label="Program" value={program} />}
            <SpecRow label="Screen" value={d.screen} />
          </div>
          {d.topics && d.topics.length > 0 && (
            <SubsectionList label="Topics">
              {d.topics.map((t, i) => (
                <Subsection key={i} index={i} title={t.type === 'FullScreenGraphic' ? 'Full Screen Graphic' : 'Viz Template Graphic'}>
                  <div className="space-y-1 mb-2">
                    {t.text && <SpecRow label="Text" value={t.text} />}
                    {t.vizTemplateName && <SpecRow label="Viz Template" value={t.vizTemplateName} />}
                  </div>
                  {t.image && <ImageThumb label="Image" file={t.image} />}
                </Subsection>
              ))}
            </SubsectionList>
          )}
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.VideoWallPresentation: {
      const d = data as unknown as VideoWallPresentationData;
      return (
        <div className="space-y-1.5">
          <SpecRow label="Title" value={d.title} />
          <SpecRow label="Show Name" value={program} />
          <SpecRow label="Screen" value={d.screen} />
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.Filler: {
      const d = data as unknown as FillerData;
      return (
        <div className="space-y-3">
          {d.sections && d.sections.length > 0 && (
            <SubsectionList>
              {d.sections.map((s, i) => (
                <Subsection key={i} index={i} title={s.title}>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </Subsection>
              ))}
            </SubsectionList>
          )}
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.LowerThird: {
      const d = data as unknown as LowerThirdData;
      return (
        <div className="space-y-3">
          {program && (
            <div className="space-y-1.5">
              <SpecRow label="Program" value={program} />
            </div>
          )}
          {d.sections && d.sections.length > 0 && (
            <SubsectionList>
              {d.sections.map((s, i) => (
                <Subsection key={i} index={i} title={s.personName}>
                  <p className="text-sm text-muted-foreground">{s.personJobTitle}</p>
                </Subsection>
              ))}
            </SubsectionList>
          )}
        </div>
      );
    }
    case CREATIVE_REQUEST_TYPE.SpecialRequest: {
      const d = data as unknown as SpecialRequestData;
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <SpecRow label="Description" value={d.description} emphasis />
          </div>
          {d.images && d.images.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {d.images.map((img, i) => <ImageThumb key={i} label="Image" file={img} />)}
            </div>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

// Flat "Label: value" row — matches the compact specification-list style, used for simple
// text fields. Images use ImageThumb instead so the actual file stays visible, not just a
// filename link.
function SpecRow({
  label,
  value,
  link,
  emphasis,
}: {
  label: string;
  value?: string | null;
  link?: boolean;
  // Marks fields that ARE the actual creative content (headline text, description) rather
  // than structural metadata — rendered bold so the team can't miss what's being asked for.
  emphasis?: boolean;
}) {
  if (!value) return null;
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold text-card-foreground">{label}:</span>{' '}
      {link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
          {value}
        </a>
      ) : (
        <span className={emphasis ? 'font-semibold text-card-foreground' : 'text-card-foreground'}>{value}</span>
      )}
    </p>
  );
}

// Groups repeatable sub-items (Carrousel sections, Video Wall topics, Filler/Lower Third
// sections) under a shared caption, each rendered as its own numbered card.
function SubsectionList({ label = 'Sections', children }: { label?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Subsection({ index, title, children }: { index: number; title?: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
          {index + 1}
        </span>
        <p className="text-sm font-medium text-card-foreground">{title || `Item ${index + 1}`}</p>
      </div>
      {children}
    </div>
  );
}

// Shows an uploaded image's thumbnail, name and size — the file is stored and served
// byte-for-byte as uploaded (no re-encoding), so this is exactly what was sent.
function ImageThumb({ label, file }: { label?: string; file: UploadedFileRef }) {
  const isImage = file.contentType?.startsWith('image/') ?? /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg border border-border p-2.5 transition-colors hover:border-primary/40 hover:bg-muted/50"
    >
      {isImage ? (
        <img src={file.url} alt={file.name} className="h-14 w-14 shrink-0 rounded-md object-cover bg-muted shadow-sm" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <FileText className="h-5 w-5" />
        </div>
      )}
      <div className="min-w-0">
        {label && <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>}
        <p
          className="truncate text-sm font-medium text-card-foreground max-w-[160px] group-hover:text-primary"
          title={file.name}
        >
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
      </div>
    </a>
  );
}
