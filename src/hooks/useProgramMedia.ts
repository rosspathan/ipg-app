import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProgramMedia {
  id: string;
  module_id: string;
  media_type: 'icon' | 'banner' | 'thumbnail' | 'video' | 'screenshot';
  file_path: string;
  file_url?: string;
  alt_text?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProgramMedia(moduleId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: media, isLoading } = useQuery({
    queryKey: ['program-media', moduleId],
    queryFn: async () => {
      if (!moduleId) return [];
      
      const { data, error } = await supabase
        .from('program_media')
        .select('*')
        .eq('module_id', moduleId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as ProgramMedia[];
    },
    enabled: !!moduleId
  });

  const createMedia = useMutation({
    mutationFn: async (newMedia: Partial<ProgramMedia>) => {
      const { data, error } = await supabase
        .from('program_media')
        .insert([newMedia as any])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-media'] });
      toast({ title: "Media uploaded successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to upload media", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const updateMedia = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProgramMedia> }) => {
      const { data, error } = await supabase
        .from('program_media')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-media'] });
      toast({ title: "Media updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update media", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const deleteMedia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('program_media')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['program-media'] });
      toast({ title: "Media deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete media", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  return {
    media,
    isLoading,
    createMedia: createMedia.mutate,
    updateMedia: updateMedia.mutate,
    deleteMedia: deleteMedia.mutate
  };
}
