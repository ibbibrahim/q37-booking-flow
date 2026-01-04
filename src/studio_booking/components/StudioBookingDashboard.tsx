import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioTimeline } from './StudioTimeline';
import { BookingList } from './BookingList';
import { BookingFormModal, type BookingFormData } from './BookingFormModal';
import { BookingDetailModal } from './BookingDetailModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { bookingService } from '../services/bookingService';
import type { StudioBooking } from '../types/booking';
import { useToast } from '@/components/ui/use-toast';

export const StudioBookingDashboard: React.FC = () => {
  const [bookings, setBookings] = useState<StudioBooking[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | undefined>();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<StudioBooking | null>(null);
  const [bookingToView, setBookingToView] = useState<StudioBooking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<StudioBooking | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = () => {
    const data = bookingService.getAll();
    setBookings(data);
  };

  const handleCreateNew = () => {
    setEditingBooking(null);
    setFormModalOpen(true);
  };

  const handleEdit = (booking: StudioBooking) => {
    setEditingBooking(booking);
    setFormModalOpen(true);
  };

  const handleSave = (data: BookingFormData) => {
    if (editingBooking) {
      const result = bookingService.update(editingBooking.id, data);
      if (result.success) {
        loadBookings();
        setFormModalOpen(false);
        setEditingBooking(null);
        toast({
          title: 'Booking Updated',
          description: `"${data.title}" has been updated successfully.`,
        });
      } else {
        toast({
          title: 'Update Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    } else {
      const result = bookingService.create(data);
      if (result.success) {
        loadBookings();
        setFormModalOpen(false);
        toast({
          title: 'Booking Created',
          description: `"${data.title}" has been created successfully.`,
        });
      } else {
        toast({
          title: 'Creation Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    }
  };

  const handleDeleteClick = (booking: StudioBooking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (bookingToDelete) {
      const result = bookingService.remove(bookingToDelete.id);
      if (result.success) {
        loadBookings();
        setDeleteDialogOpen(false);
        setBookingToDelete(null);
        if (selectedBookingId === bookingToDelete.id) {
          setSelectedBookingId(undefined);
        }
        toast({
          title: 'Booking Deleted',
          description: `"${bookingToDelete.title}" has been deleted.`,
        });
      } else {
        toast({
          title: 'Deletion Failed',
          description: result.error,
          variant: 'destructive',
        });
      }
    }
  };

  const handleBookingClick = (booking: StudioBooking) => {
    setBookingToView(booking);
    setDetailModalOpen(true);
    setSelectedBookingId(booking.id);
  };

  const handleRowClick = (booking: StudioBooking) => {
    setSelectedBookingId(booking.id);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Studio Timeline</h1>
            <p className="text-muted-foreground mt-1">Manage studio bookings and schedules</p>
          </div>
          <Button onClick={handleCreateNew} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create Booking
          </Button>
        </div>

        <StudioTimeline
          bookings={bookings}
          onBookingClick={handleBookingClick}
          selectedBookingId={selectedBookingId}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
        />

        <BookingList
          bookings={bookings}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onRowClick={handleRowClick}
          selectedBookingId={selectedBookingId}
        />

        <BookingFormModal
          open={formModalOpen}
          onClose={() => {
            setFormModalOpen(false);
            setEditingBooking(null);
          }}
          onSave={handleSave}
          editingBooking={editingBooking}
        />

        <BookingDetailModal
          booking={bookingToView}
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setBookingToView(null);
          }}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onClose={() => {
            setDeleteDialogOpen(false);
            setBookingToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          booking={bookingToDelete}
        />
      </div>
    </div>
  );
};
