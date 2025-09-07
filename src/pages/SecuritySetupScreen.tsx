import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff, Shield, Info, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthSession } from "@/hooks/useAuthSession";
import { saveLocalSecurityData } from "@/utils/localSecurityStorage";
import { supabase } from "@/integrations/supabase/client";
import * as bcrypt from 'bcryptjs';

type Phase = 'idle' | 'valid' | 'submitting' | 'done' | 'error';

const SecuritySetupScreen = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, userId, status } = useAuthSession();
  
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');

  const isSixDigit = /^\d{6}$/.test(pin);
  const confirmStarted = confirmPin.length > 0;
  const confirmMatches = confirmPin === pin;
  const isValid = isSixDigit && confirmMatches && antiPhishingCode.trim().length > 0;

  // Check biometric availability
  useEffect(() => {
    const checkBiometrics = async () => {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(available);
        } catch (error) {
          setBiometricAvailable(false);
        }
      } else {
        setBiometricAvailable(false);
      }
    };
    checkBiometrics();
  }, []);

  // Update phase based on form validity
  useEffect(() => {
    if (phase === 'submitting' || phase === 'done') return;
    setPhase(isValid ? 'valid' : 'idle');
  }, [pin, confirmPin, antiPhishingCode, isValid, phase]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    if (!isValid || phase === 'submitting') return;
    
    setPhase('submitting');
    
    try {
      // Hash the PIN client-side
      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(pin, salt);
      
      // Check if user has session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user?.id) {
        // DB path - save to security table
        const { error: securityError } = await supabase
          .from('security')
          .upsert({
            user_id: session.user.id,
            pin_hash: hash,
            pin_salt: salt,
            pin_set: true,
            biometric_enabled: biometricEnabled && biometricAvailable,
            anti_phishing_code: antiPhishingCode.trim() || null,
          }, { onConflict: 'user_id' });

        if (securityError) throw securityError;

        // Ensure base profile exists
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            user_id: session.user.id,
            email: session.user.email,
          }, { onConflict: 'user_id' });

        if (profileError) console.warn('Profile upsert failed:', profileError);
      } else {
        // Local-only path - save locally and sync later
        await saveLocalSecurityData({
          pin,
          biometric_enabled: biometricEnabled && biometricAvailable,
          anti_phishing_code: antiPhishingCode.trim()
        });
      }

      // Mark app as unlocked
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
        title: "Security configured",
        description: "Your wallet is now secure. Welcome to the dashboard!",
      });

      setPhase('done');
      
      // Always navigate to dashboard for web3 onboarding
      navigate('/app/home', { replace: true });
      
    } catch (error) {
      console.error('Security setup failed:', error);
      toast({
        title: "Setup Failed", 
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setPhase('error');
    }
  };


  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
  };

  const handleConfirmPinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(cleaned);
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
          
          {!userId && status === 'ready' && (
            <div className="mt-4 p-3 bg-muted rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground text-left">
                You're not signed in yet. Your PIN will be saved locally and synced after login.
              </p>
            </div>
          )}
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
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-lg tracking-widest"
                  aria-invalid={pin.length > 0 && !isSixDigit}
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
                <p className="text-xs text-destructive">Enter 6 digits</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) => handleConfirmPinChange(e.target.value)}
                placeholder="••••••"
                className="text-center text-lg tracking-widest"
                aria-invalid={confirmStarted && !confirmMatches}
              />
              {confirmStarted && !confirmMatches && (
                <p className="text-xs text-destructive">PINs do not match</p>
              )}
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
          onClick={handleSubmit}
          className="w-full"
          disabled={phase !== 'valid'}
        >
          {phase === 'submitting' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {phase === 'submitting' ? 'Saving...' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  );
};

export default SecuritySetupScreen;