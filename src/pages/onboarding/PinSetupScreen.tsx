import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { hashPin, generateSalt, isValidPin, isWeakPin } from '@/utils/pinCrypto';
import { storePinCredentials, setLockState } from '@/utils/lockState';
import { useToast } from '@/hooks/use-toast';

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

  const handlePinChange = (value: string, isConfirm: boolean = false) => {
    // Only allow digits and limit to 6 characters
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
      // Generate salt and hash PIN using PBKDF2
      const salt = generateSalt();
      const hash = await hashPin(pin, salt);
      
      // Store PIN credentials in lockState system
      storePinCredentials(hash, salt);
      
      // Set app as unlocked initially
      setLockState('unlocked');
      
      toast({
        title: "PIN Created Successfully!",
        description: "Your secure PIN has been set up",
      });
      
      // Pass hash to parent for onboarding completion
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

  // PIN input component
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
                : 'border-white/30 bg-white/10'
            }`}
          >
            <span className="text-white text-xl font-bold">
              {index < value.length ? (showPin ? value[index] : '●') : ''}
            </span>
          </div>
        ))}
      </div>
      
      {/* Hidden input - disabled to prevent native keyboard */}
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

  // Number pad component
  const NumberPad = ({ onNumber, onDelete }: { onNumber: (num: string) => void; onDelete: () => void }) => (
    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <Button
          key={num}
          variant="outline"
          size="lg"
          onClick={() => onNumber(num.toString())}
          className="h-14 sm:h-16 min-w-[44px] min-h-[44px] border-white/30 text-white hover:bg-white/20 text-xl font-semibold touch-manipulation"
        >
          {num}
        </Button>
      ))}
      
      <Button
        variant="outline"
        size="lg"
        onClick={() => setShowPin(!showPin)}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] border-white/30 text-white hover:bg-white/20 touch-manipulation"
      >
        {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        onClick={() => onNumber('0')}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] border-white/30 text-white hover:bg-white/20 text-xl font-semibold touch-manipulation"
      >
        0
      </Button>
      
      <Button
        variant="outline"
        size="lg"
        onClick={onDelete}
        className="h-14 sm:h-16 min-w-[44px] min-h-[44px] border-white/30 text-white hover:bg-white/20 touch-manipulation"
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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl"
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

      <div className="relative z-10 h-full flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackStep}
            className="text-white hover:bg-white/20 min-w-[44px] min-h-[44px]"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-white font-semibold">Setup PIN</h1>
            <div className="flex space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === 'create' ? 'bg-white' : 'bg-white/40'
              }`} />
              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                step === 'confirm' ? 'bg-white' : 'bg-white/40'
              }`} />
            </div>
          </div>

          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-4 space-y-6 overflow-y-auto">
          {/* Icon and title */}
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

          {/* PIN input */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <div className="p-6">
                <PinInput
                  value={step === 'create' ? pin : confirmPin}
                  onChange={(value) => handlePinChange(value, step === 'confirm')}
                  placeholder="Enter 6-digit PIN"
                />
              </div>
            </Card>
          </motion.div>

          {/* Number pad */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <NumberPad onNumber={handleNumberPress} onDelete={handleDelete} />
          </motion.div>

          {/* Action button */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {step === 'create' ? (
              <Button
                onClick={handleCreatePin}
                disabled={pin.length !== 6}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 font-semibold py-4 rounded-2xl"
                size="lg"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleConfirmPin}
                disabled={confirmPin.length !== 6 || isHashing}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 font-semibold py-4 rounded-2xl"
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

          {/* Security tips */}
          {step === 'create' && (
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm border-yellow-500/30">
                <div className="p-4">
                  <h4 className="text-yellow-200 font-semibold text-sm mb-2 flex items-center">
                    <span className="mr-2">💡</span>
                    Security Tips
                  </h4>
                  <ul className="text-yellow-200/80 text-xs space-y-1">
                    <li>• Avoid simple patterns like 123456 or 111111</li>
                    <li>• Don't use your birthday or other personal dates</li>
                    <li>• Choose a PIN you can remember but others can't guess</li>
                    <li>• Your PIN is encrypted and stored securely on device</li>
                  </ul>
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PinSetupScreen;
