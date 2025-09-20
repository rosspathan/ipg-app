import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gift, TrendingUp, Calendar } from 'lucide-react';
import { usePurchaseBonusEvents } from '@/hooks/usePurchaseBonuses';
import { useAuthUser } from '@/hooks/useAuthUser';
import { format, formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function PurchaseBonusHistory() {
  const { user } = useAuthUser();
  const { data: events = [], isLoading } = usePurchaseBonusEvents(user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Gift className="w-5 h-5" />
            <span>Purchase Bonuses</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEarned = events
    .filter(event => event.status === 'granted')
    .reduce((sum, event) => sum + event.bonus_amount, 0);

  const totalReversed = events
    .filter(event => event.status === 'reversed')
    .reduce((sum, event) => sum + event.bonus_amount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5" />
            <span>Purchase Bonuses</span>
          </div>
          <Badge variant="outline" className="text-sm">
            {events.length} transactions
          </Badge>
        </CardTitle>
        
        {events.length > 0 && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-900">Total Earned</div>
                <div className="text-xs text-green-700">{totalEarned} BSK</div>
              </div>
            </div>
            
            {totalReversed > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
                <div>
                  <div className="text-sm font-medium text-red-900">Reversed</div>
                  <div className="text-xs text-red-700">{totalReversed} BSK</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-sm">No purchase bonuses yet</p>
            <p className="text-xs mt-1">Start buying eligible coins to earn BSK rewards!</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            <div className="space-y-3">
              {events.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium">
                        {event.base_filled} {event.base_symbol}
                      </span>
                      <span className="text-xs text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-primary">
                        {event.bonus_amount} {event.bonus_symbol}
                      </span>
                      <Badge 
                        variant={event.status === 'granted' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {event.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{format(new Date(event.created_at), 'MMM dd, yyyy')}</span>
                      </div>
                      <span>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    {event.order_id && (
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        Order: {event.order_id.slice(0, 8)}...
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      event.status === 'granted' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {event.status === 'granted' ? '+' : '-'}{event.bonus_amount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.bonus_symbol}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}