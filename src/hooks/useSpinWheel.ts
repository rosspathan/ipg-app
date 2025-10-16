import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

interface SpinSegment {
  id: string;
  label: string;
  multiplier: number;
  weight: number;
  color_hex: string;
  is_active: boolean;
}

interface SpinConfig {
  min_bet: number;
  max_bet: number;
  free_spins_per_day: number;
  user_free_spins_used: number;
}

export const useSpinWheel = () => {
  const { user } = useAuthUser();
  const [segments, setSegments] = useState<SpinSegment[]>([]);
  const [config, setConfig] = useState<SpinConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch active segments
        const { data: segmentData } = await supabase
          .from('spin_segments')
          .select('*')
          .eq('is_active', true)
          .order('multiplier', { ascending: true });

        // Fetch spin config from program_configs
        const { data: configData } = await supabase
          .from('program_configs')
          .select('config_json')
          .eq('status', 'published')
          .eq('is_current', true)
          .limit(1)
          .single();

        // Get user's spin count today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const { data: spinData } = await supabase
          .from('user_program_participations')
          .select('id')
          .eq('user_id', user.id)
          .eq('participation_type', 'spin')
          .gte('started_at', today.toISOString());

        const freeSpinsUsed = spinData?.length || 0;
        const cfg = configData?.config_json as any;

        setSegments(segmentData || []);
        setConfig({
          min_bet: cfg?.min_bet_bsk || 10,
          max_bet: cfg?.max_bet_bsk || 1000,
          free_spins_per_day: cfg?.free_spins_per_user || 3,
          user_free_spins_used: freeSpinsUsed
        });
      } catch (error) {
        console.error('Error fetching spin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const executeSpin = async (betAmount: number) => {
    if (!user) throw new Error('Not authenticated');

    // Call spin-commit edge function
    const { data, error } = await supabase.functions.invoke('spin-commit', {
      body: { betBsk: betAmount }
    });

    if (error) throw error;

    // Call spin-reveal to get result
    const { data: result, error: revealError } = await supabase.functions.invoke('spin-reveal', {
      body: { 
        server_seed_hash: data.server_seed_hash,
        client_seed: data.client_seed,
        nonce: data.nonce
      }
    });

    if (revealError) throw revealError;

    return {
      winningSegment: result.winning_segment,
      payout: result.payout,
      betAmount,
      ...data
    };
  };

  return { segments, config, loading, executeSpin };
};
