import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useLocation } from "react-router-dom";
import { Shield, Fingerprint } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthUser } from "@/hooks/useAuthUser";
import cryptoLogo from "@/assets/crypto-logo.jpg";
import { verifyLocalPin, hasLocalSecurity } from "@/utils/localSecurityStorage";
import { supabase } from "@/integrations/supabase/client";
import * as bcrypt from 'bcryptjs';

const AppLockScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuthUser();
  
  const [pin, setPin] = useState("");
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [shakeError, setShakeError] = useState(false);
  const [hasSecurityConfigured, setHasSecurityConfigured] = useState(false);
  const maxAttempts = 5;

  useEffect(() => {
    const checkSecurity = async () => {
      try {
        let hasPinConfigured = false;
        let biometricSetting = false;

        // Check database security if user is logged in
        if (user) {
          const { data: security } = await supabase
            .from('security')
            .select('pin_set, biometric_enabled')
            .eq('user_id', user.id)
            .maybeSingle();

          hasPinConfigured = security?.pin_set === true;
          biometricSetting = security?.biometric_enabled === true;
        }

        // Also check local security
        if (!hasPinConfigured) {
          hasPinConfigured = hasLocalSecurity();
          // Get biometric setting from local storage if no DB config
          biometricSetting = localStorage.getItem("cryptoflow_biometric") === "true";
        }

        if (!hasPinConfigured) {
          navigate("/onboarding/security");
          return;
        }
        
        setHasSecurityConfigured(true);
        setBiometricEnabled(biometricSetting);
      } catch (error) {
        console.error('Error checking security:', error);
        // Fallback to local security check
        if (!hasLocalSecurity()) {
          navigate("/onboarding/security");
        } else {
          setHasSecurityConfigured(true);
          setBiometricEnabled(localStorage.getItem("cryptoflow_biometric") === "true");
        }
      }
    };

    checkSecurity();
  }, [user, navigate]);

  const handlePinSubmit = async () => {
    if (pin.length !== 6) return;

    try {
      let isValid = false;

      // Try database verification first if user is logged in
      if (user) {
        try {
          const { data: security } = await supabase
            .from('security')
            .select('pin_hash')
            .eq('user_id', user.id)
            .maybeSingle();

          if (security?.pin_hash) {
            isValid = await bcrypt.compare(pin, security.pin_hash);
          }
        } catch (error) {
          console.warn('Database PIN verification failed:', error);
        }
      }

      // If no database PIN or failed, try local verification
      if (!isValid) {
        isValid = await verifyLocalPin(pin);
      }

      if (isValid) {
        localStorage.setItem('cryptoflow_unlocked', 'true');
        toast({
          title: "Welcome back!",
          description: "Access granted",
        });

        // Log successful unlock if user is logged in
        if (user) {
          try {
            await supabase.from('login_audit').insert({
              user_id: user.id,
              event: 'unlock_success',
              device_info: { userAgent: navigator.userAgent }
            });
          } catch (error) {
            console.warn('Failed to log unlock event:', error);
          }
        }

        const returnTo = (location.state as any)?.from || '/app/home';
        navigate(returnTo, { replace: true });
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");
        setShakeError(true);
        setTimeout(() => setShakeError(false), 600);

        // Log failed attempt if user is logged in
        if (user) {
          try {
            await supabase.from('login_audit').insert({
              user_id: user.id,
              event: 'unlock_failed',
              device_info: { userAgent: navigator.userAgent }
            });
          } catch (error) {
            console.warn('Failed to log unlock attempt:', error);
          }
        }
        
        if (newAttempts >= maxAttempts) {
          toast({
            title: "Too many attempts",
            description: "Please try again later or reset your PIN",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Incorrect PIN",
            description: `${maxAttempts - newAttempts} attempts remaining`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      toast({
        title: "Error",
        description: "Failed to verify PIN. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBiometricAuth = async () => {
    toast({
      title: "Biometric authentication",
      description: "Feature simulated for web preview",
    });
    
    setTimeout(() => {
      localStorage.setItem('cryptoflow_unlocked', 'true');
      const returnTo = (location.state as any)?.from || '/app/home';
      navigate(returnTo, { replace: true });
    }, 1000);
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

  // Show cooldown if too many attempts
  if (attempts >= maxAttempts) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center space-y-4 max-w-sm">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold text-foreground">
            Account Temporarily Locked
          </h1>
          <p className="text-sm text-muted-foreground">
            Too many incorrect attempts. Please wait or reset your PIN.
          </p>
          <Button 
            variant="outline" 
            onClick={() => navigate('/recovery/verify')}
            className="mt-4"
          >
            Reset PIN with Recovery Phrase
          </Button>
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

            {biometricEnabled && (
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

        {attempts > 0 && attempts < maxAttempts && (
          <div className="text-center">
            <p className="text-sm text-destructive">
              {attempts}/5 incorrect attempts
            </p>
            {attempts >= 3 && (
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