import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Smartphone, Monitor, Tablet, LogOut, Shield, AlertTriangle, Loader2 } from "lucide-react";
import { useSessions } from "@/hooks/useSessions";

const getDeviceIcon = (deviceName: string) => {
  const name = deviceName.toLowerCase();
  if (name.includes('mobile') || name.includes('android') || name.includes('iphone')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (name.includes('tablet') || name.includes('ipad')) {
    return <Tablet className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
};

export const SessionsTab = () => {
  const { devices, loading, updateDevice, terminateSession, terminateAllOthers, currentDevice } = useSessions();
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleTrustToggle = async (deviceId: string, trusted: boolean) => {
    try {
      await updateDevice(deviceId, { trusted });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleTerminateAll = async () => {
    try {
      await terminateAllOthers();
      setConfirmDialog(false);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>Active Sessions</span>
            </div>
            {devices.length > 1 && (
              <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <LogOut className="h-4 w-4 mr-2" />
                    Terminate All Others
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Terminate All Other Sessions</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This will log out all other devices and sessions. You'll remain logged in on this device.
                      </AlertDescription>
                    </Alert>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setConfirmDialog(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleTerminateAll}>
                        Terminate All Others
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No active sessions</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trusted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(device.device_name || 'Unknown')}
                        <div>
                          <p className="font-medium">{device.device_name || 'Unknown Device'}</p>
                          {device.id === currentDevice?.id && (
                            <Badge variant="secondary" className="text-xs">Current</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{device.last_ip || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={device.trusted}
                        onCheckedChange={(trusted) => handleTrustToggle(device.id, trusted)}
                      />
                    </TableCell>
                    <TableCell>
                      {device.id !== currentDevice?.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => terminateSession(device.id)}
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Tips:</strong>
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Mark devices as "trusted" only if you own them</li>
                <li>Regularly review and terminate unknown sessions</li>
                <li>Always log out from public or shared computers</li>
                <li>Enable 2FA for additional security</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">What are trusted devices?</h4>
            <p className="text-sm text-muted-foreground">
              Trusted devices may have reduced security prompts for certain actions. 
              Only mark devices as trusted if you have exclusive access to them.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Session Management</h4>
            <p className="text-sm text-muted-foreground">
              Sessions automatically expire after periods of inactivity based on your security settings. 
              You can manually terminate any session from this page.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};