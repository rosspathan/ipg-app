import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProgramModule {
  id: string;
  key: string;
  name: string;
  category: string;
  icon: string;
  route: string;
  status: 'draft' | 'scheduled' | 'live' | 'paused' | 'archived';
  order_index: number;
  enabled_regions: string[];
  enabled_roles: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  featured?: boolean;
  trending?: boolean;
  seasonal?: boolean;
  maintenance_mode?: boolean;
  min_app_version?: string;
  tags?: string[];
  media_gallery?: string[];
  seo_metadata?: any;
  localized_content?: any;
  description?: string;
  terms_conditions?: string;
  faqs?: { question: string; answer: string }[];
}

export interface ProgramConfig {
  id: string;
  module_id: string;
  version: number;
  config_json: any;
  schema_json: any;
  notes?: string;
  effective_from?: string;
  effective_to?: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  is_current: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  published_by?: string;
  published_at?: string;
}

export interface ProgramAudit {
  id: string;
  module_id?: string;
  config_id?: string;
  action: string;
  entity_type: string;
  before_json?: any;
  after_json?: any;
  diff_json?: any;
  operator_id: string;
  operator_role?: string;
  notes?: string;
  created_at: string;
}

export function useProgramModules() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: modules, isLoading } = useQuery({
    queryKey: ['program-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_modules')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data as ProgramModule[];
    }
  });

  const createModule = useMutation({
    mutationFn: async (module: Partial<ProgramModule>) => {
      const { data, error } = await supabase
        .from('program_modules')
        .insert([module as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      toast({ title: "Module created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create module", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateModule = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramModule> }) => {
      const { data, error } = await supabase
        .from('program_modules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      toast({ title: "Module updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update module", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('program_modules')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      toast({ title: "Module deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete module", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    modules,
    isLoading,
    createModule: createModule.mutate,
    updateModule: updateModule.mutate,
    deleteModule: deleteModule.mutate
  };
}

export function useProgramConfigs(moduleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: configs, isLoading } = useQuery({
    queryKey: ['program-configs', moduleId],
    queryFn: async () => {
      let query = supabase
        .from('program_configs')
        .select('*')
        .order('version', { ascending: false });
      
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ProgramConfig[];
    },
    enabled: !!moduleId
  });

  const createConfig = useMutation({
    mutationFn: async (config: Partial<ProgramConfig>) => {
      const { data, error } = await supabase
        .from('program_configs')
        .insert([config as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] });
      toast({ title: "Config created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create config", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateConfig = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramConfig> }) => {
      const { data, error } = await supabase
        .from('program_configs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] });
      toast({ title: "Config updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update config", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const publishConfig = useMutation({
    mutationFn: async (configId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('publish_program_config', {
        p_config_id: configId,
        p_operator_id: user.id
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-configs'] });
      queryClient.invalidateQueries({ queryKey: ['program-modules'] });
      toast({ title: "Config published successfully", description: "Changes are now live" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to publish config", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    configs,
    isLoading,
    createConfig: createConfig.mutate,
    updateConfig: updateConfig.mutate,
    publishConfig: publishConfig.mutate
  };
}

export function useProgramAudit(moduleId?: string) {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['program-audit', moduleId],
    queryFn: async () => {
      let query = supabase
        .from('program_audit')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ProgramAudit[];
    }
  });

  return {
    auditLogs,
    isLoading
  };
}

export function useCurrentConfig(moduleKey: string) {
  const { data: config, isLoading } = useQuery({
    queryKey: ['current-config', moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_program_config', {
        p_module_key: moduleKey
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!moduleKey
  });

  return {
    config,
    isLoading
  };
}
