import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, TrendingUp, Coins } from 'lucide-react';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { useAuth } from '@/hooks/useAuth';

interface BonusBalanceCardProps {
  className?: string;
}

const BonusBalanceCard: React.FC<BonusBalanceCardProps> = ({ className }) => {
  const { user } = useAuth();
  const { bonusAssets, bonusBalances, getCurrentPrice, loading } = useReferralProgram();

  if (loading || !user) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  const userBonusBalances = bonusBalances.filter(balance => balance.user_id === user.id);
  const bskAsset = bonusAssets.find(asset => asset.symbol === 'BSK');
  const bskBalance = userBonusBalances.find(balance => 
    bskAsset && balance.asset_id === bskAsset.id
  );
  
  const bskAmount = bskBalance?.balance || 0;
  const bskPrice = bskAsset ? getCurrentPrice(bskAsset.id) : 0;
  const bskValue = bskAmount * bskPrice;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center space-x-2">
          <Gift className="w-4 h-4 text-primary" />
          <span>Bonus Balance</span>
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          OFF-CHAIN
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bskAsset && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <span className="font-medium">{bskAsset.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{bskAmount.toFixed(8)}</div>
                  <div className="text-sm text-muted-foreground">
                    ${bskValue.toFixed(4)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3" />
                <span>Rate: ${bskPrice.toFixed(4)} USDT</span>
              </div>
            </div>
          )}

          {bskAmount === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No bonus rewards yet</p>
              <p className="text-xs">Start referring friends to earn BSK!</p>
            </div>
          )}

          <div className="pt-2 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => {/* Navigate to referrals */}}
            >
              View Referral Program
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BonusBalanceCard;