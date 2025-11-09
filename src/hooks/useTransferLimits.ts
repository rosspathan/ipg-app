import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const DAILY_LIMIT = Number.MAX_SAFE_INTEGER; // No limit
const MAX_PER_TRANSACTION = Number.MAX_SAFE_INTEGER; // No limit

export interface TransferLimits {
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  percentUsed: number;
  maxPerTransaction: number;
  canTransfer: (amount: number) => { allowed: boolean; reason?: string };
}

export function useTransferLimits(userId?: string) {
  return useQuery({
    queryKey: ['transfer-limits', userId],
    queryFn: async (): Promise<TransferLimits> => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = userId || user?.id;
      
      if (!currentUserId) throw new Error('Not authenticated');

      // Get today's transfers
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('unified_bsk_transactions')
        .select('amount')
        .eq('user_id', currentUserId)
        .eq('transaction_type', 'transfer_out')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const usedToday = data?.reduce((sum, tx) => sum + Math.abs(tx.amount), 0) || 0;
      const remainingToday = Math.max(0, DAILY_LIMIT - usedToday);
      const percentUsed = (usedToday / DAILY_LIMIT) * 100;

      return {
        dailyLimit: DAILY_LIMIT,
        usedToday,
        remainingToday,
        percentUsed: Math.min(100, percentUsed),
        maxPerTransaction: MAX_PER_TRANSACTION,
        canTransfer: (amount: number) => {
          if (amount > MAX_PER_TRANSACTION) {
            return {
              allowed: false,
              reason: `Maximum ${MAX_PER_TRANSACTION.toLocaleString()} BSK per transaction`,
            };
          }
          if (amount > remainingToday) {
            return {
              allowed: false,
              reason: `Exceeds daily limit. ${remainingToday.toLocaleString()} BSK remaining today`,
            };
          }
          return { allowed: true };
        },
      };
    },
    enabled: !!userId || undefined,
    refetchInterval: 60000, // Refresh every minute
  });
}
