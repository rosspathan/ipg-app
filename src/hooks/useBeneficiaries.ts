import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface Beneficiary {
  id: string;
  user_id: string;
  name: string;
  chain: string;
  address: string;
  note?: string;
  created_at: string;
}

export interface AllowlistAddress {
  id: string;
  user_id: string;
  chain: string;
  address: string;
  label?: string;
  enabled: boolean;
  created_at: string;
}

export const useBeneficiaries = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [allowlist, setAllowlist] = useState<AllowlistAddress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch beneficiaries
      const { data: beneficiariesData, error: beneficiariesError } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (beneficiariesError) throw beneficiariesError;

      // Fetch allowlist
      const { data: allowlistData, error: allowlistError } = await supabase
        .from('allowlist_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allowlistError) throw allowlistError;

      setBeneficiaries(beneficiariesData || []);
      setAllowlist(allowlistData || []);
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      toast({
        title: "Error",
        description: "Failed to load beneficiaries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBeneficiary = async (beneficiaryData: {
    name: string;
    chain: string;
    address: string;
    note?: string;
  }) => {
    if (!user) return;

    try {
      // Add to beneficiaries table
      const { data: beneficiary, error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .insert([{
          user_id: user.id,
          ...beneficiaryData
        }])
        .select()
        .single();

      if (beneficiaryError) throw beneficiaryError;

      // Add to allowlist table
      const { data: allowlistEntry, error: allowlistError } = await supabase
        .from('allowlist_addresses')
        .insert([{
          user_id: user.id,
          chain: beneficiaryData.chain,
          address: beneficiaryData.address,
          label: beneficiaryData.name,
          enabled: true
        }])
        .select()
        .single();

      if (allowlistError) throw allowlistError;

      setBeneficiaries(prev => [beneficiary, ...prev]);
      setAllowlist(prev => [allowlistEntry, ...prev]);
      
      toast({
        title: "Success",
        description: "Beneficiary added successfully",
      });
      
      return beneficiary;
    } catch (error: any) {
      console.error('Error adding beneficiary:', error);
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "This address is already in your beneficiaries",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add beneficiary",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const updateAllowlist = async (allowlistId: string, updates: {
    enabled?: boolean;
    label?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('allowlist_addresses')
        .update(updates)
        .eq('id', allowlistId)
        .select()
        .single();

      if (error) throw error;

      setAllowlist(prev => prev.map(a => a.id === allowlistId ? data : a));
      
      toast({
        title: "Success",
        description: `Address ${updates.enabled ? 'enabled' : 'disabled'} for withdrawals`,
      });
      
      return data;
    } catch (error) {
      console.error('Error updating allowlist:', error);
      toast({
        title: "Error",
        description: "Failed to update allowlist",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeBeneficiary = async (beneficiaryId: string) => {
    try {
      const beneficiary = beneficiaries.find(b => b.id === beneficiaryId);
      if (!beneficiary) return;

      // Remove from beneficiaries
      const { error: beneficiaryError } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', beneficiaryId);

      if (beneficiaryError) throw beneficiaryError;

      // Remove from allowlist
      const { error: allowlistError } = await supabase
        .from('allowlist_addresses')
        .delete()
        .eq('user_id', user?.id)
        .eq('address', beneficiary.address)
        .eq('chain', beneficiary.chain);

      if (allowlistError) throw allowlistError;

      setBeneficiaries(prev => prev.filter(b => b.id !== beneficiaryId));
      setAllowlist(prev => prev.filter(a => 
        !(a.address === beneficiary.address && a.chain === beneficiary.chain)
      ));
      
      toast({
        title: "Success",
        description: "Beneficiary removed successfully",
      });
    } catch (error) {
      console.error('Error removing beneficiary:', error);
      toast({
        title: "Error",
        description: "Failed to remove beneficiary",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  return {
    beneficiaries,
    allowlist,
    loading,
    addBeneficiary,
    updateAllowlist,
    removeBeneficiary,
    refetch: fetchData
  };
};