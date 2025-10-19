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
        // Fetch active draw templates
        const { data: templates, error: templatesError } = await supabase
          .from('draw_templates')
          .select('*')
          .eq('is_active', true)
          .order('ticket_price_bsk', { ascending: true });

        if (templatesError) throw templatesError;

        if (templates) {
          const drawPools = templates.map(t => ({
            id: t.id,
            title: t.title || `₹${t.ticket_price_bsk} Pool`,
            subtitle: t.description || `${t.pool_size} tickets`,
            ticket_price_bsk: t.ticket_price_bsk,
            pool_size: t.pool_size,
            current_participants: 0, // Will be calculated from tickets
            prizes: t.prizes as any,
            status: 'active' as const,
            fee_percent: t.fee_percent
          }));
          
          setPools(drawPools);

          // Count tickets per pool
          if (drawPools.length > 0) {
            const { data: allTickets } = await (supabase as any)
              .from('lucky_draw_tickets')
              .select('config_id')
              .in('config_id', drawPools.map(p => p.id));

            if (allTickets) {
              const participantCounts: Record<string, number> = {};
              allTickets.forEach((t: any) => {
                participantCounts[t.config_id] = (participantCounts[t.config_id] || 0) + 1;
              });

              // Update pools with participant counts
              setPools(prev => prev.map(p => ({
                ...p,
                current_participants: participantCounts[p.id] || 0
              })));
            }
          }
        }

        // Fetch user's ticket counts per draw
        const { data: userTicketsData } = await (supabase as any)
          .from('lucky_draw_tickets')
          .select('config_id')
          .eq('user_id', user.id);

        if (userTicketsData) {
          const ticketCounts: Record<string, number> = {};
          userTicketsData.forEach((t: any) => {
            ticketCounts[t.config_id] = (ticketCounts[t.config_id] || 0) + 1;
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

  const purchaseTickets = async (drawId: string, ticketCount: number) => {
    if (!user) throw new Error('Not authenticated');

    // Call edge function to handle purchase
    const { data, error } = await supabase.functions.invoke('purchase-draw-tickets', {
      body: { 
        drawId,
        ticketCount
      }
    });

    if (error) throw error;
    return data;
  };

  return { pools, userTickets, loading, purchaseTickets };
};
