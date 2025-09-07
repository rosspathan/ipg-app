import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Shield, Smartphone, Eye, Clock } from "lucide-react";
import { useSecurity } from "@/hooks/useSecurity";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useToast } from "@/hooks/use-toast";

export const SecurityTab = () => {
  const { security, loginHistory, loading, updateSecurity, setPin, enable2FA, disable2FA } = useSecurity();
  const { toast } = useToast();
  const [pinDialog, setPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [antiPhishing, setAntiPhishing] = useState(security?.anti_phishing_code || "");
  const [spendLimit, setSpendLimit] = useState(security?.spend_daily_limit?.toString() || "0");

  const handleSetPin = async () => {
    if (pinValue.length !== 6) {
      toast({
        title: "Error",
        description: "PIN must be 6 digits",
        variant: "destructive"
      });
      return;
    }

    if (pinValue !== confirmPin) {
      toast({
        title: "Error",
        description: "PINs do not match",
        variant: "destructive"
      });
      return;
    }

    try {
      await setPin(pinValue);
      setPinDialog(false);
      setPinValue("");
      setConfirmPin("");
    } catch (error) {
      // Error handled in hook
    }
  };

  const handle2FAToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await enable2FA();
      } else {
        await disable2FA();
      }
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveAntiPhishing = async () => {
    try {
      await updateSecurity({ anti_phishing_code: antiPhishing });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveSpendLimit = async () => {
    try {
      await updateSecurity({ spend_daily_limit: parseFloat(spendLimit) || 0 });
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
      {/* PIN & Biometrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>PIN Code</Label>
              <p className="text-sm text-muted-foreground">6-digit PIN for secure access</p>
            </div>
            <div className="flex items-center gap-2">
              {security?.pin_set && <Badge variant="secondary">Set</Badge>}
              <Dialog open={pinDialog} onOpenChange={setPinDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    {security?.pin_set ? "Change PIN" : "Set PIN"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set PIN Code</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Enter 6-digit PIN</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        value={pinValue}
                        onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </div>
                    <div>
                      <Label>Confirm PIN</Label>
                      <Input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      />
                    </div>
                    <Button onClick={handleSetPin} className="w-full">
                      Set PIN
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Biometric Authentication</Label>
              <p className="text-sm text-muted-foreground">Use fingerprint or face recognition</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>TOTP 2FA</Label>
              <p className="text-sm text-muted-foreground">
                {security?.has_2fa ? "2FA is enabled" : "Enable 2FA for extra security"}
              </p>
            </div>
            <Switch
              checked={security?.has_2fa || false}
              onCheckedChange={handle2FAToggle}
            />
          </div>
        </CardContent>
      </Card>

      {/* Anti-Phishing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Anti-Phishing Code
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Anti-Phishing Code</Label>
              <p className="text-sm text-muted-foreground">
                This code will appear in all genuine emails from us
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                value={antiPhishing}
                onChange={(e) => setAntiPhishing(e.target.value)}
                placeholder="Enter your code"
                maxLength={20}
              />
              <Button onClick={handleSaveAntiPhishing}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Protection */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Protection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Whitelist Only</Label>
              <p className="text-sm text-muted-foreground">Only allow withdrawals to approved addresses</p>
            </div>
            <Switch
              checked={security?.withdraw_whitelist_only || false}
              onCheckedChange={(checked) => updateSecurity({ withdraw_whitelist_only: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Daily Spend Limit (USD)</Label>
            <p className="text-sm text-muted-foreground">0 = no limit</p>
            <div className="flex gap-2">
              <Input
                type="number"
                value={spendLimit}
                onChange={(e) => setSpendLimit(e.target.value)}
                placeholder="0"
              />
              <Button onClick={handleSaveSpendLimit}>Save</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Login History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginHistory.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.event}</TableCell>
                  <TableCell>{log.ip || 'N/A'}</TableCell>
                  <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};