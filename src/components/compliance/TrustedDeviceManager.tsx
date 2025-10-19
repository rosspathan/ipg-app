import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Device {
  id: string;
  device_name: string | null;
  last_ip: string | null;
  last_seen: string | null;
  trusted: boolean;
  is_verified: boolean;
  created_at: string;
}

export const TrustedDeviceManager = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDevices();
    }
  }, [user]);

  const fetchDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user?.id)
        .order('last_seen', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load devices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: 'Device Removed',
        description: 'The device has been removed from your trusted devices.',
      });

      fetchDevices();
    } catch (error) {
      console.error('Error removing device:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove device',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTrust = async (deviceId: string, currentTrust: boolean) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ trusted: !currentTrust })
        .eq('id', deviceId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: currentTrust ? 'Device Untrusted' : 'Device Trusted',
        description: currentTrust
          ? 'This device is no longer trusted.'
          : 'This device is now trusted.',
      });

      fetchDevices();
    } catch (error) {
      console.error('Error toggling trust:', error);
      toast({
        title: 'Error',
        description: 'Failed to update device trust status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Trusted Devices
        </CardTitle>
        <CardDescription>
          Manage devices that can access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices found</p>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-start gap-3 flex-1">
                <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">
                      {device.device_name || 'Unknown Device'}
                    </p>
                    {device.trusted && (
                      <Badge variant="outline" className="gap-1">
                        <Check className="h-3 w-3" />
                        Trusted
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last seen: {device.last_seen ? format(new Date(device.last_seen), 'PPp') : 'Never'}
                  </p>
                  {device.last_ip && (
                    <p className="text-xs text-muted-foreground">IP: {device.last_ip}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleTrust(device.id, device.trusted)}
                >
                  {device.trusted ? 'Untrust' : 'Trust'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
