import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SpinSegment {
  id: string;
  config_id: string;
  label: string;
  multiplier: number;
  weight: number;
  color_hex: string;
  position_order: number;
  created_at: string;
}

export function useSpinSegments(configId?: string) {
  const queryClient = useQueryClient();

  const { data: segments, isLoading } = useQuery({
    queryKey: ['spin-segments', configId],
    queryFn: async () => {
      if (!configId) return [];
      
      const { data, error } = await supabase
        .from('ismart_spin_segments')
        .select('*')
        .eq('config_id', configId)
        .order('probability', { ascending: false });

      if (error) throw error;
      return data as SpinSegment[];
    },
    enabled: !!configId
  });

  const saveSegments = useMutation({
    mutationFn: async ({ configId, segments }: { configId: string; segments: any[] }) => {
      // Validate weights sum to 100
      const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
      if (Math.abs(totalWeight - 100) > 1) {
        throw new Error('Weights must sum to 100%');
      }

      // Delete existing segments
      const { error: deleteError } = await supabase
        .from('ismart_spin_segments')
        .delete()
        .eq('config_id', configId);

      if (deleteError) throw deleteError;

      // Insert new segments
      const { data, error } = await supabase
        .from('ismart_spin_segments')
        .insert(segments.map((s, idx) => ({ 
          config_id: configId,
          label: s.label,
          multiplier: s.multiplier,
          weight: s.weight,
          color_hex: s.color_hex,
          position_order: idx,
          is_active: true
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spin-segments'] });
      toast.success('Spin segments saved successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to save segments: ${error.message}`);
    }
  });

  const spinHistory: any[] = [];

  return {
    segments: segments || [],
    spinHistory: spinHistory || [],
    isLoading,
    saveSegments: saveSegments.mutate,
    isValidating: saveSegments.isPending
  };
}
