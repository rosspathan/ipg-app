import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface Trade {
  id: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: string;
}

interface RecentTradesProps {
  trades: Trade[];
}

const RecentTrades: React.FC<RecentTradesProps> = ({ trades }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatQuantity = (qty: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8
    }).format(qty);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border">
            <span>Price</span>
            <span>Qty</span>
            <span>Time</span>
          </div>
          
          <div className="max-h-64 overflow-hidden">
            {trades.length === 0 ? (
              <div className="text-center py-8 px-3">
                <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No recent trades</p>
              </div>
            ) : (
              trades.slice(0, 20).map((trade) => (
                <div
                  key={trade.id}
                  className={`flex justify-between text-xs px-3 py-1 hover:bg-muted/20 ${
                    trade.side === 'buy' ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5'
                  }`}
                >
                  <span className={`font-medium ${
                    trade.side === 'buy' ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {trade.side === 'buy' ? (
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 inline mr-1" />
                    )}
                    {formatPrice(trade.price)}
                  </span>
                  <span>{formatQuantity(trade.quantity)}</span>
                  <span className="text-muted-foreground">{formatTime(trade.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentTrades;