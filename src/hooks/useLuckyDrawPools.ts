import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

interface DrawPool {
  id: string;
  title: string;
  subtitle: string;
  ticket_price_bsk: number;
  pool_size: number;
  current_participants: number;
  prizes: {
    first_place: number;
    second_place: number;
    third_place: number;
  };
  status: 'active' | 'full' | 'completed';
  fee_percent: number;
}

export const useLuckyDrawPools = () => {
  const { user } = useAuthUser();
  const [pools, setPools] = useState<DrawPool[]>([]);
  const [userTickets, setUserTickets] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPools = async () => {
      try {
        // Use program_configs to get draw configurations
        const { data: configs } = await supabase
          .from('program_configs')
          .select('id, config_json, status')
          .eq('status', 'published')
          .eq('is_current', true);

        if (configs) {
          const drawPools = configs
            .filter(c => c.config_json && (c.config_json as any).pool_size)
            .map(c => {
              const cfg = c.config_json as any;
              return {
                id: c.id,
                title: `₹${cfg.ticket_price_bsk || 100} Pool`,
                subtitle: `${cfg.pool_size || 100} tickets`,
                ticket_price_bsk: cfg.ticket_price_bsk || 100,
                pool_size: cfg.pool_size || 100,
                current_participants: cfg.current_participants || 0,
                prizes: cfg.prizes || { first_place: 5000, second_place: 2000, third_place: 1000 },
                status: 'active' as const,
                fee_percent: cfg.fee_percent || 10
              };
            });
          
          setPools(drawPools);
        }

        // Fetch user tickets from user_program_participations
        const { data: participations } = await supabase
          .from('user_program_participations')
          .select('module_id, input_data')
          .eq('user_id', user.id)
          .eq('participation_type', 'lucky_draw');

        if (participations) {
          const ticketCounts: Record<string, number> = {};
          participations.forEach(p => {
            ticketCounts[p.module_id] = (ticketCounts[p.module_id] || 0) + 1;
          });
          setUserTickets(ticketCounts);
        }
      } catch (error) {
        console.error('Error fetching pools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPools();
  }, [user]);

  const purchaseTickets = async (configId: string, ticketCount: number) => {
    if (!user) throw new Error('Not authenticated');

    // Call edge function to handle purchase
    const { data, error } = await supabase.functions.invoke('purchase-draw-tickets', {
      body: { 
        config_id: configId, 
        ticket_count: ticketCount,
        user_id: user.id
      }
    });

    if (error) throw error;
    return data;
  };

  return { pools, userTickets, loading, purchaseTickets };
};
