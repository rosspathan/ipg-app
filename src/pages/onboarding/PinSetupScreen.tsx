import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { hashPin, generateSalt, isValidPin, isWeakPin } from '@/utils/pinCrypto';
import { storePinCredentials, setLockState } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';
import { useKeyboardVisible } from '@/hooks/useKeyboardVisible';

interface PinSetupScreenProps {
  onPinSetup: (pinHash: string) => void;
  onBack: () => void;
}

type SetupStep = 'create' | 'confirm';

const PinSetupScreen: React.FC<PinSetupScreenProps> = ({
  onPinSetup,
  onBack
}) => {
  const [step, setStep] = useState<SetupStep>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isHashing, setIsHashing] = useState(false);
  const { toast } = useToast();
  const keyboardHeight = useKeyboardVisible();

  const handlePinChange = (value: string, isConfirm: boolean = false) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    
    if (isConfirm) {
      setConfirmPin(cleanValue);
    } else {
      setPin(cleanValue);
    }
  };

  const handleCreatePin = () => {
    if (!isValidPin(pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 6-digit PIN",
        variant: "destructive"
      });
      return;
    }

    if (isWeakPin(pin)) {
      toast({
        title: "Weak PIN",
        description: "Please choose a more secure PIN without repeating digits or sequences",
        variant: "destructive"
      });
      return;
    }

    setStep('confirm');
  };

  const handleConfirmPin = async () => {
    if (pin !== confirmPin) {
      toast({
        title: "PINs Don't Match",
        description: "Please make sure both PINs match",
        variant: "destructive"
      });
      setConfirmPin('');
      return;
    }

    setIsHashing(true);
    try {
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      
      storePinCredentials(hash, salt);
      
      // Set fresh setup flag to skip lock screen on first access
      localStorage.setItem('ipg_fresh_setup', 'true');
      
      // Set extended unlock state for smooth onboarding
      localStorage.setItem('cryptoflow_lock_state', JSON.stringify({
        isUnlocked: true,
        lastUnlockAt: Date.now(),
        failedAttempts: 0,
        lockedUntil: null,
        biometricEnabled: false,
        requireOnActions: true,
        sessionLockMinutes: 30 // Extended timeout for better UX
      }));
      
      toast({
        title: "PIN Created Successfully!",
        description: "Your secure PIN has been set up",
      });
      
      onPinSetup(hash);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create PIN. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsHashing(false);
    }
  };

  const handleBackStep = () => {
    if (step === 'confirm') {
      setStep('create');
      setConfirmPin('');
    } else {
      onBack();
    }
  };

  const PinInput = ({ 
    value, 
    onChange, 
    placeholder 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    placeholder: string;
  }) => (
    <div className="space-y-4">
      <div className="flex justify-center space-x-3">
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all duration-300 ${
              index < value.length 
                ? 'border-blue-400 bg-blue-500/20 scale-110' 
                : 'border-white/30 bg-black/30'
            }`}
          >
            <span className="text-white text-xl font-bold">
              {index < value.length ? (showPin ? value[index] : '●') : ''}
            </span>
          </div>
        ))}
      </div>
      
      <input
        type="text"
        inputMode="none"
        readOnly
        value={value}
        placeholder={placeholder}
        className="w-full opacity-0 absolute -top-full pointer-events-none"
        maxLength={6}
      />
    </div>
  );

  const NumberPad = ({ onNumber, onDelete }: { onNumber: (num: string) => void; onDelete: () => void }) => (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          onClick={() => onNumber(num.toString())}
          className="h-14 sm:h-16 min-w-[44px] min-h-[44px] bg-black/50 backdrop-blur-md border-2 border-white/40 text-white hover:bg-black/60 hover:border-white/50 text-xl font-semibold touch-manipulation rounded-xl active:scale-95 shadow-lg"
        >
          {num}
        </Button>
      ))}
      
      <Button
        variant="outline"
        size="lg"
        onClick={() => setShowPin(!showPin)}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] bg-black/50 backdrop-blur-md border-2 border-white/40 text-white hover:bg-black/60 hover:border-white/50 touch-manipulation rounded-xl active:scale-95 shadow-lg"
      >
        {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        onClick={() => onNumber('0')}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] bg-black/50 backdrop-blur-md border-2 border-white/40 text-white hover:bg-black/60 hover:border-white/50 text-xl font-semibold touch-manipulation rounded-xl active:scale-95 shadow-lg"
      >
        0
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        onClick={onDelete}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] bg-black/50 backdrop-blur-md border-2 border-white/40 text-white hover:bg-black/60 hover:border-white/50 touch-manipulation rounded-xl active:scale-95 shadow-lg"
      >
        ⌫
      </Button>
    </div>
  );

  const handleNumberPress = (num: string) => {
    if (step === 'create') {
      if (pin.length < 6) {
        setPin(pin + num);
      }
    } else {
      if (confirmPin.length < 6) {
        setConfirmPin(confirmPin + num);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  return (
    <OnboardingLayout gradientVariant="secondary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          title="Setup PIN"
          showBack
          onBack={handleBackStep}
        />
        
        <ProgressIndicator 
          currentStep={6}
          totalSteps={8}
          stepName="Set PIN"
          className="mt-4"
        />

        <div className="flex-1 pb-4 space-y-6 overflow-y-auto mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <Shield className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              {step === 'create' ? 'App Lock' : 'Confirm Your PIN'}
            </h2>
            
            <p className="text-white/80 text-base max-w-sm mx-auto">
              {step === 'create' 
                ? 'Choose a secure 6-digit PIN to lock and unlock your app'
                : 'Please enter your PIN again to confirm'
              }
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <OnboardingCard variant="glass">
              <PinInput
                value={step === 'create' ? pin : confirmPin}
                onChange={(value) => handlePinChange(value, step === 'confirm')}
                placeholder="Enter 6-digit PIN"
              />
            </OnboardingCard>
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <NumberPad onNumber={handleNumberPress} onDelete={handleDelete} />
          </motion.div>

          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ marginBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : '0' }}
          >
            {step === 'create' ? (
              <Button
                onClick={handleCreatePin}
                disabled={pin.length !== 6}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-4 rounded-2xl text-white shadow-lg"
                size="lg"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleConfirmPin}
                disabled={confirmPin.length !== 6 || isHashing}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold py-4 rounded-2xl text-white shadow-lg"
                size="lg"
              >
                {isHashing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                    />
                    Creating PIN...
                  </>
                ) : (
                  'Create PIN'
                )}
              </Button>
            )}
          </motion.div>

          {step === 'create' && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <OnboardingCard variant="gradient" className="bg-gradient-to-r from-yellow-900/95 to-orange-900/95 border-yellow-500/60">
                <h4 className="text-yellow-100 font-semibold text-base mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  <span>Security Tips</span>
                </h4>
                <ul className="text-yellow-50 text-sm space-y-2 font-medium">
                  <li>• Avoid simple patterns like 123456 or 111111</li>
                  <li>• Don't use your birthday or other personal dates</li>
                  <li>• Choose a PIN you can remember but others can't guess</li>
                  <li>• Your PIN is encrypted and stored securely on device</li>
                </ul>
              </OnboardingCard>
            </motion.div>
          )}
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default PinSetupScreen;
