import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useSecurity } from "@/hooks/useSecurity";

const SecuritySetupScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setPin, checkBiometricAvailability, saveLockState } = useAuthLock();
  const { updateSecurity } = useSecurity();
  
  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometricAvailability().then(setBiometricAvailable);
  }, [checkBiometricAvailability]);

  const handleComplete = async () => {
    if (pin.length !== 6) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 6 digits",
        variant: "destructive",
      });
      return;
    }

    if (pin !== confirmPin) {
      toast({
        title: "PIN Mismatch",
        description: "PINs do not match",
        variant: "destructive",
      });
      return;
    }

    if (!antiPhishingCode.trim()) {
      toast({
        title: "Anti-Phishing Code Required",
        description: "Please enter an anti-phishing code",
        variant: "destructive",
      });
      return;
    }

    try {
      // Set PIN securely
      const pinSuccess = await setPin(pin);
      if (!pinSuccess) return;

      // Update security settings
      await updateSecurity({
        anti_phishing_code: antiPhishingCode
      });

      // Save biometric preference to lock state
      await saveLockState({
        biometricEnabled: biometricEnabled && biometricAvailable
      });

      toast({
        title: "Security Setup Complete!",
        description: "Your wallet is now secure",
      });

      setTimeout(() => {
        navigate("/auth/lock");
      }, 1500);
    } catch (error) {
      console.error('Security setup failed:', error);
      toast({
        title: "Setup Failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setPinInput(value);
    }
  };

  const handleConfirmPinChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setConfirmPin(value);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background px-6 py-8">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate(-1)}
          className="mr-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-semibold">Security Setup</h1>
      </div>

      <div className="flex-1 flex flex-col max-w-sm mx-auto w-full space-y-6">
        <div className="text-center space-y-2">
          <Shield className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-lg font-semibold text-foreground">
            Secure Your Wallet
          </h2>
          <p className="text-sm text-muted-foreground">
            Set up additional security measures to protect your assets.
          </p>
        </div>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Create PIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">6-Digit PIN</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-lg tracking-widest"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                placeholder="••••••"
                className="text-center text-lg tracking-widest"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="biometric">Enable Biometric Auth</Label>
                <p className="text-xs text-muted-foreground">
                  {biometricAvailable 
                    ? "Use FaceID/Fingerprint for quick access"
                    : "Biometric authentication not available on this device"
                  }
                </p>
              </div>
              <Switch
                id="biometric"
                checked={biometricEnabled}
                onCheckedChange={setBiometricEnabled}
                disabled={!biometricAvailable}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Anti-Phishing Code</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="antiphishing">Custom Code</Label>
              <Input
                id="antiphishing"
                value={antiPhishingCode}
                onChange={(e) => setAntiPhishingCode(e.target.value)}
                placeholder="Enter a memorable phrase"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This code will appear in official emails to verify authenticity
              </p>
            </div>
          </CardContent>
        </Card>

        <Button 
          variant="default" 
          size="lg" 
          onClick={handleComplete}
          className="w-full"
          disabled={!pin || !confirmPin || !antiPhishingCode.trim()}
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
};

export default SecuritySetupScreen;