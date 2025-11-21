import { useUserPurchaseClaims } from '@/hooks/usePurchaseOffers';
import { useBSKExchangeRate, formatBSKtoINR } from '@/hooks/useBSKExchangeRate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Lock, Calendar, Gift, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

export default function PurchaseHistoryPage() {
  const navigate = useNavigate();
  const { data: claims, isLoading } = useUserPurchaseClaims();
  const { data: bskRate } = useBSKExchangeRate();

  const totalSpent = claims?.reduce((sum, claim) => sum + claim.purchase_amount_bsk, 0) || 0;
  const totalWithdrawableBonus = claims?.reduce((sum, claim) => sum + claim.withdrawable_bonus_bsk, 0) || 0;
  const totalHoldingBonus = claims?.reduce((sum, claim) => sum + claim.holding_bonus_bsk, 0) || 0;
  const totalBonus = totalWithdrawableBonus + totalHoldingBonus;

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/programs/bsk-bonus')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Purchase History</h1>
          <p className="text-muted-foreground mt-1">
            Your one-time purchase offers claim history
          </p>
        </div>
      </div>

      {/* Offer Analytics Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Offer Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive breakdown of your claimed offers and bonuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Gift className="h-4 w-4 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground">Offers Claimed</p>
              </div>
              <h3 className="text-3xl font-bold">{claims?.length || 0}</h3>
              <p className="text-xs text-muted-foreground">Total offers redeemed</p>
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-success/10 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <p className="text-sm text-muted-foreground">Withdrawable Bonus</p>
              </div>
              <h3 className="text-3xl font-bold text-success">{totalWithdrawableBonus.toLocaleString()} BSK</h3>
              {bskRate && (
                <p className="text-xs text-muted-foreground">
                  {formatBSKtoINR(totalWithdrawableBonus, bskRate)}
                </p>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Lock className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Holding Bonus</p>
              </div>
              <h3 className="text-3xl font-bold text-primary">{totalHoldingBonus.toLocaleString()} BSK</h3>
              {bskRate && (
                <p className="text-xs text-muted-foreground">
                  {formatBSKtoINR(totalHoldingBonus, bskRate)}
                </p>
              )}
            </div>
            
            <div className="flex flex-col space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-secondary-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Total Bonuses</p>
              </div>
              <h3 className="text-3xl font-bold">{totalBonus.toLocaleString()} BSK</h3>
              {bskRate && (
                <p className="text-xs text-muted-foreground">
                  {formatBSKtoINR(totalBonus, bskRate)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Claims List */}
      <Card>
        <CardHeader>
          <CardTitle>Claim History</CardTitle>
          <CardDescription>
            All your claimed one-time purchase offers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!claims || claims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No purchase history yet
            </div>
          ) : (
            <div className="space-y-4">
              {claims.map((claim: any) => (
                <div
                  key={claim.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{claim.bonus?.campaign_name}</h4>
                      {claim.bonus?.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {claim.bonus.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(claim.claimed_at), 'MMM dd, yyyy')}
                    </Badge>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Amount Paid</p>
                      <p className="font-semibold">{claim.purchase_amount_bsk.toLocaleString()} BSK</p>
                    </div>

                    {claim.withdrawable_bonus_bsk > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <TrendingUp className="h-3 w-3 text-success" />
                          <span>Withdrawable</span>
                        </div>
                        <p className="font-semibold text-success">
                          +{claim.withdrawable_bonus_bsk.toLocaleString()} BSK
                        </p>
                      </div>
                    )}

                    {claim.holding_bonus_bsk > 0 && (
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Lock className="h-3 w-3 text-primary" />
                          <span>Holding</span>
                        </div>
                        <p className="font-semibold text-primary">
                          +{claim.holding_bonus_bsk.toLocaleString()} BSK
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-muted-foreground mb-1">Total Bonus</p>
                      <p className="font-semibold text-accent-foreground">
                        +{(claim.withdrawable_bonus_bsk + claim.holding_bonus_bsk).toLocaleString()} BSK
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
