import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function AdminNotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bsk_loan_applications' },
        (payload) => {
          addNotification({
            type: 'loan_application',
            message: 'New loan application received',
            data: payload.new
          });
          queryClient.invalidateQueries({ queryKey: ['loan-applications'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'insurance_bsk_claims' },
        (payload) => {
          addNotification({
            type: 'insurance_claim',
            message: 'New insurance claim filed',
            data: payload.new
          });
          queryClient.invalidateQueries({ queryKey: ['insurance-claims'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'draw_configs' },
        (payload: any) => {
          if (payload.new.current_participants >= payload.new.pool_size * 0.9) {
            addNotification({
              type: 'draw_alert',
              message: `Lucky Draw "${payload.new.draw_name}" is 90% full`,
              data: payload.new
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const addNotification = ({ type, message, data }: any) => {
    const newNotif: Notification = {
      id: Math.random().toString(),
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllRead}>
                Mark all read
              </Button>
            )}
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notif) => (
                <Card 
                  key={notif.id} 
                  className={`p-3 ${notif.read ? 'opacity-60' : 'border-primary'}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notif.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {!notif.read && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
