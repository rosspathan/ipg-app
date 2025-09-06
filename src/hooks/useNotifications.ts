import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchWithTimeout, getErrorMessage } from "@/utils/fetchWithTimeout";

export interface Notification {
  id: string;
  user_id: string;
  type: 'system' | 'security' | 'funding' | 'trade' | 'programs' | 'marketing';
  title: string;
  body: string;
  meta?: any;
  link_url?: string;
  created_at: string;
  is_read?: boolean;
  read_at?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const loadNotifications = useCallback(async (filter?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('notifications')
        .select(`
          *,
          notifications_read!left (
            read_at
          )
        `)
        .order('created_at', { ascending: false });

      if (filter && filter !== 'all') {
        if (filter === 'unread') {
          // Will filter in JS after loading
        } else {
          query = query.eq('type', filter);
        }
      }

      const { data, error } = await fetchWithTimeout(
        () => query,
        { ms: 10000 }
      );

      if (error) throw error;

      // Transform data to include read status
      const transformedData = (data || []).map((notification: any) => ({
        ...notification,
        is_read: !!notification.notifications_read?.[0]?.read_at,
        read_at: notification.notifications_read?.[0]?.read_at,
      }));

      // Apply unread filter if needed
      const filteredData = filter === 'unread' 
        ? transformedData.filter((n: Notification) => !n.is_read)
        : transformedData;

      setNotifications(filteredData);

      // Update unread count
      const unread = transformedData.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);

    } catch (error: any) {
      toast({
        title: "Error loading notifications",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { error } = await supabase
        .from('notifications_read')
        .upsert({
          user_id: user.user.id,
          notification_id: notificationId,
          read_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true, read_at: new Date().toISOString() }
            : notification
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

    } catch (error: any) {
      toast({
        title: "Error marking as read",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) return;

      const readEntries = unreadNotifications.map(notification => ({
        user_id: user.user.id,
        notification_id: notification.id,
        read_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('notifications_read')
        .upsert(readEntries);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);

      toast({
        title: "All marked as read",
        description: "All notifications have been marked as read.",
      });

    } catch (error: any) {
      toast({
        title: "Error marking all as read",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  // Realtime subscription for new notifications
  useEffect(() => {
    const { data: user } = supabase.auth.getUser();
    
    if (!user) return;

    const channel = supabase
      .channel('user_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user}`,
      }, (payload) => {
        const newNotification = {
          ...payload.new,
          is_read: false,
        } as Notification;

        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);

        // Show toast for new notification
        toast({
          title: newNotification.title,
          description: newNotification.body,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    notifications,
    loading,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
};