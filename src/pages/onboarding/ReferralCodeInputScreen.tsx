import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Users, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useReferralCodeValidation } from '@/hooks/useReferralCodeValidation';

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
  const [code, setCode] = useState('');
  const validation = useReferralCodeValidation(code);

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
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden" style={{ height: '100dvh' }}>
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          
          <div className="text-center">
            <h1 className="text-white font-semibold">Referral Code</h1>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-white/70 hover:bg-white/20 hover:text-white"
          >
            Skip
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md mx-auto w-full space-y-6"
          >
            {/* Icon and title */}
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

            {/* Code input card */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <div className="p-6 space-y-4">
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
                    
                    {/* Validation feedback */}
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
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-semibold py-3 rounded-xl"
                  >
                    Continue with Referral
                  </Button>
                </div>
              </Card>
            </motion.div>

            {/* Benefits */}
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm border-blue-500/30">
                <div className="p-4">
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
                </div>
              </Card>
            </motion.div>

            {/* Skip note */}
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
    </div>
  );
};

export default ReferralCodeInputScreen;
