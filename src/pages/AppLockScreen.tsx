import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Fingerprint, AlertCircle, Loader2, Eye, EyeOff, Delete } from "lucide-react";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { hasLocalSecurity } from "@/utils/localSecurityStorage";
import { supabase } from "@/integrations/supabase/client";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingCard } from "@/components/onboarding/OnboardingCard";
import { motion } from "framer-motion";

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

    // If no local security, redirect to security setup
    if (!hasLocalSecurity()) {
      navigate('/onboarding/security', { replace: true });
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

  const remainingTime = lockState.lockedUntil ? Math.max(0, Math.ceil((lockState.lockedUntil - Date.now()) / 1000)) : 0;
  const isLocked = remainingTime > 0;

  // PIN Display Component
  const PinDisplay = () => (
    <div className="flex justify-center gap-3 mb-8">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="w-12 h-12 rounded-xl border-2 border-white/30 bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all duration-200"
        >
          <div className={`w-3 h-3 rounded-full transition-all duration-200 ${
            i < pin.length ? 'bg-white scale-100' : 'bg-white/30 scale-0'
          }`} />
        </div>
      ))}
    </div>
  );

  // Number Pad Component
  const NumberPad = () => (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Button
          key={num}
          type="button"
          variant="ghost"
          className="h-16 text-2xl font-semibold text-white hover:bg-white/20 hover:text-white rounded-2xl transition-all"
          onClick={() => handleNumberPress(num.toString())}
          disabled={isLocked || loading || biometricLoading}
        >
          {num}
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        className="h-16 hover:bg-white/20 rounded-2xl transition-all"
        onClick={() => setShowPin(!showPin)}
        disabled={isLocked}
      >
        {showPin ? <EyeOff className="w-6 h-6 text-white" /> : <Eye className="w-6 h-6 text-white" />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-16 text-2xl font-semibold text-white hover:bg-white/20 hover:text-white rounded-2xl transition-all"
        onClick={() => handleNumberPress('0')}
        disabled={isLocked || loading || biometricLoading}
      >
        0
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="h-16 hover:bg-white/20 rounded-2xl transition-all"
        onClick={handleDelete}
        disabled={isLocked || loading || biometricLoading}
      >
        <Delete className="w-6 h-6 text-white" />
      </Button>
    </div>
  );

  const handleNumberPress = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (error) setError("");
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    if (error) setError("");
  };

  return (
    <OnboardingLayout gradientVariant="secondary" showAnimatedBackground={true}>
      <div className="flex-1 flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <OnboardingCard variant="glass" className="p-8">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Title & Description */}
            <h2 className="text-2xl font-bold text-white mb-3 text-center">
              App Locked
            </h2>
            <p className="text-white/80 text-base text-center mb-6">
              {isLocked 
                ? `Please wait ${remainingTime} seconds before trying again`
                : "Enter your PIN to unlock the app"
              }
            </p>

            {/* Anti-Phishing Code Display */}
            {antiPhishingCode && (
              <OnboardingCard variant="info" className="mb-6 p-4">
                <div className="flex items-center gap-2 justify-center mb-1">
                  <Shield className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Your Security Code:</span>
                  <span className="text-sm font-mono font-bold text-blue-400">{antiPhishingCode}</span>
                </div>
                <p className="text-xs text-white/70 text-center">
                  Verify this code matches official communications
                </p>
              </OnboardingCard>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="mb-6 bg-red-900/70 border-red-500/50 backdrop-blur-md">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-white">{error}</AlertDescription>
              </Alert>
            )}

            {/* Failed Attempts Warning */}
            {lockState.failedAttempts > 0 && (
              <Alert className="mb-6 bg-orange-900/70 border-orange-500/50 backdrop-blur-md">
                <AlertCircle className="h-4 w-4 text-orange-400" />
                <AlertDescription className="text-white">
                  {lockState.failedAttempts} failed attempt{lockState.failedAttempts > 1 ? 's' : ''}. 
                  {' '}{5 - lockState.failedAttempts} attempts remaining.
                </AlertDescription>
              </Alert>
            )}

            {/* PIN Input or Biometric Loading */}
            {!biometricLoading ? (
              <>
                <PinDisplay />
                <NumberPad />

                {/* Unlock Button */}
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handlePinSubmit(e);
                  }}
                  disabled={pin.length !== 6 || isLocked || loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-6 rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    "Unlock"
                  )}
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Fingerprint className="h-16 w-16 text-white animate-pulse" />
                <div className="text-center space-y-2">
                  <p className="font-medium text-white">Biometric Authentication</p>
                  <p className="text-sm text-white/70">
                    Please verify your identity
                  </p>
                </div>
              </div>
            )}

            {/* Biometric Authentication */}
            {lockState.biometricEnabled && biometricAvailable && !biometricLoading && (
              <div className="space-y-3 mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-black/40 px-2 text-white/70">Or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white py-6 rounded-2xl"
                  onClick={handleBiometricUnlock}
                  disabled={isLocked}
                >
                  <Fingerprint className="h-5 w-5 mr-2" />
                  Use Biometrics
                </Button>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 mt-6 border-t border-white/20 space-y-3">
              {user && (
                <div className="text-center text-sm text-white/70">
                  Signed in as {user.email}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-white/80 hover:text-white hover:bg-black/30"
                  onClick={() => navigate('/recovery/verify')}
                >
                  Forgot PIN?
                </Button>
                
                {user && (
                  <Button
                    variant="ghost" 
                    size="sm"
                    className="flex-1 text-white/80 hover:text-white hover:bg-black/30"
                    onClick={handleSignOut}
                  >
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </OnboardingCard>
        </motion.div>
      </div>
    </OnboardingLayout>
  );
};

export default AppLockScreen;