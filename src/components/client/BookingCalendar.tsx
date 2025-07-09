
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, CheckCircle, AlertCircle, CalendarDays } from 'lucide-react';
import { format, isSameDay, addHours, startOfDay } from 'date-fns';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BookingCalendarProps {
  consultants: Array<{
    id: string;
    full_name: string;
    business_name: string;
  }>;
  preSelectedConsultantId?: string;
  onBooking: (consultantId: string, date: Date, time: string) => void;
}

const checkAvailabilityAndAutoBook = async (consultantId: string, userId: string) => {
  // Check if consultant has available slots
  const { data: availability, error } = await supabase
    .from('consultant_availability')
    .select('*')
    .eq('consultant_id', consultantId)
    .eq('is_booked', false)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(1);

  if (error || !availability || availability.length === 0) {
    return null;
  }

  // Auto-book the first available slot
  const availableSlot = availability[0];
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      client_id: userId,
      consultant_id: consultantId,
      availability_id: availableSlot.id,
      start_time: availableSlot.start_time,
      end_time: availableSlot.end_time,
      type: 'online',
      status: 'pending',
    })
    .select()
    .single();

  if (bookingError) {
    throw new Error(bookingError.message);
  }

  // Mark availability as booked
  await supabase
    .from('consultant_availability')
    .update({ is_booked: true })
    .eq('id', availableSlot.id);

  return booking;
};

const manualBookConsultant = async (consultantId: string, availabilityId: string, userId: string) => {
  const { data: booking, error } = await supabase
    .rpc('book_consultation', { p_availability_id: availabilityId });

  if (error) {
    throw new Error(error.message);
  }

  return booking;
};

export const BookingCalendar = ({ consultants, preSelectedConsultantId, onBooking }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedConsultant, setSelectedConsultant] = useState<string>(preSelectedConsultantId || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [autoBookedConsultants, setAutoBookedConsultants] = useState<Set<string>>(new Set());
  const [monitoringConsultants, setMonitoringConsultants] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch availability for selected consultant and date
  const { data: availableSlots, isLoading: slotsLoading } = useQuery({
    queryKey: ['availability', selectedConsultant, selectedDate],
    queryFn: async () => {
      if (!selectedConsultant || !selectedDate) return [];
      
      const startOfSelectedDate = startOfDay(selectedDate);
      const endOfSelectedDate = addHours(startOfSelectedDate, 24);
      
      const { data, error } = await supabase
        .from('consultant_availability')
        .select('*')
        .eq('consultant_id', selectedConsultant)
        .eq('is_booked', false)
        .gte('start_time', startOfSelectedDate.toISOString())
        .lt('start_time', endOfSelectedDate.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedConsultant && !!selectedDate,
  });

  const { mutate: autoBookConsultant } = useMutation({
    mutationFn: ({ consultantId }: { consultantId: string }) => {
      if (!user) throw new Error('User not authenticated');
      return checkAvailabilityAndAutoBook(consultantId, user.id);
    },
    onSuccess: (booking, { consultantId }) => {
      if (booking) {
        const consultant = consultants?.find(c => c.id === consultantId);
        setAutoBookedConsultants(prev => new Set(prev).add(consultantId));
        setMonitoringConsultants(prev => {
          const newSet = new Set(prev);
          newSet.delete(consultantId);
          return newSet;
        });
        toast.success('Auto-booked with available consultant!', {
          description: `Automatically booked with ${consultant?.full_name} for ${format(new Date(booking.start_time), 'PPp')}`,
          duration: 10000,
        });
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        onBooking(booking.consultant_id, new Date(booking.start_time), format(new Date(booking.start_time), 'HH:mm'));
      }
    },
    onError: (error: Error, { consultantId }) => {
      setMonitoringConsultants(prev => new Set(prev).add(consultantId));
      console.log(`No availability for consultant ${consultantId}:`, error.message);
    },
  });

  const { mutate: manualBooking, isPending: isBookingPending } = useMutation({
    mutationFn: ({ availabilityId }: { availabilityId: string }) => {
      if (!user) throw new Error('User not authenticated');
      return manualBookConsultant(selectedConsultant, availabilityId, user.id);
    },
    onSuccess: (booking) => {
      if (booking) {
        const consultant = consultants?.find(c => c.id === selectedConsultant);
        toast.success('Successfully booked!', {
          description: `Booked with ${consultant?.full_name} for ${format(new Date(booking.start_time), 'PPp')}`,
          duration: 8000,
        });
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['availability', selectedConsultant, selectedDate] });
        onBooking(booking.consultant_id, new Date(booking.start_time), format(new Date(booking.start_time), 'HH:mm'));
        setSelectedTimeSlot('');
      }
    },
    onError: (error: Error) => {
      toast.error('Booking failed', {
        description: error.message,
      });
    },
  });

  const handleManualBooking = () => {
    if (!selectedTimeSlot) {
      toast.error('Please select a time slot');
      return;
    }
    manualBooking({ availabilityId: selectedTimeSlot });
  };

  // Trigger immediate booking check when component mounts
  useEffect(() => {
    if (!user || !consultants || consultants.length === 0) return;

    // Immediate check on page load
    const checkAllConsultants = () => {
      consultants.forEach(consultant => {
        if (!autoBookedConsultants.has(consultant.id)) {
          setMonitoringConsultants(prev => new Set(prev).add(consultant.id));
          autoBookConsultant({ consultantId: consultant.id });
        }
      });
    };

    // Run immediately
    checkAllConsultants();

    // Continue monitoring every 10 seconds for new availability
    const interval = setInterval(checkAllConsultants, 10000);

    return () => clearInterval(interval);
  }, [user, consultants, autoBookConsultant, autoBookedConsultants]);

  const getConsultantStatus = (consultantId: string) => {
    if (autoBookedConsultants.has(consultantId)) {
      return { status: 'booked', icon: CheckCircle, color: 'text-green-600', text: 'Auto-booked' };
    }
    if (monitoringConsultants.has(consultantId)) {
      return { status: 'monitoring', icon: Clock, color: 'text-blue-600', text: 'Monitoring...' };
    }
    return { status: 'waiting', icon: AlertCircle, color: 'text-orange-600', text: 'Waiting' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-4 sm:h-5 w-4 sm:w-5" />
            Auto-Booking Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 hidden">
            <label className="text-sm font-medium">Consultant Auto-Booking</label>
            <div className="space-y-3">
              {consultants.map((consultant) => {
                const statusInfo = getConsultantStatus(consultant.id);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <div
                    key={consultant.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-left min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{consultant.full_name}</div>
                        {consultant.business_name && (
                          <div className="text-xs text-muted-foreground truncate">{consultant.business_name}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                      <Badge variant="outline" className="text-xs">
                        {statusInfo.text}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <h3 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
              ⚡ Instant Booking System
            </h3>
            <ul className="text-xs text-green-800 dark:text-green-200 space-y-1">
              <li>• Immediate scan triggered on page load</li>
              <li>• Books first available time slot instantly</li>
              <li>• Continues monitoring every 10 seconds</li>
              <li>• Detailed notifications with booking time</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CalendarDays className="h-4 sm:h-5 w-4 sm:w-5" />
            Manual Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Consultant</label>
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a consultant" />
              </SelectTrigger>
              <SelectContent>
                {consultants.map((consultant) => (
                  <SelectItem key={consultant.id} value={consultant.id}>
                    {consultant.full_name} {consultant.business_name && `(${consultant.business_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Date</label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
              className="rounded-md border"
            />
          </div>

          {selectedConsultant && selectedDate && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Available Time Slots</label>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Clock className="h-4 w-4 animate-spin" />
                  <span className="ml-2 text-sm">Loading slots...</span>
                </div>
              ) : availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot.id}
                      variant={selectedTimeSlot === slot.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTimeSlot(slot.id)}
                      className="text-xs"
                    >
                      {format(new Date(slot.start_time), 'HH:mm')} - {format(new Date(slot.end_time), 'HH:mm')}
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No available slots for selected date
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleManualBooking}
            disabled={!selectedTimeSlot || isBookingPending}
            className="w-full"
          >
            {isBookingPending ? 'Booking...' : 'Book Selected Time'}
          </Button>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              📅 Manual Booking
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Select specific consultant and time slot based on availability
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
