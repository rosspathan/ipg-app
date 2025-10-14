import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export interface UserDevice {
  id: string;
  device_name: string;
  device_type: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  browser?: string;
  os?: string;
  ip_address?: string;
  last_active_at: string;
  created_at: string;
  is_current: boolean;
}

export const useDevices = () => {
  const { user } = useAuthUser();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_active_at', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user.id);

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (error) {
      console.error('Error removing device:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  return {
    devices,
    loading,
    removeDevice,
    refetch: fetchDevices
  };
};
