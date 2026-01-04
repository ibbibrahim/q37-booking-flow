import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Edit, Trash2 } from 'lucide-react';
import type { StudioBooking } from '../types/booking';
import { formatTime, calculateDuration } from '../utils/timeUtils';

interface BookingListProps {
  bookings: StudioBooking[];
  onEdit: (booking: StudioBooking) => void;
  onDelete: (booking: StudioBooking) => void;
  onRowClick: (booking: StudioBooking) => void;
  selectedBookingId?: number;
}

export const BookingList: React.FC<BookingListProps> = ({
  bookings,
  onEdit,
  onDelete,
  onRowClick,
  selectedBookingId
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookings = bookings.filter(booking => {
    const searchLower = searchTerm.toLowerCase();
    return (
      booking.title.toLowerCase().includes(searchLower) ||
      booking.code.toLowerCase().includes(searchLower) ||
      booking.studioType.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Bookings List</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by title or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-[150px]">Studio</TableHead>
                <TableHead className="w-[100px]">Start</TableHead>
                <TableHead className="w-[100px]">End</TableHead>
                <TableHead className="w-[100px]">Duration</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No bookings found matching your search' : 'No bookings yet'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className={`cursor-pointer transition-colors ${
                      selectedBookingId === booking.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onRowClick(booking)}
                  >
                    <TableCell>
                      <Badge variant="outline">{booking.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{booking.title}</TableCell>
                    <TableCell>
                      <Badge variant={booking.studioType === 'Studio News' ? 'default' : 'secondary'}>
                        {booking.studioType}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTime(booking.startDateTime)}</TableCell>
                    <TableCell>{formatTime(booking.endDateTime)}</TableCell>
                    <TableCell>
                      {calculateDuration(booking.startDateTime, booking.endDateTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(booking);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(booking);
                          }}
                          className="text-red-600 hover:text-red-800 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
