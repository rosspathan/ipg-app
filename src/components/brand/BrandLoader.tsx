import React from 'react';
import { motion } from 'framer-motion';
import ipgLogo from '@/assets/ipg-logo.jpg';


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
      scale: [1, 1.05, 1],
      transition: {
        duration: 2.5,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  };

  const pulseVariants = {
    pulse: {
      filter: [
        'drop-shadow(0 0 8px hsl(248 67% 64% / 0.4))',
        'drop-shadow(0 0 16px hsl(186 100% 50% / 0.6))',
        'drop-shadow(0 0 8px hsl(248 67% 64% / 0.4))'
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <div data-testid="logo-loader" className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        {/* Rotating outer ring */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          variants={ringVariants}
          animate="rotate"
        >
          <svg 
            width={currentSize.width + 16} 
            height={currentSize.height + 16} 
            viewBox="0 0 80 80"
            className="opacity-60"
          >
            <circle 
              cx="40" 
              cy="40" 
              r="38" 
              fill="none" 
              stroke="url(#loaderGradient)" 
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="180 60"
            />
            <defs>
              <linearGradient id="loaderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="hsl(248, 67%, 64%)"/>
                <stop offset="100%" stopColor="hsl(186, 100%, 50%)"/>
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Pulsing logo */}
        <motion.div
          className="relative flex items-center justify-center z-10"
          variants={pulseVariants}
          animate="pulse"
        >
          <img 
            src={ipgLogo} 
            alt="IPG I-SMART Loading" 
            className="object-contain rounded-lg"
            style={{
              width: currentSize.width,
              height: currentSize.height
            }}
          />
        </motion.div>
      </div>
      
      {label && (
        <motion.p 
          className="text-sm text-muted-foreground font-medium tabular-nums"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
};

export default BrandLoader;