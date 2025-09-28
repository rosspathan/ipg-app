import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, Calendar, TrendingUp, Award } from 'lucide-react';
import { useBSKPromotion } from '@/hooks/useBSKPromotion';
import { format } from 'date-fns';

export const BSKPromotionHistory: React.FC = () => {
  const { bonusHistory, loading } = useBSKPromotion();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Bonus History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="space-y-1">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bonusHistory.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Bonus History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No bonus history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Purchase BSK to start earning bonuses!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'settled':
        return <Badge variant="default" className="bg-green-600">Settled</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'void':
        return <Badge variant="destructive">Void</Badge>;
      case 'clawed_back':
        return <Badge variant="destructive">Clawed Back</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getChannelDisplay = (channel: string) => {
    switch (channel) {
      case 'inr_onramp':
        return 'INR Purchase';
      case 'swap_ipg_bsk':
        return 'IPG → BSK Swap';
      case 'swap_crypto_bsk':
        return 'Crypto → BSK Swap';
      default:
        return channel;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Bonus History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {bonusHistory.map((event) => (
            <div 
              key={event.id}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">
                      +{event.bonus_bsk} BSK
                    </span>
                    {getStatusBadge(event.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(event.created_at), 'MMM dd, yyyy')}</span>
                    <span>•</span>
                    <span>{getChannelDisplay(event.channel)}</span>
                    <span>•</span>
                    <span>₹{event.purchase_inr.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  Rate: ₹{event.rate_snapshot_bsk_inr}/BSK
                </div>
                <div className="text-sm text-muted-foreground">
                  To: {event.destination}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};