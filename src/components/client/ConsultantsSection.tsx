
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, MessageCircle, Award, Users, Clock, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

type Profile = Database['public']['Tables']['profiles']['Row'];

const fetchAllConsultants = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.rpc('get_all_consultants');
  
  if (error) {
    console.error('Error fetching consultants:', error);
    throw new Error(error.message);
  }
  
  return data || [];
};

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

export const ConsultantsSection = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [autoBookedConsultants, setAutoBookedConsultants] = useState<Set<string>>(new Set());

  const { data: consultants, isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: fetchAllConsultants,
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
        toast.success('Auto-booked with available consultant!', {
          description: `Automatically booked with ${consultant?.full_name}`,
        });
        queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
      }
    },
    onError: (error: Error) => {
      toast.error('Auto-booking failed', {
        description: error.message,
      });
    },
  });

  // Auto-check for available consultants every 30 seconds
  useEffect(() => {
    if (!user || !consultants) return;

    const interval = setInterval(() => {
      consultants.forEach(consultant => {
        if (!autoBookedConsultants.has(consultant.id)) {
          autoBookConsultant({ consultantId: consultant.id });
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user, consultants, autoBookConsultant, autoBookedConsultants]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Consultants
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Available Consultants
          </CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/consultants">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {consultants && consultants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {consultants.slice(0, 4).map((consultant) => (
              <Card key={consultant.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={consultant.avatar_url ?? undefined} 
                      alt={consultant.full_name ?? ''} 
                    />
                    <AvatarFallback>
                      {consultant.full_name?.charAt(0) ?? 'C'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{consultant.full_name}</h3>
                      {consultant.is_featured && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                          <Award className="h-2 w-2 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2 truncate">
                      {consultant.business_name}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-green-500" />
                        <span className="text-xs text-green-600 font-medium">
                          {autoBookedConsultants.has(consultant.id) ? 'Auto-booked' : 'Monitoring'}
                        </span>
                      </div>
                      
                      <Button asChild variant="outline" size="sm" className="h-7 text-xs">
                        <Link to="/chat" state={{ consultant }}>
                          <MessageCircle className="mr-1 h-3 w-3" />
                          Chat
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Consultants Available</h3>
            <p className="text-muted-foreground text-sm">
              We're working on adding more expert consultants to our platform.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
