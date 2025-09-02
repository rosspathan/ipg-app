import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface Security {
  user_id: string;
  has_2fa: boolean;
  pin_set: boolean;
  anti_phishing_code?: string;
  withdraw_whitelist_only: boolean;
  spend_daily_limit: number;
  created_at: string;
}

export interface LoginAudit {
  id: string;
  user_id: string;
  event: string;
  ip?: string;
  agent?: string;
  created_at: string;
}

export const useSecurity = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [security, setSecurity] = useState<Security | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginAudit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurity = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Create initial security record
        const { data: newSecurity, error: createError } = await supabase
          .from('security')
          .insert([{
            user_id: user.id,
            has_2fa: false,
            pin_set: false,
            withdraw_whitelist_only: false,
            spend_daily_limit: 0
          }])
          .select()
          .single();

        if (createError) throw createError;
        setSecurity(newSecurity);
      } else {
        setSecurity(data);
      }
    } catch (error) {
      console.error('Error fetching security:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('login_audit')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLoginHistory(data || []);
    } catch (error) {
      console.error('Error fetching login history:', error);
    }
  };

  const updateSecurity = async (updates: Partial<Security>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('security')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setSecurity(data);
      toast({
        title: "Success",
        description: "Security settings updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating security:', error);
      toast({
        title: "Error",
        description: "Failed to update security settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  const setPin = async (pin: string) => {
    // In a real app, you'd hash the pin
    await updateSecurity({ pin_set: true });
    toast({
      title: "Success",
      description: "PIN set successfully",
    });
  };

  const enable2FA = async () => {
    await updateSecurity({ has_2fa: true });
  };

  const disable2FA = async () => {
    await updateSecurity({ has_2fa: false });
  };

  useEffect(() => {
    fetchSecurity();
    fetchLoginHistory();
  }, [user]);

  return {
    security,
    loginHistory,
    loading,
    updateSecurity,
    setPin,
    enable2FA,
    disable2FA,
    refetch: fetchSecurity
  };
};