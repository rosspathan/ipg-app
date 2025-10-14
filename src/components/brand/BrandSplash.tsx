import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ipgLogo from '@/assets/ipg-logo.jpg';


interface BrandSplashProps {
  onComplete: () => void;
  duration?: number;
  canSkip?: boolean;
}

const BrandSplash: React.FC<BrandSplashProps> = ({ 
  onComplete, 
  duration = 1500,
  canSkip = true 
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [canSkipNow, setCanSkipNow] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'glow' | 'ring' | 'text' | 'spark' | 'complete'>('glow');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      // Reduced motion: quick fade-in
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 200);
      }, 800);
      return () => clearTimeout(timer);
    }

    // Full animation sequence
    const phases = [
      { phase: 'glow', delay: 0 },
      { phase: 'ring', delay: 400 },
      { phase: 'text', delay: 800 },
      { phase: 'spark', delay: 1400 },
      { phase: 'complete', delay: duration - 300 }
    ];

    const timers = phases.map(({ phase, delay }) =>
      setTimeout(() => setAnimationPhase(phase as any), delay)
    );

    // Allow skipping after 0.8s
    const skipTimer = setTimeout(() => setCanSkipNow(true), 800);

    // Complete animation
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 320);
    }, duration);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(skipTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete, duration, prefersReducedMotion]);

  const handleSkip = () => {
    if (canSkip && canSkipNow) {
      setIsVisible(false);
      setTimeout(onComplete, 200);
    }
  };

  // Enhanced animation variants
  const glowVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { 
      opacity: [0, 0.6, 0.3], 
      scale: [0.5, 1.2, 1],
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const coinVariants = {
    hidden: { scale: 0, opacity: 0, rotateY: -90 },
    visible: { 
      scale: 1, 
      opacity: 1,
      rotateY: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.2
      }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
    visible: { 
      opacity: 1,
      clipPath: 'inset(0 0% 0 0)',
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.6
      }
    }
  };

  const sparkVariants = {
    hidden: { scale: 0, opacity: 0, rotate: 0 },
    visible: { 
      scale: [0, 1.5, 1], 
      opacity: [0, 1, 0.8],
      rotate: [0, 180, 360],
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1],
        delay: 1.0
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div 
        data-testid="logo-splash"
        className="fixed inset-0 z-50 bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.32 }}
        onClick={handleSkip}
      >
        {/* Radial glow background */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent"
          variants={glowVariants}
          initial="hidden"
          animate={animationPhase !== 'glow' ? 'visible' : 'hidden'}
        />

        {/* Main brand lockup */}
        <div className="relative">
          {/* Coin + monogram animation */}
          <motion.div
            className="relative flex items-center justify-center"
            variants={coinVariants}
            initial="hidden"
            animate={animationPhase !== 'glow' ? 'visible' : 'hidden'}
            style={{ perspective: '1000px' }}
          >
            <motion.img 
              src={ipgLogo} 
              alt="IPG I-SMART Logo" 
              className="w-36 h-36 object-contain drop-shadow-2xl rounded-2xl"
              animate={{
                filter: [
                  'drop-shadow(0 0 20px hsl(248 67% 64% / 0.4))',
                  'drop-shadow(0 0 30px hsl(186 100% 50% / 0.6))',
                  'drop-shadow(0 0 20px hsl(248 67% 64% / 0.4))'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

          {/* Wordmark mask reveal */}
          <motion.div
            className="mt-8 text-center overflow-hidden"
            variants={textVariants}
            initial="hidden"
            animate={animationPhase === 'text' || animationPhase === 'spark' || animationPhase === 'complete' ? 'visible' : 'hidden'}
          >
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-space-grotesk tracking-wider">
              IPG I-SMART
            </h1>
            <motion.div 
              className="h-0.5 w-32 mx-auto mt-3 bg-gradient-to-r from-transparent via-accent to-transparent rounded"
              animate={{ scaleX: [0, 1], opacity: [0, 1] }}
              transition={{ delay: 0.8, duration: 0.6 }}
            />
          </motion.div>

          {/* Star spark pop + settle */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute -top-6 -right-6"
              variants={sparkVariants}
              initial="hidden"
              animate={animationPhase === 'spark' || animationPhase === 'complete' ? 'visible' : 'hidden'}
            >
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M20 0 L22 18 L40 20 L22 22 L20 40 L18 22 L0 20 L18 18 Z" 
                      fill="hsl(186, 100%, 50%)" 
                      className="drop-shadow-[0_0_10px_hsl(186,100%,50%)]"/>
              </svg>
            </motion.div>
          )}
        </div>

        {/* Skip indicator */}
        {canSkip && canSkipNow && (
          <motion.div
            className="absolute bottom-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <p className="text-sm text-muted-foreground">Tap to skip</p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default BrandSplash;