import React from 'react';
import { CyberCard, CyberCardContent, CyberCardHeader, CyberCardTitle } from '@/components/ui/cyber-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, TrendingUp, Coins, Info, ArrowUpDown, Eye } from 'lucide-react';
import { useReferralProgram } from '@/hooks/useReferralProgram';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useNavigate } from 'react-router-dom';
import { useFX } from '@/hooks/useFX';

interface BonusBalanceCardProps {
  className?: string;
  style?: React.CSSProperties;
}

const BonusBalanceCard: React.FC<BonusBalanceCardProps> = ({ className, style }) => {
  const { user } = useAuthUser();
  const { bonusAssets, bonusBalances, getCurrentPrice, loading } = useReferralProgram();
  const navigate = useNavigate();
  const { formatCurrency } = useFX();

  if (loading) {
    return (
      <CyberCard className={className} style={style}>
        <CyberCardContent className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading...</div>
        </CyberCardContent>
      </CyberCard>
    );
  }

  const userId = user?.id;
  const userBonusBalances = userId ? bonusBalances.filter(balance => balance.user_id === userId) : [];
  const bskAsset = bonusAssets.find(asset => asset.symbol === 'BSK');
  const bskBalance = userBonusBalances.find(balance => 
    bskAsset && balance.asset_id === bskAsset.id
  );
  
  const bskAmount = bskBalance?.balance || 0;
  const bskPrice = bskAsset ? getCurrentPrice(bskAsset.id) : 0;
  const bskValue = bskAmount * bskPrice;

  const pendingAmount = 0; // TODO: Get from pending rewards when implemented

  return (
    <CyberCard className={className} style={style} variant="elevated">
      <CyberCardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CyberCardTitle className="text-sm font-medium flex items-center space-x-2">
          <Gift className="w-4 h-4 text-primary" />
          <span>Bonus Balance (BSK)</span>
          <Info className="w-3 h-3 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
        </CyberCardTitle>
        <Badge variant="secondary" className="text-xs px-2 py-1 bg-warning/10 text-warning border-warning/20">
          OFF-CHAIN
        </Badge>
      </CyberCardHeader>
      <CyberCardContent>
        <div className="space-y-6">
          {bskAsset ? (
            bskAmount > 0 ? (
              <>
                {/* Value Block */}
                <div className="text-center space-y-2">
                  <div className="text-3xl font-bold text-foreground tabular-nums">
                    {bskAmount.toFixed(8)} BSK
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ≈ {formatCurrency(bskValue)}
                  </div>
                </div>

                {/* Meta Row */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-card-glass backdrop-blur-[14px] border border-white/5">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Available</div>
                    <div className="font-semibold text-foreground tabular-nums">{bskAmount.toFixed(4)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">Pending</div>
                    <div className="font-semibold text-foreground tabular-nums">{pendingAmount.toFixed(4)}</div>
                  </div>
                </div>

                {/* Price Info */}
                <div className="flex items-center justify-center space-x-2 text-xs text-muted-foreground">
                  <TrendingUp className="w-3 h-3" />
                  <span>Price: 1 BSK = {bskPrice.toFixed(4)} USDT (admin)</span>
                </div>

                {/* Actions Row */}
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="w-full bg-gradient-primary border-0 hover:shadow-glow-primary"
                    onClick={() => {/* TODO: Implement convert to USDT */}}
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Convert to USDT
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full hover:bg-primary/10 hover:border-primary/30"
                    onClick={() => navigate('/app/programs/referrals')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Rewards
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="relative mb-4">
                  <Gift className="w-12 h-12 mx-auto opacity-30" />
                  <div className="absolute inset-0 bg-gradient-ring blur-xl opacity-20" />
                </div>
                <p className="text-sm font-medium mb-2">No bonus rewards yet</p>
                <p className="text-xs mb-4">Share your referral code to earn BSK!</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/app/programs/referrals')}
                  className="hover:bg-primary/10 hover:border-primary/30"
                >
                  View Referral Program
                </Button>
              </div>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="relative mb-4">
                <Coins className="w-12 h-12 mx-auto opacity-30" />
                <div className="absolute inset-0 bg-gradient-ring blur-xl opacity-20" />
              </div>
              <p className="text-sm font-medium mb-2">BSK not available</p>
              <p className="text-xs mb-4">Contact admin to enable BSK rewards</p>
            </div>
          )}
        </div>
      </CyberCardContent>
    </CyberCard>
  );
};

export default BonusBalanceCard;