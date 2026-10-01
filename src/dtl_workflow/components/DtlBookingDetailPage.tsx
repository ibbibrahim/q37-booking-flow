import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, FileText, Pencil, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { appendDtlBookingLog, getDtlBooking, getDtlGuest, updateDtlBookingStatus } from '../services/dtlApi';
import { formatDtlTimeShort, readDtlLogs } from '../services/dtlHistory';
import { formatQatarDateOnly, formatQatarTimeOnly, nowInQatar, QATAR_TIME_LABEL } from '../services/dtlTime';
import { useDtlRole, useDtlPermissions } from '../hooks/useDtlRole';
import { useDtlBookingChanged } from '../hooks/useDtlBookingChanged';
import { DTL_BOOKING_STATUS, DTL_TERMINAL_STATUSES, type DtlBooking, type DtlGuest } from '../types/dtl';
import { DtlLinkField } from './DtlLinkField';
import { DtlReasonPromptModal } from './DtlReasonPromptModal';
import { CreateDtlBookingModal } from './CreateDtlBookingModal';

const statusColors: Record<string, string> = {
  created: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-transparent',
  Completed: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-transparent',
  Cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-transparent',
};

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      <div className="text-sm text-card-foreground break-words">{value || '—'}</div>
    </div>
  );
}

export function DtlBookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { displayName } = useDtlRole();
  const perms = useDtlPermissions();

  const [booking, setBooking] = useState<DtlBooking | null>(null);
  const [guest, setGuest] = useState<DtlGuest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'cancel' | 'complete' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getDtlBooking(id)
      .then((b) => {
        if (cancelled) return;
        setBooking(b);
        setLoadError(null);
        return b.guestId ? getDtlGuest(b.guestId) : null;
      })
      .then((g) => {
        if (cancelled || !g) return;
        setGuest(g);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('Booking not found.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useDtlBookingChanged((updated) => {
    if (updated.id !== id) return;
    setBooking(updated);
    if (updated.guestId && updated.guestId !== guest?.id) {
      getDtlGuest(updated.guestId).then(setGuest).catch(() => {});
    } else if (!updated.guestId) {
      setGuest(null);
    }
  });

  const isTerminal = booking ? DTL_TERMINAL_STATUSES.includes(booking.status) : false;

  async function performCancel(reason: string) {
    if (!booking) return;
    const text = reason ? `${displayName}: Cancelled the booking — ${reason}` : `${displayName}: Cancelled the booking`;
    const updated = await updateDtlBookingStatus(booking.id, DTL_BOOKING_STATUS.Cancelled, text);
    setBooking(updated);
    setPendingAction(null);
  }

  async function performComplete(reason: string) {
    if (!booking) return;
    const text = reason
      ? `${displayName}: Marked as completed — ${reason}`
      : `${displayName}: Marked as completed`;
    const updated = await updateDtlBookingStatus(booking.id, DTL_BOOKING_STATUS.Completed, text);
    setBooking(updated);
    setPendingAction(null);
  }

  function handleLinkUpdated(updated: DtlBooking) {
    setBooking(updated);
  }

  function handleEdited(updated: DtlBooking) {
    setBooking(updated);
    if (updated.guestId && updated.guestId !== guest?.id) {
      getDtlGuest(updated.guestId).then(setGuest).catch(() => {});
    }
  }

  async function handleWhatsAppSent() {
    if (!booking) return;
    const text = `${displayName}: Sent WhatsApp link at ${nowInQatar()} (Qatar time)`;
    try {
      const updated = await appendDtlBookingLog(booking.id, text);
      setBooking(updated);
    } catch {
      // Non-critical: the message already opened; only the log failed.
    }
  }

  async function handleAddNote() {
    if (!booking || !noteText.trim()) return;
    setAddingNote(true);
    setNoteError(null);
    try {
      const text = `${displayName}: ${noteText.trim()}`;
      const updated = await appendDtlBookingLog(booking.id, text);
      setBooking(updated);
      setNoteText('');
    } catch {
      setNoteError('Could not add the note.');
    } finally {
      setAddingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div>
        <p className="text-sm text-destructive">{loadError || 'Booking not found.'}</p>
        <Button variant="link" className="mt-2 px-0" onClick={() => navigate('/dtl-booking')}>
          ← Back to bookings
        </Button>
      </div>
    );
  }

  const logs = readDtlLogs(booking);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/dtl-booking')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{booking.programName || 'Untitled booking'}</h1>
            <Badge className={statusColors[booking.status] ?? ''}>{booking.status || 'Unknown'}</Badge>
          </div>
          <span className="font-mono text-xs text-muted-foreground">{booking.id}</span>
        </div>

        <div className="flex gap-2">
          {perms.canEditBooking && booking.status === DTL_BOOKING_STATUS.Created && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit booking
            </Button>
          )}
          {perms.canCancel && !isTerminal && (
            <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setPendingAction('cancel')}>
              Cancel booking
            </Button>
          )}
          {perms.canComplete && !isTerminal && (
            <Button onClick={() => setPendingAction('complete')}>Mark as completed</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText size={20} />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailField label="Program / segment" value={booking.programName} />
                <DetailField label="Location" value={booking.location} />
                <DetailField
                  label="Time"
                  value={booking.time ? `${formatDtlTimeShort(booking.time)} — ${QATAR_TIME_LABEL}` : null}
                />
                <DetailField
                  label="Duration"
                  value={booking.durationMinutes != null ? `${booking.durationMinutes} min` : null}
                />
                <DetailField label="Created by" value={booking.createdBy} />
                {perms.canViewSentBy && <DetailField label="Sent by" value={booking.sentBy} />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Booking Link</CardTitle>
            </CardHeader>
            <CardContent>
              <DtlLinkField
                booking={booking}
                guest={guest}
                canEdit={perms.canEditLink}
                onUpdated={handleLinkUpdated}
                onWhatsAppSent={handleWhatsAppSent}
              />
            </CardContent>
          </Card>

          {perms.canViewHistory && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 size={20} />
                  Activity Log
                </CardTitle>
                <p className="text-xs text-muted-foreground">Times shown in {QATAR_TIME_LABEL}</p>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No activity recorded yet.</div>
                ) : (
                  <div className="space-y-3">
                    {logs.map((h, idx) => {
                      const at = h.at ? new Date(h.at) : null;
                      return (
                        <div key={idx} className="flex gap-3 text-sm">
                          <div className="w-20 pt-0.5 text-xs text-muted-foreground text-right">
                            {at && (
                              <>
                                <div className="font-medium">
                                  {formatQatarTimeOnly(at)}
                                </div>
                                <div className="text-[11px] text-muted-foreground/80">
                                  {formatQatarDateOnly(at)}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="mt-1 h-2 w-2 rounded-full border border-blue-500 bg-background" />
                            {idx < logs.length - 1 && <span className="flex-1 w-px bg-border" />}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="text-sm font-semibold text-card-foreground">{h.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {perms.canAddLog && (
                  <div className="mt-4 border-t border-border pt-4">
                    <div className="flex gap-2">
                      <Input
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNote();
                          }
                        }}
                        placeholder="Add a note…"
                      />
                      <Button
                        type="button"
                        onClick={handleAddNote}
                        disabled={addingNote || !noteText.trim()}
                        className="shrink-0"
                      >
                        {addingNote ? 'Adding…' : 'Add'}
                      </Button>
                    </div>
                    {noteError && <p className="mt-1 text-sm text-destructive">{noteError}</p>}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon size={20} />
                Guest
              </CardTitle>
            </CardHeader>
            <CardContent>
              {guest ? (
                <div className="space-y-4">
                  <DetailField label="Name" value={guest.name} />
                  <DetailField label="Email" value={guest.email} />
                  <DetailField label="Phone" value={guest.phone} />
                  <DetailField label="WhatsApp" value={guest.whatsapp} />
                  <DetailField label="Company" value={guest.company} />
                  <DetailField label="Country" value={guest.country} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No guest linked.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {editing && (
        <CreateDtlBookingModal
          open
          booking={booking}
          guest={guest}
          onClose={() => setEditing(false)}
          onCreated={handleEdited}
        />
      )}
      <DtlReasonPromptModal
        open={pendingAction === 'cancel'}
        title="Cancel this booking?"
        confirmLabel="Cancel booking"
        confirmVariant="destructive"
        onConfirm={performCancel}
        onClose={() => setPendingAction(null)}
      />
      <DtlReasonPromptModal
        open={pendingAction === 'complete'}
        title="Mark this booking as completed?"
        confirmLabel="Mark as completed"
        onConfirm={performComplete}
        onClose={() => setPendingAction(null)}
      />
    </div>
  );
}
