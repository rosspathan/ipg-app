import { Bell, Check, User, DollarSign, ShieldCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdminNotifications, AdminNotification } from '@/hooks/useAdminNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const getNotificationIcon = (type: AdminNotification['type']) => {
  switch (type) {
    case 'bsk_transfer':
      return <DollarSign className="w-4 h-4 text-success" />;
    case 'bsk_purchase_request':
      return <DollarSign className="w-4 h-4 text-warning" />;
    case 'user_signup':
      return <User className="w-4 h-4 text-accent" />;
    case 'kyc_approval':
      return <ShieldCheck className="w-4 h-4 text-success" />;
    case 'kyc_rejection':
      return <X className="w-4 h-4 text-destructive" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const getPriorityColor = (priority: AdminNotification['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-destructive text-destructive-foreground';
    case 'high':
      return 'bg-warning text-warning-foreground';
    case 'normal':
      return 'bg-accent text-accent-foreground';
    case 'low':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function AdminNotificationCenter() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useAdminNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-10 w-10 text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)] hover:bg-[hsl(235_28%_15%)] relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center p-0 text-[10px] font-bold bg-[hsl(0_70%_68%)] text-white ring-2 ring-[hsl(235_28%_13%)]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-[hsl(235_28%_13%)] border-[hsl(235_20%_22%/0.2)]" align="end">
        <div className="flex items-center justify-between p-4 border-b border-[hsl(235_20%_22%/0.2)]">
          <h3 className="font-semibold text-lg text-[hsl(0_0%_98%)]">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)]"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[hsl(240_10%_70%)]">
              <Bell className="w-12 h-12 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(235_20%_22%/0.2)]">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-[hsl(235_28%_15%)] transition-colors cursor-pointer",
                    !notification.is_read && "bg-[hsl(235_28%_15%)/30"
                  )}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={cn(
                          "text-sm font-medium truncate text-[hsl(0_0%_98%)]",
                          !notification.is_read && "font-semibold"
                        )}>
                          {notification.title}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 rounded-full bg-[hsl(262_83%_58%)] flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-[hsl(240_10%_70%)] mb-2 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[hsl(240_10%_70%)]">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </span>
                        {notification.priority !== 'normal' && notification.priority !== 'low' && (
                          <Badge
                            className={cn("text-xs h-5", getPriorityColor(notification.priority))}
                          >
                            {notification.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator className="bg-[hsl(235_20%_22%/0.2)]" />
            <div className="p-2">
              <Button variant="ghost" className="w-full text-xs text-[hsl(240_10%_70%)] hover:text-[hsl(0_0%_98%)]" size="sm">
                View all notifications
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
