import React, { useEffect } from 'react';
import BrandSplash from '@/components/brand/BrandSplash';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <BrandSplash 
      onComplete={onComplete}
      duration={2200}
      canSkip={true}
    />
  );
};

export default SplashScreen;