import React from 'react';
import { motion } from 'framer-motion';


interface BrandLoaderProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  label?: string;
}

const BrandLoader: React.FC<BrandLoaderProps> = ({ 
  size = 'medium', 
  className = '',
  label = 'Loading...'
}) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sizeMap = {
    small: { width: 24, height: 24, strokeWidth: 1.5 },
    medium: { width: 40, height: 40, strokeWidth: 2 },
    large: { width: 64, height: 64, strokeWidth: 3 }
  };

  const currentSize = sizeMap[size];

  if (prefersReducedMotion) {
    // Reduced motion: simple progress bar
    return (
      <div data-testid="logo-loader" className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent"
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
        </div>
        {label && <p className="text-sm text-muted-foreground">{label}</p>}
      </div>
    );
  }

  const ringVariants = {
    rotate: {
      rotate: 360,
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  };

  const sparkVariants = {
    orbit: {
      rotate: 360,
      transition: {
        duration: 1.2,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  };

  const pulseVariants = {
    pulse: {
      scale: [1, 1.1, 1],
      opacity: [0.6, 1, 0.6],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div data-testid="logo-loader" className={`flex flex-col items-center gap-3 ${className}`}>
      <div className="relative">
        <motion.svg
          width={currentSize.width}
          height={currentSize.height}
          viewBox="0 0 40 40"
          className="overflow-visible"
        >
          <defs>
            <radialGradient id="loaderCoinGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="hsl(242, 86%, 70%)" stopOpacity="0.9"/>
              <stop offset="40%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="hsl(242, 86%, 45%)" stopOpacity="0.8"/>
            </radialGradient>
            <linearGradient id="loaderRimGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.8"/>
            </linearGradient>
          </defs>
          
          {/* Outer rotating ring */}
          <motion.g variants={ringVariants} animate="rotate">
            <circle 
              cx="20" 
              cy="20" 
              r="18" 
              fill="none" 
              stroke="url(#loaderRimGradient)" 
              strokeWidth={currentSize.strokeWidth}
              strokeDasharray="20 60"
              strokeLinecap="round"
            />
          </motion.g>
          
          {/* Inner coin */}
          <motion.circle 
            cx="20" 
            cy="20" 
            r="14" 
            fill="url(#loaderCoinGradient)" 
            stroke="hsl(242, 86%, 65%)" 
            strokeWidth="1"
            variants={pulseVariants}
            animate="pulse"
          />
          
          <circle cx="20" cy="20" r="10" fill="hsl(215, 25%, 8%)" stroke="hsl(242, 86%, 65%)" strokeWidth="0.5"/>
          
          {/* IS Monogram */}
          <g transform="translate(20, 20) scale(0.3)">
            <rect x="-18" y="-12" width="4" height="24" fill="hsl(242, 86%, 65%)"/>
            <rect x="-22" y="-12" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
            <rect x="-22" y="9" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
            <path d="M2 -12 Q12 -12 12 -6 Q12 0 2 0 Q12 0 12 6 Q12 12 2 12 L-2 12 Q-6 12 -6 8" 
                  fill="none" stroke="hsl(242, 86%, 65%)" strokeWidth="3.5" strokeLinecap="round"/>
          </g>
          
          {/* Orbiting spark */}
          <motion.g 
            variants={sparkVariants} 
            animate="orbit"
            style={{ transformOrigin: '20px 20px' }}
          >
            <circle cx="20" cy="6" r="1.5" fill="hsl(188, 100%, 50%)">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="0.8s" repeatCount="indefinite"/>
            </circle>
            <path d="M20 3 L20.5 5.5 L22.5 6 L20.5 6.5 L20 9 L19.5 6.5 L17.5 6 L19.5 5.5 Z" 
                  fill="hsl(188, 100%, 50%)" opacity="0.8"/>
          </motion.g>
        </motion.svg>
      </div>
      
      {label && (
        <motion.p 
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
};

export default BrandLoader;