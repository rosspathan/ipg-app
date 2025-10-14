import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserApp {
  id: string;
  user_id: string;
  email?: string;
  phone?: string;
  username?: string;
  full_name?: string;
  wallet_address?: string;
  referral_code?: string;
  account_status: string;
  created_at: string;
}

export const useProfile = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [userApp, setUserApp] = useState<UserApp | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserApp = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial user app record with required referral_code
        const { data: newUserApp, error: createError } = await supabase
          .from('profiles')
          .insert([{
            id: user.id,
            email: user.email,
            account_status: 'active',
            referral_code: user.id.substring(0, 8).toUpperCase()
          }])
          .select()
          .single();

        if (createError) throw createError;
        setUserApp(newUserApp);
      } else {
        setUserApp(data);
      }
    } catch (error) {
      console.error('Error fetching user app:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserApp = async (updates: Partial<UserApp>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setUserApp(data);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating user app:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchUserApp();
  }, [user]);

  // Listen for profile update events
  useEffect(() => {
    const handleProfileUpdate = () => {
      console.log('[useProfile] Profile update event received, refetching...');
      fetchUserApp();
    };

    window.addEventListener('profile:updated', handleProfileUpdate);
    return () => window.removeEventListener('profile:updated', handleProfileUpdate);
  }, []);

  return {
    userApp,
    loading,
    updateUserApp,
    refetch: fetchUserApp
  };
};