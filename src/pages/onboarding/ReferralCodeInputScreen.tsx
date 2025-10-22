import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation';
import { OnboardingLayout } from '@/components/onboarding/OnboardingLayout';
import { OnboardingHeader } from '@/components/onboarding/OnboardingHeader';
import { ProgressIndicator } from '@/components/onboarding/ProgressIndicator';
import { OnboardingCard } from '@/components/onboarding/OnboardingCard';
import { useToast } from '@/hooks/use-toast';

interface ReferralCodeInputScreenProps {
  onCodeSubmitted: (code: string, sponsorId: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

const ReferralCodeInputScreen: React.FC<ReferralCodeInputScreenProps> = ({
  onCodeSubmitted,
  onSkip,
  onBack
}) => {
  const location = useLocation();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [autoValidated, setAutoValidated] = useState(false);
  const validation = useReferralCodeValidation(code);

  // Auto-populate referral code if captured from previous screens
  useEffect(() => {
    // Check multiple sources for pre-captured referral code
    const stateRef = (location.state as any)?.referralCode;
    const localRef = localStorage.getItem('ismart_signup_ref');
    const sessionRef = sessionStorage.getItem('ismart_ref_code');
    
    const capturedCode = stateRef || localRef || sessionRef;
    
    if (capturedCode && !code && !autoValidated) {
      const upperCode = capturedCode.toUpperCase();
      console.log('📨 Auto-populating referral code:', upperCode);
      setCode(upperCode);
      setAutoValidated(true);
      
      toast({
        title: "Referral Code Applied",
        description: `Code ${upperCode} from your referral link`,
        duration: 3000,
      });
    }
  }, [location.state, code, autoValidated, toast]);

  // Auto-advance if code is valid and was auto-populated
  useEffect(() => {
    if (autoValidated && validation.isValid && validation.sponsorId && !validation.loading) {
      const timer = setTimeout(() => {
        console.log('✅ Auto-advancing with valid referral code');
        onCodeSubmitted(code.trim().toUpperCase(), validation.sponsorId);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [autoValidated, validation.isValid, validation.sponsorId, validation.loading, code, onCodeSubmitted]);

  const handleContinue = () => {
    if (validation.isValid && validation.sponsorId) {
      onCodeSubmitted(code.trim().toUpperCase(), validation.sponsorId);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && validation.isValid) {
      handleContinue();
    }
  };

  return (
    <OnboardingLayout gradientVariant="secondary" className="px-0">
      <div className="flex flex-col h-full px-6">
        <OnboardingHeader 
          title="Referral Code"
          showBack
          onBack={onBack}
          rightAction={
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-white/70 hover:bg-black/50 hover:text-white"
            >
              Skip
            </Button>
          }
        />
        
        <ProgressIndicator 
          currentStep={7}
          totalSteps={8}
          stepName="Referral Code"
          className="mt-4"
        />

        <div className="flex-1 pb-4 overflow-y-auto flex flex-col justify-center mt-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md mx-auto w-full space-y-6"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center"
              >
                <Users className="w-10 h-10 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-2xl font-bold text-white mb-3"
              >
                Have a Referral Code?
              </motion.h2>
              
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-white/80 text-base"
              >
                Enter the code shared by your friend to get connected
              </motion.p>
            </div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <OnboardingCard variant="glass">
                <div className="space-y-4">
                  <div>
                    <label className="text-white/90 text-sm font-medium block mb-2">
                      Referral Code (Optional)
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        onKeyPress={handleKeyPress}
                        placeholder="Enter code (e.g., ABC12XYZ)"
                        className="bg-black/30 border-white/30 text-white placeholder:text-white/50 focus:border-purple-400 uppercase font-mono pr-10"
                        maxLength={12}
                      />
                      {code.trim() && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {validation.loading ? (
                            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                          ) : validation.isValid ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : validation.error ? (
                            <XCircle className="w-5 h-5 text-red-400" />
                          ) : null}
                        </div>
                      )}
                    </div>
                    
                    {code.trim() && !validation.loading && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2"
                      >
                        {validation.isValid && validation.sponsorUsername ? (
                          <p className="text-green-400 text-sm flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Valid! Referred by <span className="font-semibold ml-1">@{validation.sponsorUsername}</span>
                          </p>
                        ) : validation.error ? (
                          <p className="text-red-400 text-sm flex items-center">
                            <XCircle className="w-4 h-4 mr-1" />
                            {validation.error}
                          </p>
                        ) : null}
                      </motion.div>
                    )}
                  </div>

                  <Button
                    onClick={handleContinue}
                    disabled={!validation.isValid || validation.loading}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-semibold py-3 rounded-xl text-white"
                  >
                    Continue with Referral
                  </Button>
                </div>
              </OnboardingCard>
            </motion.div>

            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <OnboardingCard variant="gradient" className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
                <h4 className="text-blue-200 font-semibold text-sm mb-3 flex items-center">
                  <span className="mr-2">🎁</span>
                  Referral Benefits
                </h4>
                <ul className="text-blue-200/80 text-xs space-y-2">
                  <li className="flex items-center">
                    <span className="w-4 h-4 bg-blue-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                    Join your friend's trading network
                  </li>
                  <li className="flex items-center">
                    <span className="w-4 h-4 bg-blue-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                    Unlock exclusive rewards together
                  </li>
                  <li className="flex items-center">
                    <span className="w-4 h-4 bg-blue-500/30 rounded-full flex items-center justify-center mr-2 text-[10px]">✓</span>
                    Build your own referral team
                  </li>
                </ul>
              </OnboardingCard>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="text-center"
            >
              <p className="text-white/50 text-xs">
                Don't have a code? You can skip this step and add it later
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </OnboardingLayout>
  );
};

export default ReferralCodeInputScreen;
