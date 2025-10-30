import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BadgeConfig {
  id: string;
  tier_name: string;
  tier_level: number;
  purchase_price: number;
  minimum_downline_purchase: number;
  commission_l1_percent: number;
  commission_l2_percent: number;
  commission_l3_percent: number;
  is_active: boolean;
  created_at: string;
}

export function useBadgeManagement() {
  const queryClient = useQueryClient();

  const { data: badges, isLoading: badgesLoading } = useQuery({
    queryKey: ['badge-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('badge_card_config')
        .select('*')
        .order('tier_level', { ascending: true });

      if (error) throw error;
      return data as any[];
    }
  });

  const { data: userBadges } = useQuery({
    queryKey: ['user-badges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badge_holdings')
        .select(`
          *,
          badge:badge_card_config(tier_name, tier_level),
          profile:profiles(username, display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createBadge = useMutation({
    mutationFn: async (newBadge: Partial<BadgeConfig>) => {
      const { data, error } = await supabase
        .from('badge_card_config')
        .insert([newBadge])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-configs'] });
      toast.success('Badge tier created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create badge: ${error.message}`);
    }
  });

  const updateBadge = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BadgeConfig> & { id: string }) => {
      const { data, error } = await supabase
        .from('badge_card_config')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-configs'] });
      toast.success('Badge tier updated successfully');
    }
  });

  const assignBadge = useMutation({
    mutationFn: async ({ userId, badgeId }: { userId: string; badgeId: string }) => {
      const { data, error } = await supabase
        .from('badge_cards_new')
        .insert([{ 
          user_id: userId, 
          current_badge: badgeId
        }] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
      toast.success('Badge assigned successfully');
    }
  });

  return {
    badges: badges || [],
    userBadges: userBadges || [],
    isLoading: badgesLoading,
    createBadge: createBadge.mutate,
    updateBadge: updateBadge.mutate,
    assignBadge: assignBadge.mutate
  };
}