import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { motion } from 'motion/react';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellRing,
  CheckCircle2,
  Lock,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Radio,
  RotateCcw,
  Trash2,
  UserCheck,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { bitTicketApi } from '@/api/bitTicketApi';
import { bitIncidentApi } from '@/api/bitIncidentApi';
import { getApiErrorMessage } from '@/api/bitChecklistApi';
import { useAuth } from '@/contexts/AuthContext';
import { usePageHeader } from '@/contexts/PageHeaderContext';
import { useToast } from '@/contexts/ToastContext';
import { IncidentBanner } from '../components/IncidentBanner';
import { TicketActivity } from '../components/TicketActivity';
import { TicketAttachmentGallery } from '../components/TicketAttachmentGallery';
import { TicketFormDialog } from '../components/TicketFormDialog';
import { TicketPriorityBadge } from '../components/TicketPriorityBadge';
import { TicketResolveDialog } from '../components/TicketResolveDialog';
import { TicketSidePanel } from '../components/TicketSidePanel';
import { TicketStatusBadge } from '../components/TicketStatusBadge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useBitTicketChanged } from '../hooks/useBitTicketChanged';
import { useNow } from '../hooks/useNow';
import { CATEGORY_LABELS } from '../utils/ticketUtils';
import type { BitTicketDetail, TicketPriority, TicketStatus } from '../types/ticket';
import { ENG_PATHS, incidentReportPath } from '../utils/engineeringPaths';

interface TicketAction {
  fn: () => Promise<unknown>;
  success: string;
  failure: string;
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function BITTicketDetailPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const id = Number(idParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showToast } = useToast();
  const now = useNow();

  const [editOpen, setEditOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [onAirDialog, setOnAirDialog] = useState<'mark' | 'remove' | null>(null);
  const [downloading, setDownloading] = useState(false);

  const {
    data: ticket,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['bit-ticket', id],
    queryFn: () => bitTicketApi.get(id),
    enabled: Number.isFinite(id),
  });
  const { data: assignees = [] } = useQuery({ queryKey: ['bit-ticket-assignees'], queryFn: bitTicketApi.assignees });

  usePageHeader(ticket ? ticket.ticketNo : 'Ticket', ticket ? ticket.title : 'Loading…');

  useBitTicketChanged((t) => {
    void queryClient.invalidateQueries({ queryKey: ['bit-tickets'] });
    void queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['bit-ticket', t.id] });
    void queryClient.invalidateQueries({ queryKey: ['bit-incident-register'] });
  });

  const action = useMutation({
    mutationFn: (a: TicketAction) => a.fn(),
    onSuccess: async (_data, a) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bit-ticket', id] }),
        queryClient.invalidateQueries({ queryKey: ['bit-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] }),
      ]);
      showToast(a.success, 'success');
    },
    onError: (err, a) => showToast(getApiErrorMessage(err, a.failure), 'error'),
  });

  const isAdmin = user?.roles?.includes('Admin') ?? false;
  const busy = action.isPending;

  function setStatus(status: TicketStatus, success: string, resolutionSummary?: string) {
    action.mutate({
      fn: () => bitTicketApi.setStatus(id, { status, resolutionSummary }),
      success,
      failure: 'Could not change status',
    });
  }

  function handleStatusSelect(status: TicketStatus) {
    if (status === 'resolved') setResolveOpen(true);
    else setStatus(status, `Status changed to ${status.replace('_', ' ')}`);
  }

  function assign(userId: number | null) {
    action.mutate({
      fn: () => bitTicketApi.assign(id, userId),
      success: userId === null ? 'Ticket unassigned' : userId === user?.id ? 'Assigned to you' : 'Assignee updated',
      failure: 'Could not assign ticket',
    });
  }

  function changePriority(t: BitTicketDetail, priority: TicketPriority) {
    action.mutate({
      fn: () =>
        bitTicketApi.update(id, {
          title: t.title,
          description: t.description,
          category: t.category,
          priority,
          affectedSystem: t.affectedSystem,
          vendorId: t.vendorId,
          vendorCaseRef: t.vendorCaseRef,
        }),
      success: 'Priority updated',
      failure: 'Could not update priority',
    });
  }

  function toggleFollow(t: BitTicketDetail) {
    action.mutate({
      fn: () => (t.isFollowing ? bitTicketApi.unfollow(id) : bitTicketApi.follow(id)),
      success: t.isFollowing ? 'You unfollowed this ticket' : 'You are now following this ticket',
      failure: 'Could not update follow state',
    });
  }

  function setOnAir(on: boolean) {
    action.mutate(
      {
        fn: () => bitTicketApi.setOnAir(id, { onAirImpact: on, incidentStartedAt: on ? new Date().toISOString() : null }),
        success: on ? 'Marked as an on-air incident. Management was notified.' : 'On-air flag removed',
        failure: 'Could not update on-air flag',
      },
      { onSuccess: () => setOnAirDialog(null) }
    );
  }

  async function downloadReportPdf(t: BitTicketDetail) {
    setDownloading(true);
    try {
      await bitIncidentApi.downloadPdf(t.id, t.reportNo ?? t.ticketNo);
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Could not download the PDF'), 'error');
    } finally {
      setDownloading(false);
    }
  }

  const remove = useMutation({
    mutationFn: () => bitTicketApi.remove(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bit-tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['bit-ticket-summary'] }),
      ]);
      showToast('Ticket deleted', 'success');
      navigate(ENG_PATHS.tickets);
    },
    onError: (err) => showToast(getApiErrorMessage(err, 'Could not delete ticket'), 'error'),
  });

  if (isLoading) return <DetailSkeleton />;

  if (error || !ticket) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <Card className="rounded-xl">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle size={28} className="text-destructive" />
          <p className="text-sm text-muted-foreground">
            {notFound ? 'This ticket does not exist or was deleted.' : getApiErrorMessage(error, 'Failed to load ticket.')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(ENG_PATHS.tickets)}>
              <ArrowLeft />
              Back to tickets
            </Button>
            {!notFound && <Button onClick={() => refetch()}>Retry</Button>}
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = ticket.status;
  const open = status === 'new' || status === 'in_progress' || status === 'on_hold';
  const assignedToMe = ticket.assigneeUserId === user?.id;
  const finished = status === 'resolved' || status === 'closed';
  const closeBlocked = ticket.onAirImpact && ticket.reportState !== 'submitted';
  const canRemoveOnAir = ticket.onAirImpact && ticket.reportState !== 'submitted';
  const followerStack = ticket.followers.slice(0, 5);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-5">
        {ticket.onAirImpact && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <IncidentBanner
              ticket={ticket}
              now={now}
              downloading={downloading}
              onOpenReport={() => navigate(incidentReportPath(id))}
              onDownloadPdf={() => void downloadReportPdf(ticket)}
            />
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => navigate(ENG_PATHS.tickets)}
              >
                <ArrowLeft />
                Back
              </Button>
              <div className="flex items-center gap-3">
                {followerStack.length > 0 && (
                  <div className="flex -space-x-2">
                    {followerStack.map((f) => (
                      <UserAvatar key={f.userId} name={f.userName} tooltip className="ring-2 ring-card" />
                    ))}
                    {ticket.followers.length > followerStack.length && (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold tabular-nums text-muted-foreground ring-2 ring-card">
                        +{ticket.followers.length - followerStack.length}
                      </span>
                    )}
                  </div>
                )}
                <Button variant="outline" size="sm" disabled={busy} onClick={() => toggleFollow(ticket)}>
                  {ticket.isFollowing ? <BellRing /> : <Bell />}
                  {ticket.isFollowing ? 'Following' : 'Follow'}
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm tabular-nums text-muted-foreground">{ticket.ticketNo}</span>
                <TicketStatusBadge status={status} />
                <TicketPriorityBadge priority={ticket.priority} />
                <span className="text-xs text-muted-foreground">{CATEGORY_LABELS[ticket.category]}</span>
              </div>
              <h2 className="break-words text-xl font-semibold text-card-foreground">{ticket.title}</h2>
              <p className="text-sm text-muted-foreground">
                Raised by {ticket.createdByName} ·{' '}
                {formatDistanceToNowStrict(new Date(ticket.createdAt), { addSuffix: true })}
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {(status === 'new' || status === 'in_progress' || status === 'on_hold') && !assignedToMe && (
                <Button size="sm" disabled={busy} onClick={() => assign(user?.id ?? null)}>
                  <UserCheck />
                  {ticket.assigneeUserId ? 'Assign to me' : 'Pick up'}
                </Button>
              )}
              {(status === 'new' || status === 'on_hold') && (
                <Button
                  size="sm"
                  variant={assignedToMe || ticket.assigneeUserId ? 'default' : 'outline'}
                  disabled={busy}
                  onClick={() => setStatus('in_progress', 'Work started')}
                >
                  <Play />
                  {status === 'on_hold' ? 'Resume work' : 'Start work'}
                </Button>
              )}
              {(status === 'new' || status === 'in_progress') && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('on_hold', 'Ticket put on hold')}>
                  <Pause />
                  Put on hold
                </Button>
              )}
              {open && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setResolveOpen(true)}>
                  <CheckCircle2 />
                  Resolve
                </Button>
              )}
              {status === 'resolved' &&
                (closeBlocked ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} className="inline-flex">
                          <Button size="sm" disabled aria-label="Close (submit the incident report first)">
                            <Lock />
                            Close
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Submit the incident report before closing</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <Button size="sm" disabled={busy} onClick={() => setStatus('closed', 'Ticket closed')}>
                    <Lock />
                    Close
                  </Button>
                ))}
              {finished && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('in_progress', 'Ticket reopened')}>
                  <RotateCcw />
                  Reopen
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit
                </Button>
                {(!ticket.onAirImpact || canRemoveOnAir) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" aria-label="More actions">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {ticket.onAirImpact ? (
                        <DropdownMenuItem onSelect={() => setOnAirDialog('remove')}>
                          <Radio />
                          Remove on-air flag
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onSelect={() => setOnAirDialog('mark')}>
                          <Radio />
                          Mark as on-air incident
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {finished && ticket.resolutionSummary && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.04 }}>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="mb-1 inline-flex items-center gap-1.5 text-sm font-semibold text-success">
                <CheckCircle2 size={15} />
                Resolution
              </p>
              <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{ticket.resolutionSummary}</p>
            </div>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.08 }}>
          <Card className="rounded-xl p-5">
            <h2 className="mb-2 text-base font-semibold text-card-foreground">Description</h2>
            <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{ticket.description}</p>
            {ticket.attachments.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Attachments <span className="tabular-nums">({ticket.attachments.length})</span>
                </p>
                <TicketAttachmentGallery attachments={ticket.attachments} />
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.12 }}>
          <TicketActivity ticket={ticket} />
        </motion.div>
      </div>

      <motion.aside
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.06 }}
        className="min-w-0"
      >
        <TicketSidePanel
          ticket={ticket}
          now={now}
          assignees={assignees}
          currentUserId={user?.id}
          busy={busy}
          onStatusChange={handleStatusSelect}
          onPriorityChange={(p) => changePriority(ticket, p)}
          onAssign={assign}
          onOpenReport={() => navigate(incidentReportPath(id))}
          onDownloadPdf={() => void downloadReportPdf(ticket)}
          downloading={downloading}
        />
      </motion.aside>

      <TicketFormDialog open={editOpen} onOpenChange={setEditOpen} ticket={ticket} description={ticket.description} />

      <TicketResolveDialog
        open={resolveOpen}
        onOpenChange={setResolveOpen}
        ticketNo={ticket.ticketNo}
        submitting={busy}
        onConfirm={(summary) => {
          action.mutate(
            {
              fn: () => bitTicketApi.setStatus(id, { status: 'resolved', resolutionSummary: summary }),
              success: 'Ticket resolved',
              failure: 'Could not resolve ticket',
            },
            { onSuccess: () => setResolveOpen(false) }
          );
        }}
      />

      <AlertDialog open={onAirDialog !== null} onOpenChange={(o) => !o && !busy && setOnAirDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {onAirDialog === 'remove' ? 'Remove the on-air flag?' : 'Mark as on-air incident?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {onAirDialog === 'remove'
                ? 'This ticket will no longer require an incident report.'
                : 'Management will be emailed immediately and an incident report will be required before this ticket can be closed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={onAirDialog === 'remove' ? undefined : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                setOnAir(onAirDialog === 'mark');
              }}
            >
              {onAirDialog === 'remove' ? 'Remove flag' : 'Mark as on-air'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !o && !remove.isPending && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {ticket.ticketNo}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the ticket and its activity from every list. This can only be undone by a database change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
