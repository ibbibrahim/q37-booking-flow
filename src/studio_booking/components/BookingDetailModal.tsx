import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, Edit, Trash2 } from 'lucide-react';
import type { StudioBooking } from '../types/booking';
import { formatDateTime, calculateDuration } from '../utils/timeUtils';

interface BookingDetailModalProps {
  booking: StudioBooking | null;
  open: boolean;
  onClose: () => void;
  onEdit: (booking: StudioBooking) => void;
  onDelete: (booking: StudioBooking) => void;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  open,
  onClose,
  onEdit,
  onDelete
}) => {
  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">{booking.title}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{booking.code}</Badge>
            <Badge variant={booking.studioType === 'Studio News' ? 'default' : 'outline'}>
              {booking.studioType}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Start Date & Time</div>
                  <div className="text-sm text-muted-foreground">{formatDateTime(booking.startDateTime)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">End Date & Time</div>
                  <div className="text-sm text-muted-foreground">{formatDateTime(booking.endDateTime)}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Duration</div>
                  <div className="text-sm text-muted-foreground">
                    {calculateDuration(booking.startDateTime, booking.endDateTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="text-sm font-medium">Created By</div>
                  <div className="text-sm text-muted-foreground">{booking.createdBy}</div>
                </div>
              </div>
            </div>
          </div>

          {booking.notes && (
            <div className="flex items-start gap-3 pt-2 border-t">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">Notes</div>
                <div className="text-sm text-muted-foreground">{booking.notes}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              onEdit(booking);
              onClose();
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onDelete(booking);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
