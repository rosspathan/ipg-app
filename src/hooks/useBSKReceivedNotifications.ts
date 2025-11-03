import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function useBSKReceivedNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user?.id) return;

      channel = supabase
        .channel(`bsk-received-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'unified_bsk_transactions',
            filter: `user_id=eq.${user.id},transaction_type=eq.transfer_in`,
          },
          (payload) => {
            const transfer = payload.new as any;
            const amount = Math.abs(transfer.amount);
            const senderName = transfer.metadata?.sender_display_name || 'Someone';

            toast({
              title: '🎉 BSK Received!',
              description: `You received ${amount.toLocaleString()} BSK from ${senderName}`,
            });

            // Refresh balance
            queryClient.invalidateQueries({ queryKey: ['user-bsk-balance'] });
            queryClient.invalidateQueries({ queryKey: ['unified-bsk-history'] });
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [toast, queryClient]);
}
