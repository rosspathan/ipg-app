import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield, Fingerprint, Wallet, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { captureReferralAfterEmailVerify } from '@/utils/referralCapture';
import { supabase } from '@/integrations/supabase/client';

interface SuccessCelebrationScreenProps {
  hasBiometric: boolean;
  onComplete: () => Promise<void>;
}

const SuccessCelebrationScreen: React.FC<SuccessCelebrationScreenProps> = ({ hasBiometric, onComplete }) => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();
  const { user } = useAuthUser();
  const [isCompleting, setIsCompleting] = useState(false);

  useEffect(() => {
    // Auto-advance after 3 seconds
    const timer = setTimeout(() => {
      handleContinue();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleContinue = async () => {
    if (isCompleting) return;
    
    try {
      setIsCompleting(true);
      console.log('[SUCCESS] Starting onboarding completion...');
      
      // CRITICAL: Lock referral to database before completing onboarding
      if (user?.id) {
        console.log('🔒 Locking referral for user:', user.id);
        await captureReferralAfterEmailVerify(user.id);
        
        // CRITICAL: Build referral tree immediately after locking
        console.log('🌳 Building referral tree for user:', user.id);
        const { data: treeData, error: treeError } = await supabase.functions.invoke('build-referral-tree', {
          body: { user_id: user.id }
        });

        if (treeError) {
          console.error('❌ Failed to build referral tree:', treeError);
          // Don't fail onboarding if tree build fails, but log it
        } else {
          console.log('✅ Referral tree built successfully:', treeData);
        }
      }
      
      await onComplete();
      
      // Clean up referral code storage
      localStorage.removeItem('ismart_signup_ref');
      sessionStorage.removeItem('ismart_ref_code');
      
      console.log('[SUCCESS] Onboarding completed, navigating...');
    } catch (error) {
      console.error('[SUCCESS] Failed to complete onboarding:', error);
      
      // Show warning but still try to navigate
      toast({
        title: "Setup Warning",
        description: "Some settings may need to be completed in your profile.",
      });
      
      // Try to navigate anyway after 1 second
      setTimeout(() => {
        navigate('/app/home', { replace: true });
      }, 1000);
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <div 
      className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden cursor-pointer"
      style={{ height: '100dvh' }}
      onClick={handleContinue}
    >
      {/* Confetti celebration */}
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.3}
      />

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)', paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-8"
        >
          <div className="w-32 h-32 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50">
            <CheckCircle className="w-16 h-16 text-white" />
          </div>
          
          {/* Pulse ring */}
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-green-400"
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        </motion.div>

        {/* Main message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-center space-y-4 mb-12"
        >
          <h1 className="text-4xl font-bold text-white">
            You're All Set!
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Your wallet is secure and ready to use
          </p>
        </motion.div>

        {/* Feature checkmarks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="space-y-4 mb-12"
        >
          <div className="flex items-center space-x-3 text-green-300">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-base">Wallet created and secured</span>
          </div>
          
          <div className="flex items-center space-x-3 text-green-300">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-base">6-digit PIN protection active</span>
          </div>
          
          {hasBiometric && (
            <div className="flex items-center space-x-3 text-green-300">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Fingerprint className="w-4 h-4" />
              </div>
              <span className="text-base">Biometric authentication enabled</span>
            </div>
          )}
        </motion.div>

        {/* Continue button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center space-y-4"
        >
          <Button 
            onClick={handleContinue}
            disabled={isCompleting}
            className="min-w-[200px] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
            size="lg"
          >
            {isCompleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting up...
              </>
            ) : (
              'Continue to App'
            )}
          </Button>
          <p className="text-white/50 text-sm">
            {isCompleting ? 'Please wait...' : 'or tap anywhere to continue'}
          </p>
        </motion.div>
      
        {/* Loading overlay */}
        {isCompleting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
              <p className="text-white text-lg font-semibold">Completing setup...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuccessCelebrationScreen;
