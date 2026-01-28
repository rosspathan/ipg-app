import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

export const AdminNotificationBell = () => {
  const [notificationCount, setNotificationCount] = useState(0);

  const { data: pendingItems, refetch } = useQuery({
    queryKey: ['admin-pending-items'],
    queryFn: async () => {
      // Fetch unread admin notifications
      const { data: notifications, count: notifCount } = await supabase
        .from('admin_notifications')
        .select('id, title, message, created_at, type', { count: 'exact' })
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      setNotificationCount(notifCount || 0);

      return {
        notifications: notifications || [],
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Notifications</h4>
          
          {notificationCount === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No new notifications
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {pendingItems?.notifications.map((notif) => (
                  <div 
                    key={`notif-${notif.id}`}
                    className="p-3 rounded-lg bg-accent/50 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium">{notif.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notif.created_at!), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
