import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserWallet {
  id: string;
  user_id: string;
  chain: string;
  address: string;
  label?: string;
  is_primary: boolean;
  created_at: string;
}

export const useWallets = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWallets = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('wallets_user')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWallets(data || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast({
        title: "Error",
        description: "Failed to load wallets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addWallet = async (walletData: {
    chain: string;
    address: string;
    label?: string;
  }) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('wallets_user')
        .insert([{
          user_id: user.id,
          ...walletData,
          is_primary: false
        }])
        .select()
        .single();

      if (error) throw error;

      setWallets(prev => [data, ...prev]);
      toast({
        title: "Success",
        description: "Wallet added successfully",
      });
      return data;
    } catch (error: any) {
      console.error('Error adding wallet:', error);
      if (error.code === '23505') {
        toast({
          title: "Error",
          description: "This wallet address is already added",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add wallet",
          variant: "destructive",
        });
      }
      throw error;
    }
  };

  const updateWallet = async (walletId: string, updates: {
    chain?: string;
    address?: string;
    label?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('wallets_user')
        .update(updates)
        .eq('id', walletId)
        .select()
        .single();

      if (error) throw error;

      setWallets(prev => prev.map(w => w.id === walletId ? data : w));
      toast({
        title: "Success",
        description: "Wallet updated successfully",
      });
      return data;
    } catch (error) {
      console.error('Error updating wallet:', error);
      toast({
        title: "Error",
        description: "Failed to update wallet",
        variant: "destructive",
      });
      throw error;
    }
  };

  const removeWallet = async (walletId: string) => {
    try {
      const { error } = await supabase
        .from('wallets_user')
        .delete()
        .eq('id', walletId);

      if (error) throw error;

      setWallets(prev => prev.filter(w => w.id !== walletId));
      toast({
        title: "Success",
        description: "Wallet removed successfully",
      });
    } catch (error) {
      console.error('Error removing wallet:', error);
      toast({
        title: "Error",
        description: "Failed to remove wallet",
        variant: "destructive",
      });
    }
  };

  const setPrimary = async (walletId: string, chain: string) => {
    if (!user) return;

    try {
      // First, unset current primary for this chain
      await supabase
        .from('wallets_user')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .eq('chain', chain);

      // Then set the new primary
      const { data, error } = await supabase
        .from('wallets_user')
        .update({ is_primary: true })
        .eq('id', walletId)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setWallets(prev => prev.map(w => ({
        ...w,
        is_primary: w.chain === chain ? w.id === walletId : w.is_primary
      })));

      toast({
        title: "Success",
        description: "Primary wallet updated",
      });
    } catch (error) {
      console.error('Error setting primary wallet:', error);
      toast({
        title: "Error",
        description: "Failed to set primary wallet",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [user]);

  return {
    wallets,
    loading,
    addWallet,
    updateWallet,
    removeWallet,
    setPrimary,
    refetch: fetchWallets
  };
};