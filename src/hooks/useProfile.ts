import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { extractUsernameFromEmail } from '@/lib/user/username';

/**
 * Profile Fields Usage Guide:
 * 
 * - `username`: Auto-generated from email (e.g., "john" from john@example.com)
 *               Used for display in UI, referrals, and as default display name
 *               Set on profile creation and immutable
 * 
 * - `display_name`: User-customizable display name (optional)
 *                   Takes priority over username if set
 *                   Can be changed in profile settings
 * 
 * - `full_name`: Legal full name from KYC (e.g., "John Doe")
 *                Only used for KYC/legal purposes
 *                NOT for display in general UI
 * 
 * - `email`: User's email address
 *            NEVER display directly in UI (privacy)
 *            Use masked version (e.g., "jo***@example.com")
 * 
 * Display Priority: display_name > username > "user{id}"
 */

export interface UserApp {
  id: string;
  user_id: string;
  email?: string;
  phone?: string;
  username?: string;
  display_name?: string;
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
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchUserApp = useCallback(async () => {
    // Auth-first: Use user.id as single source of truth
    if (!user?.id) {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
      return;
    }

    try {
      // Only show loading state on initial load, not on refreshes
      if (initialLoad) {
        setLoading(true);
      }
      
      console.log('[PROFILE] Fetching profile by user_id:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        console.log('[PROFILE] ✓ Found profile by user_id:', data.username);
        setUserApp(data);
      } else {
        // Create initial user app record with username and required referral_code
        console.log('[PROFILE] Creating new profile for user:', user.id);
        const username = extractUsernameFromEmail(user.email, user.id);
        const { data: newUserApp, error: createError } = await supabase
          .from('profiles')
          .insert([{
            user_id: user.id,
            email: user.email,
            username: username,
            account_status: 'active',
            referral_code: user.id.substring(0, 8).toUpperCase()
          }])
          .select()
          .single();

        if (createError) throw createError;
        setUserApp(newUserApp);
      }
    } catch (error) {
      console.error('[PROFILE] Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      if (initialLoad) {
        setLoading(false);
        setInitialLoad(false);
      }
    }
  }, [user?.id, user?.email, toast, initialLoad]);

  const updateUserApp = async (updates: Partial<UserApp>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
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
  }, [fetchUserApp]);

  // Listen for profile update events (debounced to avoid loops)
  useEffect(() => {
    let timer: number | null = null;

    const handleProfileUpdate = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        console.log('[useProfile] Profile update event received (debounced), refetching...');
        fetchUserApp();
        timer = null;
      }, 300);
    };

    window.addEventListener('profile:updated', handleProfileUpdate);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener('profile:updated', handleProfileUpdate);
    };
  }, [fetchUserApp]);

  return {
    userApp,
    loading,
    updateUserApp,
    refetch: fetchUserApp
  };
};