import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, Check, Filter, ExternalLink, Loader2, CheckCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const typeIcons = {
  system: "🔧",
  security: "🔒",
  funding: "💰",
  trade: "📈",
  programs: "🎁",
  marketing: "📢",
};

const typeLabels = {
  system: "System",
  security: "Security", 
  funding: "Funding",
  trade: "Trading",
  programs: "Programs",
  marketing: "Marketing",
};

export const NotificationsScreen = () => {
  const navigate = useNavigate();
  const { notifications, loading, unreadCount, loadNotifications, markAsRead, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  
  useEffect(() => {
    loadNotifications(filter);
  }, [loadNotifications, filter]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.link_url) {
      if (notification.link_url.startsWith('/')) {
        navigate(notification.link_url);
      } else {
        window.open(notification.link_url, '_blank');
      }
    } else {
      setSelectedNotification(notification);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Stay updated with your account activity</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="security">Security</SelectItem>
              <SelectItem value="funding">Funding</SelectItem>
              <SelectItem value="trade">Trading</SelectItem>
              <SelectItem value="programs">Programs</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
            </SelectContent>
          </Select>
          
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {filter === 'all' ? 'No notifications yet' : `No ${filter} notifications found`}
                </p>
              </CardContent>
            </Card>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id}
                className={`cursor-pointer hover:bg-accent/50 transition-colors ${
                  !notification.is_read ? 'border-primary/50 bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-lg">
                      {typeIcons[notification.type]}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">{notification.title}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {typeLabels[notification.type]}
                            </Badge>
                            {notification.link_url && (
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {notification.body}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={() => setSelectedNotification(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && (
                <>
                  <span className="text-lg">{typeIcons[selectedNotification.type]}</span>
                  {selectedNotification.title}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <div>
                <Badge variant="secondary">{typeLabels[selectedNotification.type]}</Badge>
              </div>
              <p className="text-sm">{selectedNotification.body}</p>
              {selectedNotification.meta && Object.keys(selectedNotification.meta).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <pre>{JSON.stringify(selectedNotification.meta, null, 2)}</pre>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(selectedNotification.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};