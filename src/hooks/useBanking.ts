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
    if (!user) {
      setLoading(false);
      return;
    }

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
      // Check if banking details exist and are verified/locked
      if (bankingDetails && (bankingDetails.verified || (bankingDetails as any).is_locked)) {
        toast({
          title: "Cannot Modify",
          description: "Your banking details are verified and cannot be changed. Contact support if you need to update them.",
          variant: "destructive",
        });
        throw new Error('Banking details are locked');
      }

      if (bankingDetails) {
        // This will now be blocked by database trigger if verified/locked
        const { data, error } = await supabase
          .from('banking_inr')
          .update(updates)
          .eq('id', bankingDetails.id)
          .select()
          .single();

        if (error) {
          // Check if it's the immutability error
          if (error.message.includes('locked') || error.message.includes('verified')) {
            throw new Error('Banking details cannot be modified once verified');
          }
          throw error;
        }
        setBankingDetails(data);
      } else {
        // Create new record - auto-lock after creation
        const { data, error } = await supabase
          .from('banking_inr')
          .insert([{
            user_id: user.id,
            ...updates,
            verified: false,
            is_locked: true // Lock immediately after creation
          }])
          .select()
          .single();

        if (error) throw error;
        setBankingDetails(data);
        
        toast({
          title: "Banking Details Saved",
          description: "Your banking details have been saved and locked. They cannot be modified. Please verify them carefully.",
        });
      }

      if (bankingDetails) {
        toast({
          title: "Success",
          description: "Banking details saved successfully",
        });
      }
    } catch (error: any) {
      console.error('Error updating banking details:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update banking details",
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