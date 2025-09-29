import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BrandHeaderLogoProps {
  size?: 'small' | 'medium' | 'large';
  onRefresh?: boolean;
  onSuccess?: boolean;
  onError?: boolean;
  className?: string;
}

const BrandHeaderLogo: React.FC<BrandHeaderLogoProps> = ({
  size = 'medium',
  onRefresh = false,
  onSuccess = false,
  onError = false,
  className = ''
}) => {
  const [showAbout, setShowAbout] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const sizeMap = {
    small: { width: 24, height: 24, strokeWidth: 1 },
    medium: { width: 32, height: 32, strokeWidth: 1.5 },
    large: { width: 40, height: 40, strokeWidth: 2 }
  };

  const currentSize = sizeMap[size];

  // Breathing glow effect
  useEffect(() => {
    const interval = setInterval(() => {
      setGlowIntensity(prev => (prev + 0.02) % (Math.PI * 2));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const glowOpacity = 0.04 + Math.sin(glowIntensity) * 0.04;

  const logoVariants = {
    idle: { 
      rotate: 0,
      scale: 1,
      filter: `drop-shadow(0 0 8px hsl(242, 86%, 65%, ${glowOpacity}))`
    },
    refresh: { 
      rotate: 180,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    },
    success: {
      scale: [1, 1.1, 1],
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    },
    error: {
      x: [-2, 2, -2, 2, 0],
      filter: 'drop-shadow(0 0 8px hsl(0, 84%, 60%, 0.6))',
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const sparkVariants = {
    idle: { scale: 1, opacity: 0.8 },
    tick: {
      scale: [1, 0.5, 1.2, 1],
      opacity: [0.8, 1, 1, 0.8],
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
    },
    success: {
      scale: [1, 1.5, 1],
      opacity: [0.8, 1, 0.8],
      transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
    }
  };

  const getAnimationState = () => {
    if (onError) return 'error';
    if (onRefresh) return 'refresh';
    if (onSuccess) return 'success';
    return 'idle';
  };

  const getSparkState = () => {
    if (onSuccess) return 'success';
    if (onRefresh) return 'tick';
    return 'idle';
  };

  return (
    <>
      <motion.button
        data-testid="logo-header"
        className={`focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg p-1 ${className}`}
        onClick={() => setShowAbout(true)}
        variants={logoVariants}
        animate={getAnimationState()}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <svg
          width={currentSize.width}
          height={currentSize.height}
          viewBox="0 0 32 32"
          className="overflow-visible"
        >
          <defs>
            <radialGradient id="headerCoinGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="hsl(242, 86%, 70%)" stopOpacity="0.9"/>
              <stop offset="40%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="hsl(242, 86%, 45%)" stopOpacity="0.8"/>
            </radialGradient>
            <linearGradient id="headerRimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="hsl(242, 86%, 65%)" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="hsl(188, 100%, 50%)" stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          
          {/* Success pulse ring */}
          {onSuccess && (
            <motion.circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="hsl(142, 76%, 36%)"
              strokeWidth="2"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          
          {/* Main coin */}
          <circle cx="16" cy="16" r="15" fill="none" stroke="url(#headerRimGlow)" strokeWidth={currentSize.strokeWidth} opacity="0.4"/>
          <circle cx="16" cy="16" r="13" fill="url(#headerCoinGradient)" stroke="hsl(242, 86%, 65%)" strokeWidth="0.5"/>
          <circle cx="16" cy="16" r="10" fill="hsl(215, 25%, 8%)" stroke="hsl(242, 86%, 65%)" strokeWidth="0.5"/>
          
          {/* IS Monogram */}
          <g transform="translate(16, 16) scale(0.4)">
            {/* I */}
            <rect x="-18" y="-12" width="4" height="24" fill="hsl(242, 86%, 65%)"/>
            <rect x="-22" y="-12" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
            <rect x="-22" y="9" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
            
            {/* S */}
            <path d="M2 -12 Q12 -12 12 -6 Q12 0 2 0 Q12 0 12 6 Q12 12 2 12 L-2 12 Q-6 12 -6 8" 
                  fill="none" stroke="hsl(242, 86%, 65%)" strokeWidth="3.5" strokeLinecap="round"/>
            
            {/* Star spark */}
            <motion.g
              variants={sparkVariants}
              animate={getSparkState()}
            >
              <circle cx="-16" cy="-18" r="2" fill="hsl(188, 100%, 50%)"/>
              <path d="M-16 -22 L-15 -19 L-12 -18 L-15 -17 L-16 -14 L-17 -17 L-20 -18 L-17 -19 Z" 
                    fill="hsl(188, 100%, 50%)"/>
            </motion.g>
          </g>
        </svg>
      </motion.button>

      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <svg width="40" height="40" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="15" fill="url(#headerCoinGradient)" stroke="hsl(242, 86%, 65%)"/>
                <circle cx="16" cy="16" r="10" fill="hsl(215, 25%, 8%)"/>
                <g transform="translate(16, 16) scale(0.4)">
                  <rect x="-18" y="-12" width="4" height="24" fill="hsl(242, 86%, 65%)"/>
                  <rect x="-22" y="-12" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
                  <rect x="-22" y="9" width="12" height="3" fill="hsl(242, 86%, 65%)"/>
                  <path d="M2 -12 Q12 -12 12 -6 Q12 0 2 0 Q12 0 12 6 Q12 12 2 12 L-2 12 Q-6 12 -6 8" 
                        fill="none" stroke="hsl(242, 86%, 65%)" strokeWidth="3.5" strokeLinecap="round"/>
                  <circle cx="-16" cy="-18" r="2" fill="hsl(188, 100%, 50%)"/>
                  <path d="M-16 -22 L-15 -19 L-12 -18 L-15 -17 L-16 -14 L-17 -17 L-20 -18 L-17 -19 Z" 
                        fill="hsl(188, 100%, 50%)"/>
                </g>
              </svg>
              About I-SMART
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              IPG i-SMART Exchange - The future of digital trading and crypto earnings.
            </p>
            
            <div className="space-y-2">
              <h4 className="font-semibold">Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Secure Web3 wallet with BIP39 recovery</li>
                <li>• Multi-level BSK rewards ecosystem</li>
                <li>• Real-time trading with live market data</li>
                <li>• Insurance and loan programs</li>
              </ul>
            </div>
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Version 1.0.0 • Built with Lovable
              </p>
            </div>
            
            <Button onClick={() => setShowAbout(false)} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BrandHeaderLogo;