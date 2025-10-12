/* ═══════════════════════════════════════════════════════════
   LOCK SCREEN - Module B
   Try biometrics first, fall back to PIN
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, Fingerprint, AlertCircle, Loader2 } from 'lucide-react';
import { verifyPin } from '@/utils/pinCrypto';
import { getPinCredentials, hasBiometricEnrolled, getBiometricCredId, unlockApp } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';

export default function LockScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [error, setError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [biometricAvailable] = useState(hasBiometricEnrolled());

  // Dev ribbon flag
  const showDevRibbon = true;

  // Auto-try biometrics on mount
  useEffect(() => {
    if (biometricAvailable) {
      setTimeout(() => handleBiometricUnlock(), 500);
    }
  }, [biometricAvailable]);

  const handleBiometricUnlock = async () => {
    if (bioLoading) return;

    setBioLoading(true);
    setError('');

    try {
      const credId = getBiometricCredId();
      if (!credId) {
        throw new Error('No biometric credential found');
      }

      // Attempt WebAuthn authentication
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // For APK WebView, this may fail - gracefully fall back to PIN
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            id: Uint8Array.from(atob(credId), c => c.charCodeAt(0)),
            type: 'public-key'
          }],
          userVerification: 'required',
          timeout: 60000
        }
      });

      if (assertion) {
        unlockApp();
        navigate('/app/home', { replace: true });
      }
    } catch (err: any) {
      console.error('Biometric auth failed:', err);
      // Silently fall back to PIN entry
      setError('');
    } finally {
      setBioLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPin(cleaned);
    if (error) setError('');
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || loading) return;

    setLoading(true);
    setError('');

    try {
      const credentials = getPinCredentials();
      if (!credentials) {
        setError('No PIN configured');
        setLoading(false);
        return;
      }

      const isValid = await verifyPin(pin, credentials.salt, credentials.hash);

      if (isValid) {
        setFailedAttempts(0);
        unlockApp();
        navigate('/app/home', { replace: true });
      } else {
        const newAttempts = failedAttempts + 1;
        setFailedAttempts(newAttempts);
        setPin('');
        setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
      }
    } catch (err) {
      console.error('PIN verification failed:', err);
      setError('Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="screen min-h-screen flex items-center justify-center bg-background px-6">
      <div className="fixed top-4 left-4 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-mono">
        APP-LOCK v1
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
            Enter your PIN to unlock the app
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {failedAttempts > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {failedAttempts} failed attempt{failedAttempts > 1 ? 's' : ''}.
              </AlertDescription>
            </Alert>
          )}

          {bioLoading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Fingerprint className="h-16 w-16 text-primary animate-pulse" />
              <div className="text-center space-y-2">
                <p className="font-medium">Biometric Authentication</p>
                <p className="text-sm text-muted-foreground">
                  Please verify your identity
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="lock-pin-input"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                  disabled={loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>

              <Button
                data-testid="lock-unlock-btn"
                type="submit"
                className="w-full"
                size="lg"
                disabled={pin.length !== 6 || loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  'Unlock'
                )}
              </Button>
            </form>
          )}

          {biometricAvailable && !bioLoading && (
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
                data-testid="lock-bio-btn"
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                onClick={handleBiometricUnlock}
                disabled={bioLoading}
              >
                <Fingerprint className="h-4 w-4 mr-2" />
                Use Biometrics
              </Button>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate('/recovery/verify')}
            >
              Forgot PIN?
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
