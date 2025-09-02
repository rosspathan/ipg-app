import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  user_id: string;
  display_currency: string;
  language: string;
  theme: string;
  session_lock_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface NotificationPrefs {
  user_id: string;
  tx_push: boolean;
  marketing_push: boolean;
  email_tx: boolean;
  email_marketing: boolean;
  created_at: string;
}

export const usePreferences = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings_user')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!settingsData) {
        const { data: newSettings, error: createError } = await supabase
          .from('settings_user')
          .insert([{
            user_id: user.id,
            display_currency: 'USD',
            language: 'en',
            theme: 'system',
            session_lock_minutes: 5
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      } else {
        setSettings(settingsData);
      }

      // Fetch notifications
      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications_prefs')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (notifError) throw notifError;

      if (!notificationsData) {
        const { data: newNotifications, error: createError } = await supabase
          .from('notifications_prefs')
          .insert([{
            user_id: user.id,
            tx_push: true,
            marketing_push: false,
            email_tx: true,
            email_marketing: false
          }])
          .select()
          .single();

        if (createError) throw createError;
        setNotifications(newNotifications);
      } else {
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('settings_user')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSettings(data);
      toast({
        title: "Success",
        description: "Settings updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateNotifications = async (updates: Partial<NotificationPrefs>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications_prefs')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setNotifications(data);
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating notifications:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  return {
    settings,
    notifications,
    loading,
    updateSettings,
    updateNotifications,
    refetch: fetchPreferences
  };
};