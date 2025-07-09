
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CalendarDays } from 'lucide-react';
import { format, addHours, startOfDay } from 'date-fns';
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


  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <CalendarDays className="h-4 sm:h-5 w-4 sm:w-5" />
            Book Consultation
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
                <div className="text-center py-6 text-sm text-muted-foreground space-y-2">
                  <div>No available slots for {format(selectedDate, 'PPP')}</div>
                  <div className="text-xs opacity-75">Try selecting a different date or consultant</div>
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
              📅 Book Your Consultation
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Select your preferred consultant and time slot based on availability
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
