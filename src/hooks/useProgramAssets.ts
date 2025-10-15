import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProgramAsset {
  url: string;
  path: string;
  type: 'icon' | 'banner' | 'screenshot';
}

export function useProgramAssets(moduleId?: string) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadAsset = async (
    file: File, 
    type: 'icon' | 'banner' | 'screenshot'
  ): Promise<ProgramAsset | null> => {
    if (!moduleId) {
      toast({ 
        title: "Error", 
        description: "Save program first before uploading assets",
        variant: "destructive" 
      });
      return null;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${moduleId}/${type}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('program-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('program-assets')
        .getPublicUrl(data.path);

      toast({ title: "Asset uploaded successfully" });
      
      return {
        url: publicUrl,
        path: data.path,
        type
      };
    } catch (error: any) {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from('program-assets')
        .remove([path]);

      if (error) throw error;
      
      toast({ title: "Asset deleted successfully" });
      return true;
    } catch (error: any) {
      toast({ 
        title: "Delete failed", 
        description: error.message,
        variant: "destructive" 
      });
      return false;
    }
  };

  return {
    uploadAsset,
    deleteAsset,
    uploading
  };
}
