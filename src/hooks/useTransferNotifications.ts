import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuthAdmin } from './useAuthAdmin';

const LARGE_TRANSFER_THRESHOLD = 10000; // BSK

export function useTransferNotifications() {
  const { toast } = useToast();
  const { isAdmin } = useAuthAdmin();

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('transfer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bsk_holding_ledger',
          filter: `type=in.(transfer_in,transfer_out)`,
        },
        (payload) => {
          const transfer = payload.new as any;
          const amount = Number(transfer.amount);

          if (amount >= LARGE_TRANSFER_THRESHOLD) {
            toast({
              title: '🚨 Large Transfer Detected',
              description: `${amount.toLocaleString()} BSK transfer - Click to view details`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);
}
