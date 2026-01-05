import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from './useAuthUser';

export function useAdminCheck() {
  const { user } = useAuthUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user?.id) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(!!data);
        }
      } catch (e) {
        console.error('Admin check exception:', e);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminRole();
  }, [user?.id]);

  return { isAdmin, loading };
}
