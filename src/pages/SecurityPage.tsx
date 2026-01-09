import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Lock, Fingerprint, Smartphone, Shield, Eye, EyeOff,
  LogOut, Key, CheckCircle, Trash2, KeyRound
} from "lucide-react";
import RecoveryPhraseReveal from "@/components/profile/RecoveryPhraseReveal";
import { ResetLocalWalletButton } from "@/components/profile/ResetLocalWalletButton";
import { ResetPinDialog } from "@/components/security/ResetPinDialog";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useSecurity } from "@/hooks/useSecurity";
import { useAuthLock } from "@/hooks/useAuthLock";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { clearAllLocalWalletData } from "@/utils/walletStorage";
import { useWeb3 } from "@/contexts/Web3Context";

export function SecurityPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { security, loginHistory, updateSecurity } = useSecurity();
  const { lockState, setPin: setPinLock, checkBiometricAvailability } = useAuthLock();
  
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [showResetPin, setShowResetPin] = useState(false);
  const [antiPhishingInput, setAntiPhishingInput] = useState("");

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricAvailable);
    fetchDevices();
    if (security?.anti_phishing_code) {
      setAntiPhishingInput(security.anti_phishing_code);
    }
  }, [security?.anti_phishing_code]);

  const fetchDevices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('security_devices_new')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_seen', { ascending: false });
    
    if (data) setDevices(data);
  };

  const handleBack = () => navigate("/app/profile");

  const handlePinChange = async () => {
    if (newPin.length !== 6 || confirmPin.length !== 6) {
      toast({ title: "Error", description: "PIN must be 6 digits", variant: "destructive" });
      return;
    }

    if (newPin !== confirmPin) {
      toast({ title: "Error", description: "PINs don't match", variant: "destructive" });
      return;
    }

    try {
      await setPinLock(newPin);
      setChangingPin(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      toast({ title: "Success", description: "PIN updated successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update PIN", variant: "destructive" });
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    try {
      await supabase
        .from('security_devices_new')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', deviceId);
      
      toast({ title: "Success", description: "Device revoked" });
      fetchDevices();
    } catch (error) {
      toast({ title: "Error", description: "Failed to revoke device", variant: "destructive" });
    }
  };

  const handleLogoutAll = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth/login");
    } catch (error) {
      toast({ title: "Error", description: "Failed to logout", variant: "destructive" });
    }
  };


  return (
    <div className="min-h-screen bg-background pb-32" data-testid="page-security">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-medium">Security Center</span>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="overflow-y-auto space-y-4 pt-6 px-4">
        {/* Security Status */}
        <Card className="p-4 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Security Score
              </h3>
              <p className="text-sm text-muted-foreground">
                {security?.pin_set && security?.has_2fa ? 'Strong' : 'Medium'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {security?.pin_set && <CheckCircle className="h-5 w-5 text-success" />}
              {security?.has_2fa && <Shield className="h-5 w-5 text-success" />}
            </div>
          </div>
        </Card>

        {/* PIN & Biometrics */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                PIN & Biometrics
              </h3>
              <p className="text-sm text-muted-foreground">Secure your app</p>
            </div>
          </div>

          <div className="space-y-4">
            {!changingPin ? (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">6-Digit PIN</p>
                  <p className="text-xs text-muted-foreground">
                    {security?.pin_set ? 'PIN is set' : 'No PIN set'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChangingPin(true)}
                >
                  {security?.pin_set ? 'Change' : 'Set'} PIN
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-4 bg-background rounded-lg">
                <div>
                  <Label>New PIN</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPins ? "text" : "password"}
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="font-mono"
                    />
                    <button
                      onClick={() => setShowPins(!showPins)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Confirm PIN</Label>
                  <Input
                    type={showPins ? "text" : "password"}
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="font-mono mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setChangingPin(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePinChange}
                    disabled={newPin.length !== 6 || confirmPin.length !== 6}
                    className="flex-1"
                  >
                    Save PIN
                  </Button>
                </div>
              </div>
            )}

            {/* Forgot PIN option */}
            {security?.pin_set && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setShowResetPin(true)}
                className="text-muted-foreground hover:text-primary p-0 h-auto"
              >
                <KeyRound className="h-3 w-3 mr-1" />
                Forgot PIN?
              </Button>
            )}

            {biometricAvailable && (
              <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Biometric Unlock</p>
                    <p className="text-xs text-muted-foreground">Face ID / Fingerprint</p>
                  </div>
                </div>
              <Switch
                  checked={lockState.biometricEnabled || false}
                  onCheckedChange={async (checked) => {
                    toast({ title: "Success", description: `Biometric ${checked ? 'enabled' : 'disabled'}` });
                  }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* 2FA / TOTP */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Two-Factor Authentication
              </h3>
              <p className="text-sm text-muted-foreground">Extra layer of security</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div>
              <p className="text-sm font-medium text-foreground">TOTP Authenticator</p>
              <p className="text-xs text-muted-foreground">
                {security?.has_2fa ? 'Enabled' : 'Not enabled'}
              </p>
            </div>
            <Switch
              checked={security?.has_2fa || false}
              onCheckedChange={async (checked) => {
                try {
                  await updateSecurity({ has_2fa: checked });
                  toast({ title: "Success", description: `2FA ${checked ? 'enabled' : 'disabled'}` });
                } catch (error) {
                  toast({ title: "Error", description: "Failed to toggle 2FA", variant: "destructive" });
                }
              }}
            />
          </div>
        </Card>

        {/* Devices & Sessions */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Devices & Sessions
              </h3>
              <p className="text-sm text-muted-foreground">{devices.length} active devices</p>
            </div>
          </div>

          <div className="space-y-2">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {device.device_name || 'Unknown Device'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Last seen: {new Date(device.last_seen).toLocaleString()}
                  </p>
                  {device.ip_address && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {device.ip_address}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRevokeDevice(device.id)}
                  className="text-danger"
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            onClick={handleLogoutAll}
            className="w-full mt-4 border-danger/30 text-danger hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout All Devices
          </Button>
        </Card>

        {/* Login History */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Recent Login Activity
          </h3>

          <div className="space-y-2">
            {loginHistory.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-background rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{entry.event}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                  {entry.ip && (
                    <p className="text-xs text-muted-foreground font-mono">{entry.ip}</p>
                  )}
                </div>
                <CheckCircle className="h-4 w-4 text-success" />
              </div>
            ))}

            {loginHistory.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent login activity
              </p>
            )}
          </div>
        </Card>

        {/* Seed Phrase Safety */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Seed Phrase
              </h3>
              <p className="text-sm text-muted-foreground">Recovery words</p>
            </div>
          </div>

          <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg mb-4">
            <p className="text-sm text-warning font-medium">⚠️ Never share your seed phrase</p>
            <p className="text-xs text-muted-foreground mt-1">
              Anyone with your seed phrase can access your funds
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => setShowRecoveryPhrase(true)}
            className="w-full"
          >
            Reveal 12 Words
          </Button>

          <RecoveryPhraseReveal 
            open={showRecoveryPhrase} 
            onOpenChange={setShowRecoveryPhrase} 
          />
          
          <ResetLocalWalletButton userId={user?.id} />
        </Card>

        {/* Anti-Phishing */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Anti-Phishing Code
          </h3>

          <div>
            <Label>Your Security Code</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={antiPhishingInput}
                onChange={(e) => setAntiPhishingInput(e.target.value)}
                placeholder="Enter a personal code"
                maxLength={20}
                className="flex-1"
              />
              <Button
                onClick={() => updateSecurity({ anti_phishing_code: antiPhishingInput })}
                size="sm"
              >
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This code will appear in official emails from i-Smart
            </p>
          </div>
        </Card>

        {/* Spend Limits & Whitelist */}
        <Card className="p-6 bg-card/60 backdrop-blur-xl border-border/40">
          <h3 className="font-heading text-base font-bold text-foreground mb-4">
            Transaction Controls
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Daily Spend Limit</p>
                <p className="text-xs text-muted-foreground">Maximum daily transaction limit</p>
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  value={security?.spend_daily_limit || 0}
                  onChange={(e) => updateSecurity({ spend_daily_limit: parseFloat(e.target.value) || 0 })}
                  className="w-24 text-right"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">BSK</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-background rounded-lg">
              <div>
                <p className="text-sm font-medium text-foreground">Whitelist Only</p>
                <p className="text-xs text-muted-foreground">Only allow withdrawals to whitelisted addresses</p>
              </div>
              <Switch
                checked={security?.withdraw_whitelist_only || false}
                onCheckedChange={(checked) => updateSecurity({ withdraw_whitelist_only: checked })}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Reset PIN Dialog */}
      <ResetPinDialog open={showResetPin} onOpenChange={setShowResetPin} />
    </div>
  );
}