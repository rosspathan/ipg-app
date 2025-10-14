import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Shield, Fingerprint, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

interface SuccessCelebrationScreenProps {
  hasBiometric: boolean;
}

const SuccessCelebrationScreen: React.FC<SuccessCelebrationScreenProps> = ({ hasBiometric }) => {
  const navigate = useNavigate();
  const { width, height } = useWindowSize();

  useEffect(() => {
    // Auto-advance to home after 3 seconds, or tap to continue immediately
    const timer = setTimeout(() => {
      navigate('/app/home', { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleContinue = () => {
    navigate('/app/home', { replace: true });
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

        {/* Continue hint */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="text-center"
        >
          <p className="text-white/50 text-sm">
            Tap anywhere to continue
          </p>
          <motion.div
            className="mt-3 text-white/30"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            →
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SuccessCelebrationScreen;
