import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Fingerprint, CheckCircle, AlertCircle } from 'lucide-react';
import { isBiometricAvailable, setupBiometric, authenticateWithBiometric } from '@/utils/security';
import { useToast } from '@/hooks/use-toast';

interface BiometricSetupScreenProps {
  onBiometricSetup: (success: boolean) => void;
  onSkip: () => void;
  onBack: () => void;
}

const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({
  onBiometricSetup,
  onSkip,
  onBack
}) => {
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const available = await isBiometricAvailable();
      setIsAvailable(available);
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      setIsAvailable(false);
    }
  };

  const handleSetupBiometric = async () => {
    setIsSettingUp(true);
    try {
      const result = await setupBiometric('user-temp-id'); // Will be replaced with actual user ID
      
      if (result.success) {
        setIsSetupComplete(true);
        toast({
          title: "Biometric Setup Complete!",
          description: "Your biometric authentication is now active",
        });
      } else {
        toast({
          title: "Setup Failed",
          description: result.error || "Failed to setup biometric authentication",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred during setup",
        variant: "destructive"
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleTestBiometric = async () => {
    setIsTesting(true);
    try {
      const result = await authenticateWithBiometric();
      
      if (result.success) {
        toast({
          title: "Test Successful!",
          description: "Biometric authentication is working perfectly",
        });
        onBiometricSetup(true);
      } else {
        toast({
          title: "Test Failed",
          description: result.error || "Biometric authentication test failed",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during the test",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSkip = () => {
    onBiometricSetup(false);
    onSkip();
  };

  const handleContinue = () => {
    onBiometricSetup(isSetupComplete);
  };

  if (isAvailable === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4"
          />
          <p className="text-white">Checking biometric capabilities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
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

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-white font-semibold">Biometric Security</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white/60 hover:bg-white/20 text-sm"
          >
            Skip
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-8 space-y-6">
          {/* Icon and title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">
              {isAvailable ? 'Enable Biometric Security' : 'Biometric Not Available'}
            </h2>
            
            <p className="text-white/80 text-base max-w-sm mx-auto">
              {isAvailable 
                ? 'Use Face ID or fingerprint to secure your wallet with an extra layer of protection'
                : 'Biometric authentication is not available on this device. You can still use your PIN to secure your wallet.'
              }
            </p>
          </motion.div>

          {isAvailable ? (
            <>
              {/* Benefits */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm border-green-500/30">
                  <div className="p-4">
                    <h4 className="text-green-200 font-semibold text-sm mb-3 flex items-center">
                      <span className="mr-2">✨</span>
                      Benefits of Biometric Security
                    </h4>
                    <ul className="text-green-200/80 text-xs space-y-2">
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                        Faster and more convenient access
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                        Enhanced security with unique biometrics
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                        Your biometric data stays on device
                      </li>
                      <li className="flex items-center">
                        <span className="w-4 h-4 bg-green-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                        Works alongside your PIN protection
                      </li>
                    </ul>
                  </div>
                </Card>
              </motion.div>

              {/* Setup card */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <div className="p-6">
                    {!isSetupComplete ? (
                      <div className="text-center space-y-4">
                        <motion.div
                          animate={isSettingUp ? { scale: [1, 1.1, 1] } : {}}
                          transition={{ duration: 1, repeat: isSettingUp ? Infinity : 0 }}
                          className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center"
                        >
                          <Fingerprint className="w-8 h-8 text-purple-400" />
                        </motion.div>
                        
                        <div>
                          <h3 className="text-white font-semibold mb-2">Ready to Setup</h3>
                          <p className="text-white/80 text-sm">
                            Tap the button below and follow your device's prompts to register your biometric data
                          </p>
                        </div>

                        <Button
                          onClick={handleSetupBiometric}
                          disabled={isSettingUp}
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-semibold py-3 rounded-xl"
                        >
                          {isSettingUp ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full mr-2"
                              />
                              Setting up...
                            </>
                          ) : (
                            <>
                              <Fingerprint className="w-5 h-5 mr-2" />
                              Setup Biometric Security
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center"
                        >
                          <CheckCircle className="w-8 h-8 text-green-400" />
                        </motion.div>
                        
                        <div>
                          <h3 className="text-white font-semibold mb-2">Setup Complete!</h3>
                          <p className="text-white/80 text-sm">
                            Your biometric authentication is now configured. Test it out below.
                          </p>
                        </div>

                        <Button
                          onClick={handleTestBiometric}
                          disabled={isTesting}
                          variant="outline"
                          className="w-full border-green-400/50 text-green-300 hover:bg-green-500/20"
                        >
                          {isTesting ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full mr-2"
                              />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Fingerprint className="w-5 h-5 mr-2" />
                              Test Biometric
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>

              {/* Continue button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Button
                  onClick={handleContinue}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-semibold py-4 rounded-2xl"
                  size="lg"
                >
                  {isSetupComplete ? 'Complete Setup' : 'Continue Without Biometric'}
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              {/* Not available message */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border-orange-500/30">
                  <div className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-orange-200 font-semibold mb-2">
                      Biometric Not Supported
                    </h3>
                    <p className="text-orange-200/80 text-sm">
                      Your device doesn't support biometric authentication, or it's not enabled in your browser settings. 
                      Don't worry - your PIN protection is still very secure!
                    </p>
                  </div>
                </Card>
              </motion.div>

              {/* Continue button */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Button
                  onClick={() => onBiometricSetup(false)}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 font-semibold py-4 rounded-2xl"
                  size="lg"
                >
                  Continue to App
                </Button>
              </motion.div>
            </>
          )}

          {/* Security note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <p className="text-white/50 text-xs">
              🔒 Your biometric data is processed locally and never leaves your device
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BiometricSetupScreen;