import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Clock, 
  Key, 
  Eye, 
  EyeOff, 
  Fingerprint,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RecoveryPhraseReveal from "./RecoveryPhraseReveal";
const SecurityTab = () => {
  const { user } = useAuth();
  const { 
    lockState, 
    setPin, 
    checkBiometricAvailability, 
    saveLockState 
  } = useAuthLock();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [showPins, setShowPins] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [settings, setSettings] = useState({
    biometricEnabled: false,
    requireOnActions: true,
    sessionLockMinutes: 5,
    antiPhishingCode: ""
  });

  const isPinValid = /^\d{6}$/.test(newPin);
  const pinsMatch = newPin === confirmNewPin;
  const canUpdatePin = isPinValid && pinsMatch && currentPin.length === 6;

  // Load security settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [securityResult, biometricCheck] = await Promise.all([
          supabase.from('security').select('*').eq('user_id', user.id).maybeSingle(),
          checkBiometricAvailability()
        ]);

        setBiometricAvailable(biometricCheck);

        setSettings({
          biometricEnabled: securityResult.data?.biometric_enabled || false,
          requireOnActions: true, // Default value
          sessionLockMinutes: 5, // Default value
          antiPhishingCode: securityResult.data?.anti_phishing_code || ""
        });
      } catch (error) {
        console.error('Failed to load security settings:', error);
        toast({
          title: "Error",
          description: "Failed to load security settings",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, checkBiometricAvailability, toast]);

  const updateSetting = async (key: keyof typeof settings, value: any) => {
    if (!user) return;

    setLoading(true);
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);

      // Update database
      if (key === 'biometricEnabled' || key === 'antiPhishingCode') {
        await supabase
          .from('security')
          .upsert({
            user_id: user.id,
            biometric_enabled: key === 'biometricEnabled' ? value : settings.biometricEnabled,
            anti_phishing_code: key === 'antiPhishingCode' ? value : settings.antiPhishingCode
          }, { onConflict: 'user_id' });
      } else {
        // For settings not stored in security table, just update local state
        setSettings(newSettings);
      }

      // Update lock state
      await saveLockState({
        biometricEnabled: newSettings.biometricEnabled,
        requireOnActions: newSettings.requireOnActions,
        sessionLockMinutes: newSettings.sessionLockMinutes
      });

      toast({
        title: "Settings Updated",
        description: "Security settings have been saved",
      });
    } catch (error) {
      console.error('Failed to update setting:', error);
      toast({
        title: "Error",
        description: "Failed to update security setting",
        variant: "destructive"
      });
      // Revert local change
      setSettings(settings);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = async () => {
    if (!canUpdatePin) return;

    setLoading(true);
    try {
      // Verify current PIN first
      const { data: security } = await supabase
        .from('security')
        .select('pin_hash')
        .eq('user_id', user.id)
        .single();

      if (security?.pin_hash) {
        const bcrypt = await import('bcryptjs');
        const isValid = await bcrypt.compare(currentPin, security.pin_hash);
        
        if (!isValid) {
          toast({
            title: "Incorrect PIN",
            description: "Current PIN is incorrect",
            variant: "destructive"
          });
          return;
        }
      }

      // Set new PIN
      const success = await setPin(newPin);
      if (success) {
        setChangingPin(false);
        setCurrentPin("");
        setNewPin("");
        setConfirmNewPin("");
      }
    } catch (error) {
      console.error('Failed to change PIN:', error);
      toast({
        title: "Error",
        description: "Failed to change PIN",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !settings.antiPhishingCode) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* PIN Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            PIN Management
          </CardTitle>
          <CardDescription>
            Manage your 6-digit PIN for app security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!changingPin ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">PIN Protection</p>
                <p className="text-sm text-muted-foreground">
                  Your PIN is set and active
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setChangingPin(true)}
              >
                Change PIN
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-pin">Current PIN</Label>
                <div className="relative">
                  <Input
                    id="current-pin"
                    type={showPins ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className="pr-10 text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setShowPins(!showPins)}
                  >
                    {showPins ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-pin">New PIN</Label>
                <Input
                  id="new-pin"
                  type={showPins ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="text-center"
                />
                {newPin.length > 0 && !isPinValid && (
                  <p className="text-xs text-destructive">PIN must be exactly 6 digits</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-pin">Confirm New PIN</Label>
                <Input
                  id="confirm-new-pin"
                  type={showPins ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmNewPin}
                  onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className="text-center"
                />
                {confirmNewPin.length > 0 && !pinsMatch && (
                  <p className="text-xs text-destructive">PINs do not match</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setChangingPin(false);
                    setCurrentPin("");
                    setNewPin("");
                    setConfirmNewPin("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handlePinChange}
                  disabled={!canUpdatePin || loading}
                  className="flex-1"
                >
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Update PIN
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Phrase Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Backup Recovery Phrase
          </CardTitle>
          <CardDescription>
            View your 12-word recovery phrase to backup your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recovery Phrase</p>
              <p className="text-sm text-muted-foreground">
                Your 12-word phrase is the only way to recover your wallet
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => setShowRecoveryPhrase(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Reveal
            </Button>
          </div>
          
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Never share your recovery phrase. IPG support will never ask for it.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <RecoveryPhraseReveal 
        open={showRecoveryPhrase} 
        onOpenChange={setShowRecoveryPhrase} 
      />

      {/* Biometric Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5" />
            Biometric Authentication
          </CardTitle>
          <CardDescription>
            Use your fingerprint or face ID for quick access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">Biometric Unlock</p>
                {!biometricAvailable && (
                  <Badge variant="secondary">Not Available</Badge>
                )}
                {biometricAvailable && settings.biometricEnabled && (
                  <Badge variant="default">Active</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {biometricAvailable 
                  ? "Quick unlock with your fingerprint or face"
                  : "Biometric authentication not available on this device"
                }
              </p>
            </div>
            <Switch
              checked={settings.biometricEnabled}
              onCheckedChange={(checked) => updateSetting('biometricEnabled', checked)}
              disabled={!biometricAvailable || loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Session Security
          </CardTitle>
          <CardDescription>
            Control when and how your app locks automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require PIN for Sensitive Actions</p>
              <p className="text-sm text-muted-foreground">
                Ask for PIN when sending funds or changing settings
              </p>
            </div>
            <Switch
              checked={settings.requireOnActions}
              onCheckedChange={(checked) => updateSetting('requireOnActions', checked)}
              disabled={loading}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="session-timeout">Auto-lock timeout (minutes)</Label>
            <Input
              id="session-timeout"
              type="number"
              min="1"
              max="60"
              value={settings.sessionLockMinutes}
              onChange={(e) => updateSetting('sessionLockMinutes', parseInt(e.target.value) || 5)}
              className="max-w-[120px]"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              App will lock automatically after this time of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Phishing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Anti-Phishing Protection
          </CardTitle>
          <CardDescription>
            Verify authentic emails with your personal security code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phishing-code">Your Security Code</Label>
            <Input
              id="phishing-code"
              value={settings.antiPhishingCode}
              onChange={(e) => updateSetting('antiPhishingCode', e.target.value)}
              placeholder="Enter a memorable phrase"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              This code will appear in official emails from IPG i-SMART to verify authenticity
            </p>
          </div>

          {settings.antiPhishingCode && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Your security code:</strong> {settings.antiPhishingCode}
                <br />
                <span className="text-xs">
                  Always verify this code appears in official emails before taking any action.
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">PIN Protection</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">Biometric Authentication</span>
            {settings.biometricEnabled ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Anti-Phishing Code</span>
            {settings.antiPhishingCode ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Session Auto-lock</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityTab;