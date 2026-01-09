import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, ShieldAlert, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useToast } from "@/hooks/use-toast";

interface ResetPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResetPinDialog({ open, onOpenChange }: ResetPinDialogProps) {
  const { user } = useAuthUser();
  const { setPin } = useAuthLock();
  const { toast } = useToast();

  const [step, setStep] = useState<'verify' | 'newpin' | 'success'>('verify');
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSixDigit = /^\d{6}$/.test(newPin);
  const confirmMatches = confirmPin === newPin;
  const canSetPin = isSixDigit && confirmMatches;

  const handleVerifyPassword = async () => {
    if (!user?.email || !password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Re-authenticate with email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (signInError) {
        setError("Incorrect password. Please try again.");
        return;
      }

      // Password verified, move to new PIN step
      setStep('newpin');
      setPassword("");
    } catch (err) {
      console.error("Password verification failed:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetNewPin = async () => {
    if (!canSetPin) return;

    setLoading(true);
    setError("");

    try {
      const success = await setPin(newPin);
      if (success) {
        setStep('success');
        
        // Clear lock state for fresh start
        localStorage.setItem('ipg_fresh_setup', 'true');
        
        toast({
          title: "PIN Reset Successful",
          description: "Your new PIN is now active"
        });
      } else {
        setError("Failed to set new PIN. Please try again.");
      }
    } catch (err) {
      console.error("PIN reset failed:", err);
      setError("Failed to reset PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset state when closing
    setStep('verify');
    setPassword("");
    setNewPin("");
    setConfirmPin("");
    setError("");
    onOpenChange(false);
  };

  const handlePinInput = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setter(cleaned);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-warning" />
            Reset PIN
          </DialogTitle>
          <DialogDescription>
            {step === 'verify' && "Verify your identity to reset your PIN"}
            {step === 'newpin' && "Create a new 6-digit PIN"}
            {step === 'success' && "Your PIN has been reset"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'verify' && (
            <>
              <Alert className="bg-warning/10 border-warning/20">
                <AlertDescription className="text-sm">
                  Enter your account password to verify your identity before resetting your PIN.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="reset-password">Account Password</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pr-10"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleVerifyPassword} 
                  disabled={!password || loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify
                </Button>
              </div>
            </>
          )}

          {step === 'newpin' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-pin-reset">New 6-Digit PIN</Label>
                  <div className="relative">
                    <Input
                      id="new-pin-reset"
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newPin}
                      onChange={(e) => handlePinInput(e.target.value, setNewPin)}
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
                  {newPin.length > 0 && !isSixDigit && (
                    <p className="text-xs text-destructive">PIN must be exactly 6 digits</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-pin-reset">Confirm PIN</Label>
                  <Input
                    id="confirm-pin-reset"
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={confirmPin}
                    onChange={(e) => handlePinInput(e.target.value, setConfirmPin)}
                    placeholder="••••••"
                    className="text-center text-lg tracking-widest font-mono"
                  />
                  {confirmPin.length > 0 && !confirmMatches && (
                    <p className="text-xs text-destructive">PINs do not match</p>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('verify')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleSetNewPin} 
                  disabled={!canSetPin || loading}
                  className="flex-1"
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Set New PIN
                </Button>
              </div>
            </>
          )}

          {step === 'success' && (
            <>
              <div className="text-center py-4">
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground">PIN Reset Complete</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your new PIN is now active. Use it for all future transactions and app unlocks.
                </p>
              </div>

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
