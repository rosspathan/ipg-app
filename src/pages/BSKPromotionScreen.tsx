import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BacklinkBar } from '@/components/programs-pro/BacklinkBar';
import { BSKPromotionBanner } from '@/components/BSKPromotionBanner';
import { BSKPromotionHistory } from '@/components/BSKPromotionHistory';

export default function BSKPromotionScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <BacklinkBar programName="BSK Purchase Bonus" />
      
      <div className="container mx-auto p-4 space-y-6">
        <BSKPromotionBanner showFullDetails={true} />
        <BSKPromotionHistory />
      </div>
    </div>
  );
}