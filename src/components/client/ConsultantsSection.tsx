
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, Calendar, MessageCircle, Award, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

type Profile = Database['public']['Tables']['profiles']['Row'];

const fetchAllConsultants = async (): Promise<Profile[]> => {
  const { data, error } = await supabase.rpc('get_all_consultants');
  
  if (error) {
    console.error('Error fetching consultants:', error);
    throw new Error(error.message);
  }
  
  return data || [];
};

export const ConsultantsSection = () => {
  const { data: consultants, isLoading } = useQuery({
    queryKey: ['consultants'],
    queryFn: fetchAllConsultants,
  });

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
                    
                    <div className="flex items-center gap-1 mb-3">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">4.8</span>
                      <span className="text-xs text-muted-foreground">(24)</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button asChild size="sm" className="h-7 text-xs">
                        <Link to="/booking" state={{ consultant }}>
                          <Calendar className="mr-1 h-3 w-3" />
                          Book
                        </Link>
                      </Button>
                      
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
