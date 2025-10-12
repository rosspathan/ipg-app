/* ═══════════════════════════════════════════════════════════
   BIOMETRIC ENROLL SCREEN - Module B
   Optional: Enroll platform authenticator or skip
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint, AlertCircle, ShieldCheck } from 'lucide-react';
import { storeBiometricCredId, setOnboarded } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

export default function BiometricEnrollScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const showDevRibbon = true;

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    try {
      // On native platforms (APK), check if WebAuthn is available
      if (Capacitor.isNativePlatform()) {
        // WebAuthn may not be supported in APK WebView
        const available = typeof window !== 'undefined' && 
                          window.PublicKeyCredential !== undefined;
        setSupported(available);
      } else {
        // On web, check for platform authenticator
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setSupported(available);
        } else {
          setSupported(false);
        }
      }
    } catch (err) {
      console.error('Failed to check biometric support:', err);
      setSupported(false);
    } finally {
      setChecking(false);
    }
  };

  const handleEnroll = async () => {
    if (!supported) return;

    setEnrolling(true);
    setError('');

    try {
      // Create WebAuthn credential
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const userId = new Uint8Array(16);
      crypto.getRandomValues(userId);

      const credential = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: {
            name: 'IPG iSmart Exchange',
            id: window.location.hostname
          },
          user: {
            id: userId,
            name: 'user',
            displayName: 'User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'none'
        }
      }) as PublicKeyCredential;

      if (credential) {
        storeBiometricCredId(credential.id);
        toast({
          title: 'Biometric Enrolled',
          description: 'You can now use biometrics to unlock'
        });
        completeSetup();
      }
    } catch (err: any) {
      console.error('Biometric enrollment failed:', err);
      if (err.name === 'NotAllowedError') {
        setError('Enrollment cancelled');
      } else {
        setError('Failed to enroll biometric. Please try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  const handleSkip = () => {
    completeSetup();
  };

  const completeSetup = () => {
    setOnboarded();
    navigate('/app/home', { replace: true });
  };

  return (
    <div className="screen min-h-screen flex items-center justify-center bg-background px-6">
      {/* Dev Ribbon */}
      {showDevRibbon && (
        <div className="fixed top-4 left-4 px-3 py-1 bg-warning/20 border border-warning/40 rounded-lg text-xs font-mono text-warning-foreground">
          APP-LOCK v1
        </div>
      )}

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Fingerprint className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">Enable Biometrics</CardTitle>
          <CardDescription>
            {checking 
              ? 'Checking device capabilities...'
              : supported
                ? 'Use fingerprint or face recognition for quick unlock'
                : 'Biometrics not supported on this device'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!checking && !supported && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Biometric authentication is not supported in your current environment. 
                You'll use your PIN to unlock the app.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {supported ? (
              <>
                <Button
                  data-testid="bio-enroll-btn"
                  onClick={handleEnroll}
                  className="w-full"
                  size="lg"
                  disabled={checking || enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Enable Biometrics'}
                </Button>

                <Button
                  data-testid="bio-skip-btn"
                  variant="outline"
                  onClick={handleSkip}
                  className="w-full"
                  disabled={enrolling}
                >
                  Skip for Now
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSkip}
                className="w-full"
                size="lg"
                disabled={checking}
              >
                Continue
              </Button>
            )}
          </div>

          {supported && (
            <div className="text-xs text-muted-foreground text-center">
              You can always enable this later in Security settings
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
