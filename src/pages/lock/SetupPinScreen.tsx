/* ═══════════════════════════════════════════════════════════
   SETUP PIN SCREEN - Module B
   First step: Create 6-digit PIN
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { hashPin, generateSalt, isValidPin, isWeakPin } from '@/utils/pinCrypto';
import { storePinCredentials } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';

export default function SetupPinScreen() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<'first' | 'second'>('first');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const showDevRibbon = true;

  const handlePin1Change = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPin1(cleaned);
    setError('');
  };

  const handlePin2Change = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setPin2(cleaned);
    setError('');
  };

  const handleContinue = () => {
    if (!isValidPin(pin1)) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    if (isWeakPin(pin1)) {
      setError('PIN is too weak. Avoid sequential or repeated digits.');
      return;
    }

    setStep('second');
    setPin2('');
    setError('');
  };

  const handleSavePin = async () => {
    if (pin1 !== pin2) {
      setError('PINs do not match. Please try again.');
      setPin2('');
      return;
    }

    try {
      const salt = generateSalt();
      const hash = await hashPin(pin1, salt);
      storePinCredentials(hash, salt);

      toast({
        title: 'PIN Created',
        description: 'Your PIN has been securely saved'
      });

      // Route to biometric enrollment
      navigate('/lock/biometric-enroll', { replace: true });
    } catch (err) {
      console.error('Failed to save PIN:', err);
      setError('Failed to save PIN. Please try again.');
    }
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
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl">
            {step === 'first' ? 'Create Your PIN' : 'Confirm Your PIN'}
          </CardTitle>
          <CardDescription>
            {step === 'first' 
              ? 'Enter a 6-digit PIN to secure your app'
              : 'Re-enter your PIN to confirm'
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

          {step === 'first' ? (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="pin-1st"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin1}
                  onChange={(e) => handlePin1Change(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
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
                onClick={handleContinue}
                className="w-full"
                size="lg"
                disabled={pin1.length !== 6}
              >
                Continue
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>✓ Use 6 digits</p>
                <p>✓ Avoid 123456, 111111, etc.</p>
                <p>✓ Make it memorable but secure</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Input
                  data-testid="pin-2nd"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin2}
                  onChange={(e) => handlePin2Change(e.target.value)}
                  placeholder="••••••"
                  className="pr-10 text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
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
                data-testid="pin-save-btn"
                onClick={handleSavePin}
                className="w-full"
                size="lg"
                disabled={pin2.length !== 6}
              >
                Save PIN
              </Button>

              <Button
                variant="ghost"
                onClick={() => {
                  setStep('first');
                  setPin2('');
                  setError('');
                }}
                className="w-full"
              >
                Back
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
