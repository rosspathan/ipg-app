import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import { CheckCircle2, Sparkles, Shield, Rocket } from 'lucide-react';

export default function AccountCreatedCelebration() {
  const navigate = useNavigate();
  const [windowSize, setWindowSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-advance after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/onboarding/referral');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Allow tap to continue immediately
  const handleContinue = () => {
    navigate('/onboarding/referral');
  };

  return (
    <div
      onClick={handleContinue}
      className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-slate-900 flex items-center justify-center p-6 cursor-pointer relative overflow-hidden"
    >
      {/* Confetti */}
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.3}
      />

      {/* Animated background glow */}
      <motion.div
        className="absolute inset-0 bg-green-500/20 blur-[100px]"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-md w-full text-center space-y-8">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 15,
            duration: 0.6
          }}
          className="relative mx-auto w-32 h-32"
        >
          {/* Pulse rings */}
          <motion.div
            className="absolute inset-0 bg-green-500/30 rounded-full"
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
          <motion.div
            className="absolute inset-0 bg-green-500/30 rounded-full"
            animate={{
              scale: [1, 1.5],
              opacity: [0.8, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.5
            }}
          />

          {/* Icon circle */}
          <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/50">
            <CheckCircle2 className="w-20 h-20 text-white" strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white">
            Account Created!
          </h1>
          <p className="text-xl text-white/80">
            Let's get you started
          </p>
        </motion.div>

        {/* Feature bullets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="space-y-3"
        >
          <FeatureItem
            icon={<CheckCircle2 className="w-5 h-5" />}
            text="Your account is ready"
            delay={0.6}
          />
          <FeatureItem
            icon={<Shield className="w-5 h-5" />}
            text="Secure authentication enabled"
            delay={0.7}
          />
          <FeatureItem
            icon={<Rocket className="w-5 h-5" />}
            text="Ready to explore"
            delay={0.8}
          />
        </motion.div>

        {/* Tap to continue hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-sm text-white/50 mt-8"
        >
          Tap anywhere to continue
        </motion.p>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text, delay }: { icon: React.ReactNode; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center justify-center gap-3 text-white"
    >
      <div className="text-green-400">
        {icon}
      </div>
      <span className="text-lg font-medium">{text}</span>
    </motion.div>
  );
}
