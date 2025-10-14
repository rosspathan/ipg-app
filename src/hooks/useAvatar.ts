import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface UserAvatar {
  id: string;
  user_id: string;
  original_path: string;
  thumb_1x_path: string;
  thumb_2x_path?: string;
  thumb_3x_path?: string;
  created_at: string;
  updated_at: string;
}

export const useAvatar = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [avatar, setAvatar] = useState<UserAvatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchAvatar = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('user_avatars_new')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setAvatar(data as UserAvatar);
      }
    } catch (error) {
      console.error('Error fetching avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setUploading(true);
      
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        throw new Error('Please upload a JPG, PNG, or WEBP image');
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be smaller than 5MB');
      }
      
      // Validate dimensions
      const img = await createImageBitmap(file);
      if (img.width < 256 || img.height < 256) {
        throw new Error('Image must be at least 256×256 pixels');
      }
      
      // Upload original
      const fileName = `${user.id}/avatar_${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // For now, use same path for all sizes (optimization can be added later)
      const { data: avatarData, error: dbError } = await supabase
        .from('user_avatars_new')
        .upsert({
          user_id: user.id,
          original_path: fileName,
          thumb_1x_path: fileName,
          thumb_2x_path: fileName,
          thumb_3x_path: fileName,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setAvatar(avatarData as UserAvatar);
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const getAvatarUrl = (size: '1x' | '2x' | '3x' = '1x') => {
    if (!avatar) return null;
    
    const path = size === '1x' ? avatar.thumb_1x_path : 
                 size === '2x' ? (avatar.thumb_2x_path || avatar.thumb_1x_path) :
                 (avatar.thumb_3x_path || avatar.thumb_1x_path);
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(path);
    
    return data.publicUrl;
  };

  useEffect(() => {
    fetchAvatar();
  }, [user]);

  return {
    avatar,
    loading,
    uploading,
    uploadAvatar,
    getAvatarUrl,
    refetch: fetchAvatar
  };
};