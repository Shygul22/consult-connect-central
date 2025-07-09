
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { BookingCalendar } from '@/components/client/BookingCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Calendar, CheckCircle } from 'lucide-react';

type Profile = Database['public']['Tables']['profiles']['Row'];

const fetchConsultants = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.rpc('get_all_consultants');

  if (error) {
    console.error('Error fetching consultants:', error);
    throw new Error(error.message);
  }

  return data || [];
};

const BookingPage = () => {
  const location = useLocation();
  const preSelectedConsultant = location.state?.consultant;
  
  const [recentBooking, setRecentBooking] = useState<{
    consultant: string;
    date: Date;
    time: string;
  } | null>(null);

  const { data: consultants, isLoading, error } = useQuery({
    queryKey: ['consultants'],
    queryFn: fetchConsultants,
  });

  const handleBookingSuccess = (consultantId: string, date: Date, time: string) => {
    const consultant = consultants?.find(c => c.id === consultantId);
    if (consultant) {
      setRecentBooking({
        consultant: consultant.full_name || 'Unknown',
        date,
        time
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
        <div className="mb-6 sm:mb-8 text-center">
          <Skeleton className="h-8 sm:h-10 w-48 sm:w-64 mx-auto mb-2" />
          <Skeleton className="h-4 sm:h-6 w-72 sm:w-96 mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-24 sm:h-32 w-full" />
                <Skeleton className="h-48 sm:h-64 w-full" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 sm:h-8 w-32 sm:w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 sm:h-96 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
        <Alert variant="destructive" className="w-full max-w-2xl mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load consultants. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!consultants || consultants.length === 0) {
    return (
      <div className="container py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="py-6 sm:py-8 text-center">
            <Calendar className="mx-auto h-10 sm:h-12 w-10 sm:w-12 text-muted-foreground mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">No consultants available for booking at this time.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-6 lg:py-8 max-w-6xl px-3 sm:px-4 lg:px-8">
      <div className="mb-6 sm:mb-8 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Book an Appointment</h1>
        <p className="text-sm sm:text-base text-muted-foreground px-4">Choose your preferred consultant, date, and time for your consultation</p>
      </div>

      {recentBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <Card className="max-w-md w-full border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 animate-scale-in shadow-2xl">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-green-800 dark:text-green-200 mb-2">
                  Booking Request Submitted!
                </h2>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  <strong>Consultant:</strong> {recentBooking.consultant}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  <strong>Date & Time:</strong> {recentBooking.date.toLocaleDateString()} at {recentBooking.time}
                </p>
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg mb-6">
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium mb-2">
                    📋 Next Steps:
                  </p>
                  <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 text-left">
                    <li>• Your consultant will review and confirm your appointment</li>
                    <li>• You'll receive a confirmation email with meeting details</li>
                    <li>• Meeting link will be provided once confirmed</li>
                    <li>• You can view your bookings in your client dashboard</li>
                  </ul>
                </div>
                <Button 
                  onClick={() => setRecentBooking(null)}
                  className="w-full"
                >
                  Continue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <BookingCalendar 
        consultants={consultants.map(c => ({
          id: c.id,
          full_name: c.full_name || 'Unknown',
          business_name: c.business_name || '',
        }))}
        preSelectedConsultantId={preSelectedConsultant?.id}
        onBooking={handleBookingSuccess}
      />

      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Booking Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs sm:text-sm text-muted-foreground">
          <p>• Sessions are available Monday to Friday, 9 AM to 5 PM</p>
          <p>• Please book at least 24 hours in advance</p>
          <p>• You will receive a confirmation email with meeting details</p>
          <p>• Cancellations must be made at least 2 hours before the session</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BookingPage;
