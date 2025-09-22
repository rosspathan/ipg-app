import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // Show splash for 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-glow to-accent flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-20 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-32 right-10 w-24 h-24 bg-accent/20 rounded-full blur-lg"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/4 w-16 h-16 bg-gradient-to-r from-white/20 to-accent/30 rounded-full blur-md"
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main content */}
      <div className="text-center z-10 px-8">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.2
          }}
          className="mb-8"
        >
          <div className="w-24 h-24 mx-auto mb-6 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
            <motion.span 
              className="text-4xl font-bold text-white"
              animate={{ 
                rotateY: [0, 360],
              }}
              transition={{
                duration: 2,
                ease: "easeInOut",
                delay: 1
              }}
            >
              🏦
            </motion.span>
          </div>
        </motion.div>

        {/* App name */}
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.4
          }}
          className="text-3xl md:text-4xl font-bold text-white mb-2"
        >
          IPG iSmart Exchange
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.6
          }}
          className="text-lg text-white/90 mb-8 font-medium"
        >
          The Future of Digital Trading
        </motion.p>

        {/* Feature highlights */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ 
            duration: 0.8,
            ease: "easeOut",
            delay: 0.8
          }}
          className="space-y-2 text-white/80"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm">🔐</span>
            <span className="text-sm font-medium">Secure Web3 Wallet</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm">💎</span>
            <span className="text-sm font-medium">Earn BSK Rewards</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm">📈</span>
            <span className="text-sm font-medium">Live Trading</span>
          </div>
        </motion.div>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12"
        >
          <div className="flex justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "linear"
              }}
              className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
            />
          </div>
          <p className="text-white/60 text-sm mt-3">Loading your future...</p>
        </motion.div>
      </div>

      {/* Version info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-6 left-0 right-0 text-center"
      >
        <p className="text-white/50 text-xs">Version 1.0.0</p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;