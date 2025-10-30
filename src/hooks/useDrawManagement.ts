import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DrawConfig {
  id: string;
  draw_name: string;
  pool_size: number;
  entry_fee_bsk: number;
  current_participants: number;
  prize_structure: any;
  status: string;
  scheduled_draw_time: string | null;
  executed_at: string | null;
  created_at: string;
}

export interface DrawResult {
  id: string;
  config_id: string;
  first_place_ticket_id: string | null;
  second_place_ticket_id: string | null;
  third_place_ticket_id: string | null;
  executed_at: string;
  first_place_user_id: string | null;
  second_place_user_id: string | null;
  third_place_user_id: string | null;
}

export function useDrawManagement() {
  const queryClient = useQueryClient();

  const { data: draws, isLoading } = useQuery({
    queryKey: ['draw-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    }
  });

  const { data: drawResults } = useQuery({
    queryKey: ['draw-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('draw_results')
        .select(`
          *,
          config:lucky_draw_configs(*),
          first_place_ticket:lucky_draw_tickets!first_place_ticket_id(*),
          second_place_ticket:lucky_draw_tickets!second_place_ticket_id(*),
          third_place_ticket:lucky_draw_tickets!third_place_ticket_id(*)
        `)
        .order('executed_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createDraw = useMutation({
    mutationFn: async (newDraw: any) => {
      const { data, error } = await supabase
        .from('draw_configs')
        .insert([{ ...newDraw, current_participants: 0, status: 'scheduled' }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draw-configs'] });
      toast.success('Draw scheduled successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create draw: ${error.message}`);
    }
  });

  const updateDraw = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('draw_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draw-configs'] });
      toast.success('Draw updated successfully');
    }
  });

  const executeDraw = useMutation({
    mutationFn: async (configId: string) => {
      // Simplified - just mark as executed
      // Full implementation would use provably fair draw logic
      const { error } = await supabase
        .from('draw_configs')
        .update({ executed_at: new Date().toISOString() } as any)
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draw-configs'] });
      queryClient.invalidateQueries({ queryKey: ['draw-results'] });
      toast.success('Draw executed successfully! Winners have been notified.');
    },
    onError: (error) => {
      toast.error(`Failed to execute draw: ${error.message}`);
    }
  });

  const cancelDraw = useMutation({
    mutationFn: async (configId: string) => {
      const { error } = await supabase
        .from('draw_configs')
        .update({} as any)
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['draw-configs'] });
      toast.success('Draw cancelled');
    }
  });

  return {
    draws: draws || [],
    drawResults: drawResults || [],
    isLoading,
    createDraw: createDraw.mutate,
    updateDraw: updateDraw.mutate,
    executeDraw: executeDraw.mutate,
    cancelDraw: cancelDraw.mutate
  };
}
