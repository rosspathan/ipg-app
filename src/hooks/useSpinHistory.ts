import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "./useAuthUser";

export interface SpinHistoryItem {
  id: string;
  user_id: string;
  segment_id: string;
  bet_bsk: number;
  spin_fee_bsk: number;
  multiplier: number;
  payout_bsk: number;
  profit_fee_bsk: number;
  net_payout_bsk: number;
  net_change_bsk: number;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  result_value: number;
  was_free_spin: boolean;
  created_at: string;
  segment?: {
    id: string;
    label: string;
    multiplier: number;
    color_hex: string;
  } | null;
}

export interface SpinHistoryStats {
  totalSpins: number;
  totalWagered: number;
  netProfitLoss: number;
  winRate: number;
  bestWin: number;
  totalWins: number;
  totalLosses: number;
  freeSpinsUsed: number;
}

export type SpinFilterType = 'all' | 'wins' | 'losses' | 'free';

export function useSpinHistory(filter: SpinFilterType = 'all', limit: number = 50) {
  const { user } = useAuthUser();

  const { data: history, isLoading, refetch } = useQuery({
    queryKey: ['spin-history', user?.id, filter, limit],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('spin_history')
        .select(`
          *,
          segment:spin_segments(id, label, multiplier, color_hex)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (filter === 'wins') {
        query = query.gt('payout_bsk', 0);
      } else if (filter === 'losses') {
        query = query.eq('payout_bsk', 0);
      } else if (filter === 'free') {
        query = query.eq('was_free_spin', true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SpinHistoryItem[];
    },
    enabled: !!user,
    staleTime: 30000
  });

  const { data: stats } = useQuery({
    queryKey: ['spin-history-stats', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('spin_history')
        .select('bet_bsk, payout_bsk, net_change_bsk, was_free_spin')
        .eq('user_id', user.id);

      if (error) throw error;

      const allSpins = (data || []) as { bet_bsk: number; payout_bsk: number; net_change_bsk: number; was_free_spin: boolean }[];
      const wins = allSpins.filter(s => (s.payout_bsk || 0) > 0);
      const losses = allSpins.filter(s => (s.payout_bsk || 0) === 0);
      const freeSpins = allSpins.filter(s => s.was_free_spin);

      const totalWagered = allSpins.reduce((sum, s) => sum + (s.bet_bsk || 0), 0);
      const netProfitLoss = allSpins.reduce((sum, s) => sum + (s.net_change_bsk || 0), 0);
      const bestWin = Math.max(0, ...allSpins.map(s => s.net_change_bsk || 0));

      return {
        totalSpins: allSpins.length,
        totalWagered,
        netProfitLoss,
        winRate: allSpins.length > 0 ? (wins.length / allSpins.length) * 100 : 0,
        bestWin,
        totalWins: wins.length,
        totalLosses: losses.length,
        freeSpinsUsed: freeSpins.length
      } as SpinHistoryStats;
    },
    enabled: !!user,
    staleTime: 30000
  });

  return {
    history: history || [],
    stats: stats || {
      totalSpins: 0,
      totalWagered: 0,
      netProfitLoss: 0,
      winRate: 0,
      bestWin: 0,
      totalWins: 0,
      totalLosses: 0,
      freeSpinsUsed: 0
    },
    isLoading,
    refetch
  };
}
