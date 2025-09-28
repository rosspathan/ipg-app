import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Gift, Percent, TrendingUp } from 'lucide-react';
import { useBSKPromotion } from '@/hooks/useBSKPromotion';
import { useNavigate } from 'react-router-dom';

interface BSKPromotionBannerProps {
  showFullDetails?: boolean;
  className?: string;
}

export const BSKPromotionBanner: React.FC<BSKPromotionBannerProps> = ({
  showFullDetails = false,
  className = ""
}) => {
  const {
    activeCampaign,
    getUserStatus,
    getTimeRemaining,
    calculateExpectedBonus,
    loading
  } = useBSKPromotion();
  const navigate = useNavigate();

  if (loading || !activeCampaign) {
    return null;
  }

  const userStatus = getUserStatus();
  const timeRemaining = getTimeRemaining();
  const exampleBonus = calculateExpectedBonus(activeCampaign.min_purchase_inr);

  const getStatusBadge = () => {
    switch (userStatus) {
      case 'eligible':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Eligible</Badge>;
      case 'claimed':
        return <Badge variant="secondary">Already Claimed</Badge>;
      case 'ineligible':
        return <Badge variant="destructive">Ineligible</Badge>;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    switch (userStatus) {
      case 'eligible':
        return "Don't miss out! Limited time offer";
      case 'claimed':
        return "Thank you for participating in this promotion";
      case 'ineligible':
        return "This promotion is not available for your account";
      default:
        return "";
    }
  };

  return (
    <Card className={`bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 ${className}`}>
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{activeCampaign.name}</h3>
              <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Bonus Rate</p>
              <p className="font-semibold">{activeCampaign.bonus_percent}% Extra BSK</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Purchase Range</p>
              <p className="font-semibold">₹{activeCampaign.min_purchase_inr.toLocaleString()} - ₹{activeCampaign.max_purchase_inr.toLocaleString()}</p>
            </div>
          </div>

          {timeRemaining && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Time Remaining</p>
                <p className="font-semibold">
                  {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m
                </p>
              </div>
            </div>
          )}
        </div>

        {showFullDetails && (
          <div className="space-y-3 mb-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Purchase BSK worth ₹{activeCampaign.min_purchase_inr.toLocaleString()} or more</li>
                <li>• Get {activeCampaign.bonus_percent}% extra BSK instantly</li>
                <li>• Bonus credited to {activeCampaign.destination} balance</li>
                <li>• One-time offer per user</li>
              </ul>
            </div>

            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Example:</strong> Purchase ₹{activeCampaign.min_purchase_inr.toLocaleString()} worth BSK 
                → Get <strong>{exampleBonus.toFixed(2)} BSK bonus</strong> ({activeCampaign.bonus_percent}% extra)
              </p>
            </div>
          </div>
        )}

        {userStatus === 'eligible' && (
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/app/wallet')}
              className="flex-1"
            >
              Buy BSK Now
            </Button>
            {!showFullDetails && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/app/programs')}
              >
                Learn More
              </Button>
            )}
          </div>
        )}

        {userStatus === 'claimed' && (
          <Button 
            variant="outline" 
            onClick={() => navigate('/app/programs')}
            className="w-full"
          >
            View History
          </Button>
        )}
      </CardContent>
    </Card>
  );
};