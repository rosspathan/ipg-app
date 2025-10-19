/* ═══════════════════════════════════════════════════════════
   LOCK SCREEN - Unified Design
   For returning user authentication only
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, Eye, EyeOff, Fingerprint, AlertCircle } from 'lucide-react';
import { verifyPin } from '@/utils/pinCrypto';
import { getPinCredentials, unlockApp, hasBiometricEnrolled, getBiometricCredId } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ipgLogo from '@/assets/ipg-logo.jpg';
import { supabase } from '@/integrations/supabase/client';

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

  // Restore Supabase session after successful unlock
  const restoreSession = async () => {
    try {
      // Try to refresh existing session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error || !data.session) {
        console.log('[Session] Could not restore session, checking wallet fallback');
        
        // If session restore failed but wallet is connected, trigger BSK load via wallet
        const storedWallet = localStorage.getItem('cryptoflow_wallet');
        if (storedWallet) {
          try {
            const wallet = JSON.parse(storedWallet);
            if (wallet?.address) {
              console.log('[Session] Triggering BSK load via wallet fallback');
              // Dispatch event to trigger BSK reload in useAdMining
              window.dispatchEvent(new CustomEvent('wallet:bsk:reload', { 
                detail: { address: wallet.address } 
              }));
            }
          } catch (e) {
            console.warn('[Session] Could not parse wallet for fallback');
          }
        }
      } else {
        console.log('[Session] ✅ Session restored successfully');
      }
    } catch (err) {
      console.log('[Session] Session restore failed, will work in anonymous mode');
    }
  };

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
        await restoreSession();
        const returnPath = localStorage.getItem('ipg_return_path') || '/app/home';
        localStorage.removeItem('ipg_return_path');
        navigate(returnPath, { replace: true });
      }
    } catch (err: any) {
      console.error('Biometric auth failed:', err);
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

  const handlePinSubmit = async () => {
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
        await restoreSession();
        const returnPath = localStorage.getItem('ipg_return_path') || '/app/home';
        localStorage.removeItem('ipg_return_path');
        navigate(returnPath, { replace: true });
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
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <img 
            src={ipgLogo} 
            alt="IPG I-SMART Logo" 
            className="w-20 h-20 object-contain drop-shadow-2xl rounded-2xl"
          />
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <Card className="bg-card/90 dark:bg-white/10 backdrop-blur-sm border">
            <div className="p-6 space-y-6">
              {/* Icon and title */}
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                
                <h1 className="text-2xl font-bold text-foreground">
                  Welcome Back
                </h1>
                
                <p className="text-muted-foreground text-sm">
                  {bioLoading ? 'Authenticating with biometric...' : 'Enter your PIN to unlock'}
                </p>
              </div>

              {/* Errors */}
              {error && (
                <Alert variant="destructive" className="bg-red-500/20 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              {failedAttempts >= 3 && (
                <Alert className="bg-yellow-500/20 border-yellow-500/30">
                  <AlertCircle className="h-4 w-4 text-yellow-200" />
                  <AlertDescription className="text-yellow-200">
                    {failedAttempts} failed attempts. Account will lock after 5 failed attempts.
                  </AlertDescription>
                </Alert>
              )}

              {/* Biometric loading state */}
              {bioLoading && (
                <div className="text-center py-4">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3"
                  >
                    <Fingerprint className="w-8 h-8 text-blue-400" />
                  </motion.div>
                  <p className="text-muted-foreground text-sm">Waiting for biometric authentication...</p>
                </div>
              )}

              {/* PIN input */}
              {!bioLoading && (
                <div className="space-y-4">
                  {/* PIN dots display */}
                  <div className="flex justify-center space-x-3 mb-4">
                    {[...Array(6)].map((_, index) => (
                      <div
                        key={index}
                        className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          index < pin.length 
                            ? 'border-blue-400 bg-blue-500/20 scale-110' 
                            : 'border-muted bg-muted/50 dark:border-white/30 dark:bg-white/10'
                        }`}
                      >
                        <span className="text-foreground text-xl font-bold">
                          {index < pin.length ? (showPin ? pin[index] : '●') : ''}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Number pad */}
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                      <Button
                        key={num}
                        variant="outline"
                        size="lg"
                        onClick={() => handlePinChange(pin + num.toString())}
                        className="h-14 text-lg font-semibold"
                        disabled={loading || pin.length >= 6}
                      >
                        {num}
                      </Button>
                    ))}
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setShowPin(!showPin)}
                      className="h-14"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handlePinChange(pin + '0')}
                      className="h-14 text-lg font-semibold"
                      disabled={loading || pin.length >= 6}
                    >
                      0
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => handlePinChange(pin.slice(0, -1))}
                      className="h-14"
                    >
                      ⌫
                    </Button>
                  </div>

                  {/* Unlock button */}
                  <Button
                    onClick={handlePinSubmit}
                    disabled={pin.length !== 6 || loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 font-semibold py-3 rounded-xl"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                        />
                        Unlocking...
                      </>
                    ) : (
                      'Unlock'
                    )}
                  </Button>

                  {/* Biometric button */}
                  {biometricAvailable && !bioLoading && (
                    <Button
                      onClick={handleBiometricUnlock}
                      variant="outline"
                      className="w-full"
                    >
                      <Fingerprint className="w-5 h-5 mr-2" />
                      Use Biometrics
                    </Button>
                  )}

                  {/* Forgot PIN link */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => navigate('/recovery/verify')}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      Forgot PIN?
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
