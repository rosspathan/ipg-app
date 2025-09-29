import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ipgLogo from '@/assets/ipg-logo.jpg';

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
        <img 
          src={ipgLogo} 
          alt="IPG I-SMART Logo" 
          className="object-contain rounded-lg"
          style={{
            width: currentSize.width,
            height: currentSize.height,
            filter: `brightness(1.1) drop-shadow(0 0 8px hsl(var(--primary) / ${glowOpacity/2}))`
          }}
        />
      </motion.button>

      <Dialog open={showAbout} onOpenChange={setShowAbout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img 
                src={ipgLogo} 
                alt="IPG I-SMART Logo" 
                className="w-10 h-10 object-contain rounded"
              />
              About IPG I-SMART
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