import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface EnhancedOrderBookProps {
  orderBook: {
    bids: [number, number][];
    asks: [number, number][];
  };
  currentPrice: number;
  changePercent: number;
  onPriceClick?: (price: number, side: 'buy' | 'sell') => void;
}

const EnhancedOrderBook: React.FC<EnhancedOrderBookProps> = ({
  orderBook,
  currentPrice,
  changePercent,
  onPriceClick
}) => {
  const formatOrderBookData = (data: [number, number][]): OrderBookEntry[] => {
    return data.map(([price, quantity]) => ({
      price,
      quantity,
      total: price * quantity
    }));
  };

  const asks = formatOrderBookData(orderBook.asks).slice(0, 8).reverse();
  const bids = formatOrderBookData(orderBook.bids).slice(0, 8);

  const maxTotal = Math.max(
    ...asks.map(a => a.total),
    ...bids.map(b => b.total)
  );

  const handlePriceClick = (price: number, side: 'buy' | 'sell') => {
    onPriceClick?.(price, side);
  };

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Order Book
          <span className="text-xs text-muted-foreground ml-auto">Real-time</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          {/* Header */}
          <div className="flex justify-between text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border">
            <span>Price</span>
            <span>Size</span>
            <span>Total</span>
          </div>

          {/* Asks (Sell orders) */}
          <div className="space-y-1">
            {asks.map((ask, index) => {
              const fillPercentage = (ask.total / maxTotal) * 100;
              return (
                <div 
                  key={`ask-${index}`}
                  className="relative flex justify-between text-xs px-3 py-1 hover:bg-red-500/10 cursor-pointer transition-colors group"
                  onClick={() => handlePriceClick(ask.price, 'sell')}
                >
                  <div 
                    className="absolute right-0 top-0 h-full bg-red-500/10 transition-all duration-300"
                    style={{ width: `${fillPercentage}%` }}
                  />
                  <span className="text-red-500 font-medium relative z-10">
                    {ask.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="relative z-10">{ask.quantity.toFixed(4)}</span>
                  <span className="text-muted-foreground relative z-10">
                    {ask.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Current Price Spread */}
          <div className="flex justify-center items-center py-3 border-y border-border bg-gradient-to-r from-transparent via-muted/20 to-transparent">
            <div className="flex items-center gap-2">
              {changePercent >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`font-bold text-sm ${
                changePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <span className={`text-xs ${
                changePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            </div>
          </div>
          
          {/* Bids (Buy orders) */}
          <div className="space-y-1">
            {bids.map((bid, index) => {
              const fillPercentage = (bid.total / maxTotal) * 100;
              return (
                <div 
                  key={`bid-${index}`}
                  className="relative flex justify-between text-xs px-3 py-1 hover:bg-green-500/10 cursor-pointer transition-colors group"
                  onClick={() => handlePriceClick(bid.price, 'buy')}
                >
                  <div 
                    className="absolute right-0 top-0 h-full bg-green-500/10 transition-all duration-300"
                    style={{ width: `${fillPercentage}%` }}
                  />
                  <span className="text-green-500 font-medium relative z-10">
                    {bid.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span className="relative z-10">{bid.quantity.toFixed(4)}</span>
                  <span className="text-muted-foreground relative z-10">
                    {bid.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedOrderBook;