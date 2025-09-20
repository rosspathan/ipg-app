import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface Device {
  id: string;
  user_id: string;
  device_name?: string;
  last_ip?: string;
  last_seen: string;
  trusted: boolean;
  created_at: string;
}

export const useSessions = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [currentDevice, setCurrentDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);

  const getCurrentDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';
    
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      deviceName = 'Mobile Device';
    } else if (/iPad|Tablet/.test(userAgent)) {
      deviceName = 'Tablet';
    } else {
      deviceName = 'Desktop Computer';
    }

    // Add browser info
    if (userAgent.includes('Chrome')) deviceName += ' (Chrome)';
    else if (userAgent.includes('Firefox')) deviceName += ' (Firefox)';
    else if (userAgent.includes('Safari')) deviceName += ' (Safari)';
    else if (userAgent.includes('Edge')) deviceName += ' (Edge)';

    return deviceName;
  };

  const fetchDevices = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });

      if (error) throw error;

      setDevices(data || []);

      // Try to identify current device or create it
      const deviceName = getCurrentDeviceInfo();
      const existing = data?.find(d => d.device_name === deviceName);
      
      if (existing) {
        setCurrentDevice(existing);
        // Update last seen for current device
        await supabase
          .from('devices')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Create new device entry
        const { data: newDevice, error: createError } = await supabase
          .from('devices')
          .insert([{
            user_id: user.id,
            device_name: deviceName,
            trusted: false,
            last_seen: new Date().toISOString()
          }])
          .select()
          .single();

        if (createError) throw createError;
        
        setCurrentDevice(newDevice);
        setDevices(prev => [newDevice, ...prev]);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: "Error",
        description: "Failed to load session data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDevice = async (deviceId: string, updates: {
    device_name?: string;
    trusted?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .update(updates)
        .eq('id', deviceId)
        .select()
        .single();

      if (error) throw error;

      setDevices(prev => prev.map(d => d.id === deviceId ? data : d));
      
      if (currentDevice?.id === deviceId) {
        setCurrentDevice(data);
      }

      toast({
        title: "Success",
        description: "Device updated successfully",
      });
    } catch (error) {
      console.error('Error updating device:', error);
      toast({
        title: "Error",
        description: "Failed to update device",
        variant: "destructive",
      });
    }
  };

  const terminateSession = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId);

      if (error) throw error;

      setDevices(prev => prev.filter(d => d.id !== deviceId));
      
      toast({
        title: "Success",
        description: "Session terminated successfully",
      });
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: "Error",
        description: "Failed to terminate session",
        variant: "destructive",
      });
    }
  };

  const terminateAllOthers = async () => {
    if (!currentDevice) return;

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('user_id', user?.id)
        .neq('id', currentDevice.id);

      if (error) throw error;

      setDevices([currentDevice]);
      
      toast({
        title: "Success",
        description: "All other sessions terminated",
      });
    } catch (error) {
      console.error('Error terminating sessions:', error);
      toast({
        title: "Error",
        description: "Failed to terminate sessions",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [user]);

  return {
    devices,
    currentDevice,
    loading,
    updateDevice,
    terminateSession,
    terminateAllOthers,
    refetch: fetchDevices
  };
};