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
        <motion.div
          className="relative flex items-center justify-center"
          animate={{
            rotate: 360,
            transition: {
              duration: 3,
              repeat: Infinity,
              ease: 'linear'
            }
          }}
        >
          <img 
            src={ipgLogo} 
            alt="IPG I-SMART Logo Loading" 
            className="object-contain rounded-lg"
            style={{
              width: currentSize.width,
              height: currentSize.height,
              filter: 'brightness(1.1) drop-shadow(0 0 8px hsl(var(--primary) / 0.3))'
            }}
          />
        </motion.div>
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