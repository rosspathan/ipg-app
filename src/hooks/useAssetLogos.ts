import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export const useAssetLogos = () => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadLogo = async (file: File, assetSymbol: string): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a valid image file (JPEG, PNG, GIF, WebP, SVG)",
          variant: "destructive",
        });
        return null;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${assetSymbol.toLowerCase()}.${fileExt}`;
      const filePath = `${Date.now()}-${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('crypto-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });

      return data.path;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Upload Error",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteLogo = async (filePath: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from('crypto-logos')
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Logo deleted successfully",
      });

      return true;
    } catch (error) {
      console.error('Error deleting logo:', error);
      toast({
        title: "Delete Error",
        description: "Failed to delete logo. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const getLogoUrl = (filePath: string | null, fallbackUrl?: string | null): string => {
    if (filePath) {
      return `https://ocblgldglqhlrmtnynmu.supabase.co/storage/v1/object/public/crypto-logos/${filePath}`;
    }
    return fallbackUrl || '/placeholder-crypto.svg';
  };

  return {
    uploadLogo,
    deleteLogo,
    getLogoUrl,
    uploading
  };
};