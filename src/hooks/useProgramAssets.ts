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

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({ 
        title: "File too large", 
        description: "Maximum file size is 5MB",
        variant: "destructive" 
      });
      return null;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({ 
        title: "Invalid file type", 
        description: "Only JPEG, PNG, WEBP, and SVG files are allowed",
        variant: "destructive" 
      });
      return null;
    }

    setUploading(true);
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
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

        setUploading(false);
        toast({ title: "Asset uploaded successfully" });
        
        return {
          url: publicUrl,
          path: data.path,
          type
        };
      } catch (error: any) {
        retryCount++;
        
        if (retryCount >= maxRetries) {
          toast({ 
            title: "Upload failed", 
            description: error.message || "Please try again later",
            variant: "destructive" 
          });
          setUploading(false);
          return null;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
    
    setUploading(false);
    return null;
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
