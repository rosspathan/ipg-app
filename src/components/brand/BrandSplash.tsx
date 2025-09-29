import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


interface BrandSplashProps {
  onComplete: () => void;
  duration?: number;
  canSkip?: boolean;
}

const BrandSplash: React.FC<BrandSplashProps> = ({ 
  onComplete, 
  duration = 2200,
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

    // Allow skipping after 1.5s
    const skipTimer = setTimeout(() => setCanSkipNow(true), 1500);

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

  const coinVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  const ringVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      transition: { 
        duration: 0.8, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  const textVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: { 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  const sparkVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: [0, 1.3, 1], 
      opacity: [0, 1, 1],
      transition: { 
        duration: 0.4, 
        ease: [0.22, 1, 0.36, 1] 
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
        {/* Background glow */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-primary/20 via-transparent to-transparent"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ 
            opacity: animationPhase !== 'glow' ? 1 : 0,
            scale: animationPhase !== 'glow' ? 1 : 0.5
          }}
          transition={{ duration: 0.6 }}
        />

        {/* Main logo container */}
        <div className="relative">
          <motion.svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className="drop-shadow-2xl"
            variants={coinVariants}
            initial="hidden"
            animate={animationPhase !== 'glow' ? 'visible' : 'hidden'}
          >
            <defs>
              <radialGradient id="splashCoinGradient" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="hsl(242, 86%, 70%)" stopOpacity="0.9"/>
                <stop offset="40%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.7"/>
                <stop offset="100%" stopColor="hsl(242, 86%, 45%)" stopOpacity="0.8"/>
              </radialGradient>
              <linearGradient id="splashRimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.6"/>
              </linearGradient>
              <filter id="splashGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Outer glow ring */}
            <motion.circle 
              cx="60" 
              cy="60" 
              r="58" 
              fill="none" 
              stroke="url(#splashRimGlow)" 
              strokeWidth="3" 
              filter="url(#splashGlow)"
              variants={ringVariants}
              initial="hidden"
              animate={animationPhase === 'ring' || animationPhase === 'text' || animationPhase === 'spark' || animationPhase === 'complete' ? 'visible' : 'hidden'}
            />
            
            {/* Main coin */}
            <circle cx="60" cy="60" r="54" fill="url(#splashCoinGradient)" stroke="hsl(242, 86%, 65%)" strokeWidth="1"/>
            <circle cx="60" cy="60" r="42" fill="hsl(215, 25%, 8%)" stroke="hsl(242, 86%, 65%)" strokeWidth="1"/>
            
            {/* IS Monogram */}
            <g transform="translate(60, 60)">
              <rect x="-18" y="-12" width="4" height="24" fill="hsl(242, 86%, 65%)"/>
              <rect x="-22" y="-12" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
              <rect x="-22" y="9" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
              <path d="M2 -12 Q12 -12 12 -6 Q12 0 2 0 Q12 0 12 6 Q12 12 2 12 L-2 12 Q-6 12 -6 8" 
                    fill="none" stroke="hsl(242, 86%, 65%)" strokeWidth="3.5" strokeLinecap="round"/>
              
              {/* Star spark */}
              <motion.g
                variants={sparkVariants}
                initial="hidden"
                animate={animationPhase === 'spark' || animationPhase === 'complete' ? 'visible' : 'hidden'}
              >
                <circle cx="-16" cy="-18" r="2" fill="hsl(188, 100%, 50%)"/>
                <path d="M-16 -22 L-15 -19 L-12 -18 L-15 -17 L-16 -14 L-17 -17 L-20 -18 L-17 -19 Z" 
                      fill="hsl(188, 100%, 50%)"/>
              </motion.g>
            </g>
          </motion.svg>

          {/* Wordmark below */}
          <motion.div
            className="mt-6 text-center"
            variants={textVariants}
            initial="hidden"
            animate={animationPhase === 'text' || animationPhase === 'spark' || animationPhase === 'complete' ? 'visible' : 'hidden'}
          >
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent font-space-grotesk">
              I-SMART
            </h1>
            <div className="h-0.5 w-24 mx-auto mt-2 bg-gradient-to-r from-primary/40 via-accent/60 to-primary/40 rounded"/>
          </motion.div>

          {/* Settle animation */}
          <motion.div
            className="absolute inset-0"
            animate={animationPhase === 'complete' ? { scale: 1.03 } : { scale: 1 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          />
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