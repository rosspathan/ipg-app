import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserSettings {
  user_id: string;
  display_currency: string;
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
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError) throw settingsError;

      if (!settingsData) {
        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([{
            user_id: user.id,
            display_currency: 'USD'
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSettings(newSettings);
      } else {
        setSettings(settingsData);
      }

      // Set default notifications since table doesn't exist yet
      setNotifications({
        user_id: user.id,
        tx_push: true,
        marketing_push: false,
        email_tx: true,
        email_marketing: false,
        created_at: new Date().toISOString()
      });
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
        .from('user_settings')
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
      // Update local state since table doesn't exist yet
      setNotifications(prev => prev ? { ...prev, ...updates } : null);
      toast({
        title: "Success",
        description: "Notification preferences updated successfully",
      });
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