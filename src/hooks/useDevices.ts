import { useState, useEffect } from 'react';
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

// Mock devices for now until migration completes
const getMockDevices = (userId: string): UserDevice[] => [
  {
    id: '1',
    device_name: 'Chrome on Windows',
    device_type: 'desktop',
    browser: 'Chrome',
    os: 'Windows 11',
    ip_address: '192.168.1.1',
    last_active_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    is_current: true
  }
];

export const useDevices = () => {
  const { user } = useAuthUser();
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Use mock data for now
      const mockData = getMockDevices(user.id);
      setDevices(mockData);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (!user) return;

    try {
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
