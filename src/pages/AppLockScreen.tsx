import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, Fingerprint, AlertCircle, Loader2 } from "lucide-react";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { hasLocalSecurity } from "@/utils/localSecurityStorage";
import { supabase } from "@/integrations/supabase/client";

const AppLockScreen = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { lockState, unlockWithPin, unlockWithBiometrics, checkBiometricAvailability } = useAuthLock();
  
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [antiPhishingCode, setAntiPhishingCode] = useState("");

  // Load anti-phishing code
  useEffect(() => {
    const loadAntiPhishing = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('security')
        .select('anti_phishing_code')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data?.anti_phishing_code) {
        setAntiPhishingCode(data.anti_phishing_code);
      }
    };
    loadAntiPhishing();
  }, [user]);

  // Check biometric availability and auto-trigger if enabled
  useEffect(() => {
    const checkAndTriggerBiometrics = async () => {
      const available = await checkBiometricAvailability();
      setBiometricAvailable(available);
      
      // Auto-trigger biometric authentication if enabled and available
      if (available && lockState.biometricEnabled && !error) {
        // Small delay to ensure UI is ready
        setTimeout(() => {
          handleBiometricUnlock();
        }, 500);
      }
    };
    checkAndTriggerBiometrics();
  }, [checkBiometricAvailability, lockState.biometricEnabled]);

  // Redirect if already unlocked or no security set up
  useEffect(() => {
    if (lockState.isUnlocked) {
      navigate('/app/home', { replace: true });
      return;
    }

    // If no local security and no user session, redirect to security setup
    if (!hasLocalSecurity() && !user) {
      navigate('/security-setup', { replace: true });
      return;
    }
  }, [lockState.isUnlocked, user, navigate]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || loading) return;

    setLoading(true);
    setError("");

    try {
      const success = await unlockWithPin(pin);
      if (success) {
        // Restore return path or default to home
        const returnPath = localStorage.getItem('ipg_return_path') || '/app/home';
        localStorage.removeItem('ipg_return_path');
        navigate(returnPath, { replace: true });
      } else {
        setPin(""); // Clear PIN on failure
      }
    } catch (error: any) {
      setError(error.message || "Failed to unlock");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricUnlock = async () => {
    if (!lockState.biometricEnabled || biometricLoading || isLocked) return;

    setBiometricLoading(true);
    setError("");
    setPin(""); // Clear PIN when using biometrics

    try {
      const success = await unlockWithBiometrics();
      if (success) {
        // Restore return path or default to home
        const returnPath = localStorage.getItem('ipg_return_path') || '/app/home';
        localStorage.removeItem('ipg_return_path');
        navigate(returnPath, { replace: true });
      } else {
        setError("Biometric authentication failed. Please use PIN instead.");
      }
    } catch (error: any) {
      setError(error.message || "Biometric authentication failed. Please use PIN instead.");
    } finally {
      setBiometricLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
    if (error) setError(""); // Clear error on input
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      
      // Clear onboarding and user state for consistency
      localStorage.removeItem('ipg_onboarding_state');
      sessionStorage.removeItem('verificationEmail');
      localStorage.removeItem('ipg_user_email');
      localStorage.removeItem('ipg_wallet_address');
      
      navigate('/auth', { replace: true });
    } catch (error) {
      console.error('Sign out failed:', error);
      // Clear state even on error
      localStorage.removeItem('ipg_onboarding_state');
      navigate('/auth', { replace: true });
    }
  };

  const remainingTime = lockState.lockedUntil ? Math.ceil((lockState.lockedUntil - Date.now()) / 1000) : 0;
  const isLocked = remainingTime > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Shield className="h-16 w-16 text-primary" />
              <div className="absolute -top-2 -right-2 bg-background rounded-full p-1">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
          <CardTitle className="text-2xl">App Locked</CardTitle>
          <CardDescription>
            {isLocked 
              ? `Please wait ${remainingTime} seconds before trying again`
              : "Enter your PIN to unlock the app"
            }
          </CardDescription>
          
          {/* Anti-Phishing Code Display */}
          {antiPhishingCode && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 justify-center">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Your Security Code:</span>
                <span className="text-sm font-mono font-bold text-primary">{antiPhishingCode}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Verify this code matches official communications
              </p>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {lockState.failedAttempts > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {lockState.failedAttempts} failed attempt{lockState.failedAttempts > 1 ? 's' : ''}. 
                {5 - lockState.failedAttempts} attempts remaining.
              </AlertDescription>
            </Alert>
          )}

          {!biometricLoading && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    autoComplete="current-password"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => handlePinChange(e.target.value)}
                    placeholder="••••••"
                    className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={isLocked || loading}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowPin(!showPin)}
                    disabled={isLocked}
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full"
                size="lg"
                disabled={pin.length !== 6 || isLocked || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  "Unlock"
                )}
              </Button>
            </form>
          )}

          {/* Show biometric loading state when authenticating */}
          {biometricLoading && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
              <div className="text-center space-y-2">
                <p className="font-medium">Biometric Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Please verify your identity
                </p>
              </div>
            </div>
          )}

          {/* Biometric Authentication */}
          {lockState.biometricEnabled && biometricAvailable && (
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleBiometricUnlock}
                disabled={isLocked || biometricLoading}
              >
                {biometricLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Use Biometrics
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            {user && (
              <div className="text-center text-sm text-muted-foreground">
                Signed in as {user.email}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => navigate('/recovery/verify')}
              >
                Forgot PIN?
              </Button>
              
              {user && (
                <Button
                  variant="ghost" 
                  size="sm"
                  className="flex-1"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppLockScreen;