import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TradingPair {
  id: string;
  base_currency: string;
  quote_currency: string;
  is_active: boolean;
  min_order_size: number;
  max_order_size: number;
  price_precision: number;
  quantity_precision: number;
  maker_fee_percent: number;
  taker_fee_percent: number;
  created_at: string;
}

export function useTradingManagement() {
  const queryClient = useQueryClient();

  const { data: pairs, isLoading: pairsLoading } = useQuery({
    queryKey: ['trading-pairs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    }
  });

  const { data: settings } = useQuery({
    queryKey: ['trading-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trading_engine_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    }
  });

  const createPair = useMutation({
    mutationFn: async (newPair: any) => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .insert([newPair] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-pairs'] });
      toast.success('Trading pair created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create pair: ${error.message}`);
    }
  });

  const updatePair = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TradingPair> & { id: string }) => {
      const { data, error } = await supabase
        .from('trading_pairs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-pairs'] });
      toast.success('Trading pair updated successfully');
    }
  });

  const deletePair = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('trading_pairs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-pairs'] });
      toast.success('Trading pair deleted successfully');
    }
  });

  const togglePairStatus = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('trading_pairs')
        .update({ active: is_active } as any)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-pairs'] });
      toast.success('Pair status updated');
    }
  });

  return {
    pairs: pairs || [],
    settings,
    isLoading: pairsLoading,
    createPair: createPair.mutate,
    updatePair: updatePair.mutate,
    deletePair: deletePair.mutate,
    togglePairStatus: togglePairStatus.mutate
  };
}