import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Ad {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_url: string;
  target_regions: string[] | null;
  reward_per_view: number;
  reward_per_click: number;
  budget_total: number;
  budget_used: number;
  status: 'active' | 'paused' | 'exhausted';
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
}

export function useAdInventory() {
  const queryClient = useQueryClient();

  const { data: ads, isLoading } = useQuery({
    queryKey: ['ads-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ads')
        .select(`
          *,
          ad_impressions(count),
          ad_clicks(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((ad: any) => ({
        ...ad,
        impressions: ad.ad_impressions?.[0]?.count || 0,
        clicks: ad.ad_clicks?.[0]?.count || 0,
        ctr: ad.ad_impressions?.[0]?.count 
          ? ((ad.ad_clicks?.[0]?.count || 0) / ad.ad_impressions[0].count * 100).toFixed(2)
          : 0
      })) as Ad[];
    }
  });

  const createAd = useMutation({
    mutationFn: async (newAd: any) => {
      const { data, error } = await supabase
        .from('ads')
        .insert([{ 
          title: newAd.title,
          description: newAd.description,
          image_url: newAd.image_url || '',
          target_url: newAd.target_url,
          target_regions: newAd.target_regions,
          reward_per_view: newAd.reward_per_view || 0,
          reward_per_click: newAd.reward_per_click || 0,
          budget_total: newAd.budget_total || 0,
          budget_used: newAd.budget_used || 0,
          status: newAd.status || 'active'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-inventory'] });
      toast.success('Ad created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create ad: ${error.message}`);
    }
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ad> & { id: string }) => {
      const { data, error } = await supabase
        .from('ads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-inventory'] });
      toast.success('Ad updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update ad: ${error.message}`);
    }
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-inventory'] });
      toast.success('Ad deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete ad: ${error.message}`);
    }
  });

  const toggleAdStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' }) => {
      const { error } = await supabase
        .from('ads')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ads-inventory'] });
      toast.success('Ad status updated');
    }
  });

  return {
    ads: ads || [],
    isLoading,
    createAd: createAd.mutate,
    updateAd: updateAd.mutate,
    deleteAd: deleteAd.mutate,
    toggleAdStatus: toggleAdStatus.mutate
  };
}
