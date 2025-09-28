import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BSKPromotionBanner } from '@/components/BSKPromotionBanner';
import { BSKPromotionHistory } from '@/components/BSKPromotionHistory';

export default function BSKPromotionScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/app/programs')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">BSK Purchase Bonus</h1>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto p-4 space-y-6">
        <BSKPromotionBanner showFullDetails={true} />
        <BSKPromotionHistory />
      </div>
    </div>
  );
}