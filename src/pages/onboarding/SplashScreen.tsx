import React, { useEffect } from 'react';
import BrandSplash from '@/components/brand/BrandSplash';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  return (
    <BrandSplash 
      onComplete={onComplete}
      duration={1500}
      canSkip={true}
    />
  );
};

export default SplashScreen;