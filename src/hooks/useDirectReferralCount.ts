import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export function useDirectReferralCount() {
  const { user } = useAuthUser();

  return useQuery({
    queryKey: ['direct-referral-count', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from('referral_links_new')
        .select('*', { count: 'exact', head: true })
        .eq('sponsor_id', user.id)
        .not('locked_at', 'is', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}
