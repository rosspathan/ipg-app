import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserApp {
  id: string;
  user_id: string;
  email?: string;
  phone?: string;
  display_name?: string;
  country?: string;
  dob?: string;
  account_frozen: boolean;
  created_at: string;
}

export const useProfile = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [userApp, setUserApp] = useState<UserApp | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserApp = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users_app')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial user app record
        const { data: newUserApp, error: createError } = await supabase
          .from('users_app')
          .insert([{
            user_id: user.id,
            email: user.email,
            account_frozen: false
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
        .from('users_app')
        .update(updates)
        .eq('user_id', user.id)
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

  return {
    userApp,
    loading,
    updateUserApp,
    refetch: fetchUserApp
  };
};