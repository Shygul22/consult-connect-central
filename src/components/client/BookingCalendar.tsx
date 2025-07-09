
import { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

export const BookingCalendar = ({ consultants, preSelectedConsultantId, onBooking }: BookingCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedConsultant, setSelectedConsultant] = useState<string>(preSelectedConsultantId || '');
  const [autoBookedConsultants, setAutoBookedConsultants] = useState<Set<string>>(new Set());
  const [monitoringConsultants, setMonitoringConsultants] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const queryClient = useQueryClient();

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
            <Clock className="h-4 sm:h-5 w-4 sm:w-5" />
            Booking Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                  <Clock className="h-8 w-8 text-primary" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {autoBookedConsultants.size}
                  </span>
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Auto-Booking System Active</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {autoBookedConsultants.size > 0 
                ? `${autoBookedConsultants.size} consultant(s) successfully booked`
                : 'Scanning all consultants for immediate availability...'
              }
            </p>
            <div className="flex justify-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Booked: {autoBookedConsultants.size}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Scanning: {monitoringConsultants.size}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
