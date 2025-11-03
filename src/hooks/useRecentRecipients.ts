import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecentRecipient {
  user_id: string;
  email: string;
  display_name?: string;
  full_name?: string;
  avatar_url?: string;
  last_transfer_date: string;
  last_amount: number;
}

export function useRecentRecipients(userId?: string) {
  return useQuery({
    queryKey: ['recent-recipients', userId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = userId || user?.id;
      
      if (!currentUserId) throw new Error('Not authenticated');

      // Fetch recent transfer_out transactions with recipient details
      const { data: transfers, error } = await supabase
        .from('unified_bsk_transactions')
        .select('metadata, amount, created_at')
        .eq('user_id', currentUserId)
        .eq('transaction_type', 'transfer_out')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Extract unique recipients
      const recipientMap = new Map<string, RecentRecipient>();

      for (const transfer of transfers || []) {
        const metadata = transfer.metadata as any;
        const recipientId = metadata?.recipient_id;
        if (!recipientId || recipientMap.has(recipientId)) continue;

        recipientMap.set(recipientId, {
          user_id: recipientId,
          email: metadata?.recipient_email || '',
          display_name: metadata?.recipient_display_name,
          full_name: metadata?.recipient_display_name,
          avatar_url: metadata?.recipient_avatar_url,
          last_transfer_date: transfer.created_at,
          last_amount: Math.abs(transfer.amount),
        });

        if (recipientMap.size >= 5) break;
      }

      return Array.from(recipientMap.values());
    },
    enabled: !!userId || undefined,
  });
}
