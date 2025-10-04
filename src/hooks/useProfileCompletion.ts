import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface ProfileCompletion {
  user_id: string;
  completion_score: number;
  has_avatar: boolean;
  has_display_name: boolean;
  has_phone: boolean;
  kyc_level?: string;
  last_calculated_at: string;
}

export const useProfileCompletion = () => {
  const { user } = useAuthUser();
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompletion = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data } = await supabase
        .from('profile_completion_new')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCompletion(data as ProfileCompletion);
      } else {
        // Initialize if doesn't exist
        setCompletion({
          user_id: user.id,
          completion_score: 0,
          has_avatar: false,
          has_display_name: false,
          has_phone: false,
          last_calculated_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error fetching profile completion:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletion();
  }, [user]);

  return {
    completion,
    loading,
    refetch: fetchCompletion
  };
};