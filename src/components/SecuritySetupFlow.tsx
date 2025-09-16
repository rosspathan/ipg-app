import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, Fingerprint, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useToast } from "@/hooks/use-toast";

interface SecuritySetupFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip?: () => void;
  mandatory?: boolean;
}

const SecuritySetupFlow = ({ isOpen, onComplete, onSkip, mandatory = false }: SecuritySetupFlowProps) => {
  const { user } = useAuth();
  const { setPin, checkBiometricAvailability } = useAuthLock();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'welcome' | 'pin' | 'complete'>('welcome');
  const [pin, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  const isSixDigit = /^\d{6}$/.test(pin);
  const confirmStarted = confirmPin.length > 0;
  const confirmMatches = confirmPin === pin;
  const canProceed = isSixDigit && confirmMatches;

  useEffect(() => {
    const checkBiometrics = async () => {
      const available = await checkBiometricAvailability();
      setBiometricAvailable(available);
    };
    checkBiometrics();
  }, [checkBiometricAvailability]);

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPinInput(cleaned);
  };

  const handleConfirmPinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(cleaned);
  };

  const handleComplete = async () => {
    if (!canProceed) return;

    setLoading(true);
    try {
      const success = await setPin(pin);
      if (success) {
        localStorage.setItem('cryptoflow_lock_state', JSON.stringify({
          isUnlocked: true,
          lastUnlockAt: Date.now(),
          failedAttempts: 0,
          lockedUntil: null,
          biometricEnabled: biometricEnabled && biometricAvailable,
          requireOnActions: true,
          sessionLockMinutes: 5
        }));

        toast({
          title: "Security Setup Complete",
          description: "Your account is now secure with PIN protection.",
        });

        onComplete();
      }
    } catch (error) {
      console.error('Security setup failed:', error);
      toast({
        title: "Setup Error",
        description: "Failed to complete security setup.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={mandatory ? undefined : () => onSkip?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Security Setup</DialogTitle>
          <DialogDescription>
            Set up PIN protection for your account
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Create Your PIN</h3>
            <p className="text-sm text-muted-foreground">
              Choose a 6-digit PIN to secure your account
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">6-Digit PIN</Label>
              <div className="relative">
                <Input
                  id="new-pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-lg tracking-widest font-mono"
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
              {pin.length > 0 && !isSixDigit && (
                <p className="text-xs text-destructive">PIN must be exactly 6 digits</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                placeholder="••••••"
                className="text-center text-lg tracking-widest font-mono"
              />
              {confirmStarted && !confirmMatches && (
                <p className="text-xs text-destructive">PINs do not match</p>
              )}
            </div>
          </div>

          {biometricAvailable && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="biometric-toggle">Biometric Authentication</Label>
                  <p className="text-xs text-muted-foreground">
                    Use fingerprint or face ID for quick access
                  </p>
                </div>
                <Switch
                  id="biometric-toggle"
                  checked={biometricEnabled}
                  onCheckedChange={setBiometricEnabled}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!mandatory && onSkip && (
              <Button variant="outline" onClick={onSkip} className="flex-1">
                Skip for Now
              </Button>
            )}
            <Button 
              onClick={handleComplete} 
              disabled={!canProceed || loading}
              className="flex-1"
            >
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Complete Setup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecuritySetupFlow;