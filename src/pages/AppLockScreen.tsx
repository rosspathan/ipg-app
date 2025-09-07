import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Fingerprint, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthLock } from "@/hooks/useAuthLock";
import { useAuthUser } from "@/hooks/useAuthUser";
import cryptoLogo from "@/assets/crypto-logo.jpg";

const AppLockScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuthUser();
  const { 
    lockState, 
    unlockWithPin, 
    unlockWithBiometrics, 
    checkBiometricAvailability 
  } = useAuthLock();
  
  const [pin, setPin] = useState("");
  const [shakeError, setShakeError] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth/login');
      return;
    }

    // Check biometric availability
    checkBiometricAvailability().then(setBiometricAvailable);
  }, [user, navigate, checkBiometricAvailability]);

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;

    const success = await unlockWithPin(pin);
    if (success) {
      const returnTo = (location.state as any)?.from || '/app/home';
      navigate(returnTo, { replace: true });
    } else {
      setPin("");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 600);
    }
  };

  const handleBiometricAuth = async () => {
    const success = await unlockWithBiometrics();
    if (success) {
      const returnTo = (location.state as any)?.from || '/app/home';
      navigate(returnTo, { replace: true });
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length <= 6 && /^\d*$/.test(value)) {
      setPin(value);
      
      // Auto-submit when 6 digits entered
      if (value.length === 6) {
        setTimeout(handlePinSubmit, 100);
      }
    }
  };

  const handleKeypadPress = (value: string | number) => {
    if (value === "⌫") {
      setPin(pin.slice(0, -1));
    } else if (typeof value === "number" && pin.length < 6) {
      const newPin = pin + value.toString();
      setPin(newPin);
      
      if (newPin.length === 6) {
        setTimeout(handlePinSubmit, 100);
      }
    }
  };

  // Show cooldown if locked
  if (lockState.lockedUntil && Date.now() < lockState.lockedUntil) {
    const remainingTime = Math.ceil((lockState.lockedUntil - Date.now()) / 1000);
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Account Temporarily Locked
          </h1>
          <p className="text-sm text-muted-foreground">
            Too many incorrect attempts. Please wait {remainingTime} seconds.
          </p>
          {lockState.failedAttempts >= 10 && (
            <Button 
              variant="outline" 
              onClick={() => navigate('/recovery/verify')}
              className="mt-4"
            >
              Reset PIN with Recovery Phrase
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center space-y-8 max-w-sm w-full">
        <div className="flex flex-col items-center space-y-4">
          <img 
            src={cryptoLogo} 
            alt="IPG i-SMART Logo" 
            className="w-16 h-16 rounded-xl shadow-card"
          />
          <h1 className="text-2xl font-bold text-foreground">
            IPG i-SMART
          </h1>
          <p className="text-muted-foreground text-center text-sm">
            Enter your PIN to continue
          </p>
        </div>

        <Card className={`w-full bg-gradient-card shadow-card border-0 ${shakeError ? 'animate-pulse' : ''}`}>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-lg font-semibold mb-2">Enter PIN</h2>
                <div className={`flex justify-center space-x-3 mb-4 transition-transform duration-150 ${shakeError ? 'animate-bounce' : ''}`}>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                        i < pin.length 
                          ? "bg-primary border-primary scale-110" 
                          : "border-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((num, i) => (
                  <Button
                    key={i}
                    variant={num === "" ? "ghost" : "outline"}
                    className={`h-12 text-lg transition-all duration-150 ${
                      num === "" ? "cursor-default" : "hover:scale-105 active:scale-95"
                    }`}
                    disabled={num === ""}
                    onClick={() => handleKeypadPress(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {lockState.biometricEnabled && biometricAvailable && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBiometricAuth}
                  className="w-full"
                >
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Use Biometric
                </Button>
              </div>
            )}

            <div className="pt-2 text-center">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/recovery/verify')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Forgot PIN?
              </Button>
            </div>
          </CardContent>
        </Card>

        {lockState.failedAttempts > 0 && !lockState.lockedUntil && (
          <div className="text-center">
            <p className="text-sm text-destructive">
              {lockState.failedAttempts}/5 incorrect attempts
            </p>
            {lockState.failedAttempts >= 3 && (
              <p className="text-xs text-muted-foreground mt-1">
                Account will be temporarily locked after 5 failed attempts
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AppLockScreen;