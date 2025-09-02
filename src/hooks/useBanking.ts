import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface BankingDetails {
  id: string;
  user_id: string;
  account_name?: string;
  account_number?: string;
  ifsc?: string;
  bank_name?: string;
  upi_id?: string;
  verified: boolean;
  created_at: string;
}

export const useBanking = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [bankingDetails, setBankingDetails] = useState<BankingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBankingDetails = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('banking_inr')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setBankingDetails(data);
    } catch (error) {
      console.error('Error fetching banking details:', error);
      toast({
        title: "Error",
        description: "Failed to load banking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBankingDetails = async (updates: {
    account_name?: string;
    account_number?: string;
    ifsc?: string;
    bank_name?: string;
    upi_id?: string;
  }) => {
    if (!user) return;

    try {
      if (bankingDetails) {
        // Update existing record
        const { data, error } = await supabase
          .from('banking_inr')
          .update(updates)
          .eq('id', bankingDetails.id)
          .select()
          .single();

        if (error) throw error;
        setBankingDetails(data);
      } else {
        // Create new record
        const { data, error } = await supabase
          .from('banking_inr')
          .insert([{
            user_id: user.id,
            ...updates,
            verified: false
          }])
          .select()
          .single();

        if (error) throw error;
        setBankingDetails(data);
      }

      toast({
        title: "Success",
        description: "Banking details saved successfully",
      });
    } catch (error) {
      console.error('Error updating banking details:', error);
      toast({
        title: "Error",
        description: "Failed to update banking details",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchBankingDetails();
  }, [user]);

  return {
    bankingDetails,
    loading,
    updateBankingDetails,
    refetch: fetchBankingDetails
  };
};