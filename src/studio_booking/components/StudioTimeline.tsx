import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { StudioBooking } from '../types/booking';
import { formatTime, calculateDuration, getPositionFromTime, getWidthFromDuration } from '../utils/timeUtils';
import { format } from 'date-fns';

interface StudioTimelineProps {
  bookings: StudioBooking[];
  onBookingClick: (booking: StudioBooking) => void;
  selectedBookingId?: number;
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

const STUDIO_TYPES = ['Studio News', 'Studio Program'];
const START_HOUR = 8;
const END_HOUR = 18;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

const BLOCK_COLORS = [
  'bg-yellow-500 hover:bg-yellow-600',
  'bg-blue-500 hover:bg-blue-600',
  'bg-green-500 hover:bg-green-600',
  'bg-orange-500 hover:bg-orange-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-pink-500 hover:bg-pink-600',
  'bg-cyan-500 hover:bg-cyan-600',
  'bg-indigo-500 hover:bg-indigo-600',
  'bg-red-500 hover:bg-red-600',
  'bg-teal-500 hover:bg-teal-600',
  'bg-lime-500 hover:bg-lime-600',
  'bg-amber-500 hover:bg-amber-600',
  'bg-violet-500 hover:bg-violet-600',
  'bg-fuchsia-500 hover:bg-fuchsia-600',
];

const getColorForBooking = (id: number): string => {
  return BLOCK_COLORS[id % BLOCK_COLORS.length];
};

export const StudioTimeline: React.FC<StudioTimelineProps> = ({
  bookings,
  onBookingClick,
  selectedBookingId,
  currentDate,
  onDateChange
}) => {
  const [hoveredBookingId, setHoveredBookingId] = useState<number | null>(null);

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    onDateChange(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    onDateChange(newDate);
  };

  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.startDateTime);
    return bookingDate.toDateString() === currentDate.toDateString();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Studio Timeline - Day View
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={previousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 bg-primary/10 text-primary rounded-md font-medium min-w-[140px] text-center">
              {format(currentDate, 'MMM d, yyyy')}
            </div>
            <Button variant="outline" size="icon" onClick={nextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[160px_1fr] gap-0">
              <div className="border-r">
                <div className="h-12 border-b font-semibold flex items-center px-4">Studio</div>
                {STUDIO_TYPES.map((studio) => {
                  const studioBookingsCount = todayBookings.filter(b => b.studioType === studio).length;
                  return (
                    <div
                      key={studio}
                      className="h-24 border-b flex flex-col justify-center px-4 bg-muted/30"
                    >
                      <div className="font-medium">{studio}</div>
                      <div className="text-xs text-muted-foreground">{studioBookingsCount} bookings</div>
                    </div>
                  );
                })}
              </div>

              <div className="relative">
                <div className="h-12 border-b flex">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="flex-1 border-l px-2 flex items-center justify-center font-medium text-sm"
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {STUDIO_TYPES.map((studio, studioIndex) => (
                  <div key={studio} className="relative h-24 border-b">
                    <div className="absolute inset-0 flex">
                      {HOURS.map((hour) => (
                        <div key={hour} className="flex-1 border-l" />
                      ))}
                    </div>

                    <div className="absolute inset-0">
                      {todayBookings
                        .filter(booking => booking.studioType === studio)
                        .map(booking => {
                          const left = getPositionFromTime(booking.startDateTime, START_HOUR, END_HOUR);
                          const width = getWidthFromDuration(
                            booking.startDateTime,
                            booking.endDateTime,
                            START_HOUR,
                            END_HOUR
                          );
                          const colorClass = getColorForBooking(booking.id);
                          const isSelected = selectedBookingId === booking.id;

                          return (
                            <Popover key={booking.id}>
                              <PopoverTrigger asChild>
                                <button
                                  className={`absolute top-2 bottom-2 rounded-md text-white text-xs font-medium px-2 py-1 cursor-pointer transition-all ${colorClass} ${
                                    isSelected ? 'ring-2 ring-offset-2 ring-primary' : ''
                                  } overflow-hidden`}
                                  style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                  }}
                                  onClick={() => onBookingClick(booking)}
                                  onMouseEnter={() => setHoveredBookingId(booking.id)}
                                  onMouseLeave={() => setHoveredBookingId(null)}
                                >
                                  <div className="truncate font-semibold">{booking.title}</div>
                                  <div className="text-[10px] opacity-90">
                                    {formatTime(booking.startDateTime)} - {formatTime(booking.endDateTime)}
                                  </div>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80" side="top">
                                <div className="space-y-3">
                                  <div>
                                    <div className="font-semibold text-lg">{booking.title}</div>
                                    <div className="text-sm text-muted-foreground">{booking.code}</div>
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Studio:</span>
                                      <span className="font-medium">{booking.studioType}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Duration:</span>
                                      <span className="font-medium">
                                        {calculateDuration(booking.startDateTime, booking.endDateTime)}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Feed Start:</span>
                                      <span className="font-medium">{formatTime(booking.startDateTime)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Feed End:</span>
                                      <span className="font-medium">{formatTime(booking.endDateTime)}</span>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t text-xs text-muted-foreground text-center">
                                    Click to view full details
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
