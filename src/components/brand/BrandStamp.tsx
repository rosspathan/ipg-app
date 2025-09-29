import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';


interface BrandStampProps {
  type: 'win' | 'lose' | 'claimed' | 'paid';
  isVisible: boolean;
  onComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const BrandStamp: React.FC<BrandStampProps> = ({
  type,
  isVisible,
  onComplete,
  size = 'medium',
  className = ''
}) => {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'main' | 'exit'>('enter');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sizeMap = {
    small: { width: 80, height: 80, fontSize: 'text-sm' },
    medium: { width: 120, height: 120, fontSize: 'text-lg' },
    large: { width: 160, height: 160, fontSize: 'text-xl' }
  };

  const currentSize = sizeMap[size];

  const typeConfig = {
    win: {
      label: 'WIN!',
      color: 'hsl(142, 76%, 36%)',
      bgColor: 'hsl(142, 76%, 36%, 0.1)',
      duration: 1500
    },
    lose: {
      label: 'TRY AGAIN',
      color: 'hsl(0, 84%, 60%)',
      bgColor: 'hsl(0, 84%, 60%, 0.1)',
      duration: 900
    },
    claimed: {
      label: 'CLAIMED',
      color: 'hsl(188, 100%, 50%)',
      bgColor: 'hsl(188, 100%, 50%, 0.1)',
      duration: 1200
    },
    paid: {
      label: 'PAID',
      color: 'hsl(142, 76%, 36%)',
      bgColor: 'hsl(142, 76%, 36%, 0.1)',
      duration: 1200
    }
  };

  const config = typeConfig[type];

  useEffect(() => {
    if (!isVisible) return;

    const timers = [
      setTimeout(() => setAnimationPhase('main'), 200),
      setTimeout(() => setAnimationPhase('exit'), config.duration - 300),
      setTimeout(() => {
        setAnimationPhase('enter');
        onComplete?.();
      }, config.duration)
    ];

    return () => timers.forEach(clearTimeout);
  }, [isVisible, config.duration, onComplete]);

  const containerVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: { 
        duration: prefersReducedMotion ? 0.2 : 0.4, 
        ease: [0.22, 1, 0.36, 1] 
      }
    },
    exit: { 
      scale: 0.9, 
      opacity: 0,
      transition: { 
        duration: 0.3, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  const coinVariants = {
    enter: { rotateY: 0 },
    main: { 
      rotateY: type === 'win' ? 360 : 0,
      transition: { 
        duration: type === 'win' ? 0.8 : 0,
        ease: [0.22, 1, 0.36, 1]
      }
    }
  };

  const confettiVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: [0, 1.5, 0], 
      opacity: [0, 1, 0],
      rotate: [0, 180, 360],
      transition: { 
        duration: 1.2, 
        ease: [0.22, 1, 0.36, 1] 
      }
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        data-testid="logo-stamp"
        className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none ${className}`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {/* Background overlay */}
        <motion.div
          className="absolute inset-0"
          style={{ backgroundColor: config.bgColor }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Main stamp */}
        <div className="relative">
          <motion.svg
            width={currentSize.width}
            height={currentSize.height}
            viewBox="0 0 120 120"
            className="drop-shadow-2xl"
            variants={coinVariants}
            animate={animationPhase}
            style={{ perspective: '1000px' }}
          >
            <defs>
              <radialGradient id={`stampGradient-${type}`} cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor={config.color} stopOpacity="0.9"/>
                <stop offset="40%" stopColor={config.color} stopOpacity="0.7"/>
                <stop offset="100%" stopColor={config.color} stopOpacity="0.5"/>
              </radialGradient>
              <filter id={`stampGlow-${type}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Coin base */}
            <circle 
              cx="60" 
              cy="60" 
              r="58" 
              fill={`url(#stampGradient-${type})`} 
              stroke={config.color} 
              strokeWidth="2" 
              filter={`url(#stampGlow-${type})`}
            />
            
            <circle cx="60" cy="60" r="48" fill="hsl(215, 25%, 8%)" stroke={config.color} strokeWidth="1"/>
            
            {/* Content based on type */}
            {(type === 'claimed' || type === 'paid') && (
              <motion.g
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <path 
                  d="M45 60 L55 70 L75 50" 
                  fill="none" 
                  stroke={config.color} 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </motion.g>
            )}
            
            {type === 'lose' && (
              <motion.g
                initial={{ scale: 1 }}
                animate={{ scale: [1, 0.9, 1] }}
                transition={{ duration: 0.4 }}
              >
                <path 
                  d="M45 45 L75 75 M75 45 L45 75" 
                  stroke={config.color} 
                  strokeWidth="4" 
                  strokeLinecap="round"
                />
              </motion.g>
            )}
          </motion.svg>

          {/* Label */}
          <motion.div
            className={`absolute inset-0 flex items-center justify-center ${currentSize.fontSize} font-bold text-center`}
            style={{ color: config.color }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {config.label}
          </motion.div>

          {/* Win confetti */}
          {type === 'win' && !prefersReducedMotion && (
            <div className="absolute inset-0">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-gradient-to-r from-primary to-accent rounded-full"
                  style={{
                    left: `${20 + (i * 10)}%`,
                    top: `${30 + (i % 3) * 20}%`
                  }}
                  variants={confettiVariants}
                  initial="hidden"
                  animate={animationPhase === 'main' ? 'visible' : 'hidden'}
                  transition={{ delay: 0.4 + (i * 0.1) }}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BrandStamp;