
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

interface ProgressTrackerProps {
  todos: Array<{
    id: string;
    title: string;
    completed: boolean;
    created_at: string;
  }>;
  bookings: Array<{
    id: string;
    start_time: string;
    status: string;
  }>;
}

export const ProgressTracker = ({ bookings }: ProgressTrackerProps) => {
  const upcomingBookings = bookings.filter(booking => 
    booking.status === 'confirmed' && new Date(booking.start_time) > new Date()
  ).length;

  return (
    <div className="space-y-6">
      {upcomingBookings > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{upcomingBookings}</div>
                <p className="text-sm text-muted-foreground">Sessions scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
