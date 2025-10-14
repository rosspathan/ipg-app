import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProgramVisibilityRule {
  id: string;
  module_id: string;
  rule_type: 'user_segment' | 'balance_threshold' | 'kyc_level' | 'badge' | 'region' | 'user_age' | 'activity_level';
  rule_config: any;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProgramVisibilityRules(moduleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['program-visibility-rules', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('program_visibility_rules')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('priority', { ascending: true });
      
      if (error) throw error;
      return data as ProgramVisibilityRule[];
    },
    enabled: !!moduleId
  });

  const createRule = useMutation({
    mutationFn: async (newRule: Partial<ProgramVisibilityRule>) => {
      const { data, error } = await supabase
        .from('program_visibility_rules')
        .insert([newRule as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-visibility-rules'] });
      toast({ title: "Visibility rule created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateRule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramVisibilityRule> }) => {
      const { data, error } = await supabase
        .from('program_visibility_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-visibility-rules'] });
      toast({ title: "Visibility rule updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('program_visibility_rules')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-visibility-rules'] });
      toast({ title: "Visibility rule deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete rule", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    rules,
    isLoading,
    createRule: createRule.mutate,
    updateRule: updateRule.mutate,
    deleteRule: deleteRule.mutate
  };
}
