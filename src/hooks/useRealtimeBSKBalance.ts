import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel } from '@supabase/supabase-js';

interface BSKBalanceUpdate {
  withdrawable_balance: number;
  holding_balance: number;
  total_earned_withdrawable: number;
  total_earned_holding: number;
}

export const useRealtimeBSKBalance = (
  userId: string | undefined,
  onBalanceUpdate: () => void
) => {
  const { toast } = useToast();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const previousBalanceRef = useRef<BSKBalanceUpdate | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log('[Realtime BSK] Setting up realtime subscription for user:', userId);

    // Create channel for realtime updates
    channelRef.current = supabase
      .channel('bsk-balance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_bsk_balances',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('[Realtime BSK] Balance update received:', payload);
          
          const newBalance = payload.new as BSKBalanceUpdate;
          const oldBalance = payload.old as BSKBalanceUpdate;

          // Calculate changes
          const withdrawableChange = newBalance.withdrawable_balance - oldBalance.withdrawable_balance;
          const holdingChange = newBalance.holding_balance - oldBalance.holding_balance;

          // Show notification if there's a change
          if (withdrawableChange !== 0 || holdingChange !== 0) {
            let message = '💰 BSK Balance Updated!';
            const details: string[] = [];

            if (withdrawableChange > 0) {
              details.push(`+${withdrawableChange.toFixed(2)} Withdrawable BSK`);
            } else if (withdrawableChange < 0) {
              details.push(`${withdrawableChange.toFixed(2)} Withdrawable BSK`);
            }

            if (holdingChange > 0) {
              details.push(`+${holdingChange.toFixed(2)} Holding BSK`);
            } else if (holdingChange < 0) {
              details.push(`${holdingChange.toFixed(2)} Holding BSK`);
            }

            toast({
              title: message,
              description: details.join(' • '),
              duration: 5000,
            });

            // Store the new balance as reference
            previousBalanceRef.current = newBalance;

            // Trigger balance refresh
            onBalanceUpdate();
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime BSK] Subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      console.log('[Realtime BSK] Cleaning up realtime subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, onBalanceUpdate, toast]);

  return {
    isSubscribed: !!channelRef.current
  };
};
