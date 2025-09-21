import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

interface OrderBookProps {
  orderBook: {
    bids: [number, number][];
    asks: [number, number][];
  };
  currentPrice: number;
  changePercent: number;
}

const TradingOrderBook: React.FC<OrderBookProps> = ({ 
  orderBook, 
  currentPrice, 
  changePercent 
}) => {
  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Order Book
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border">
            <span>Price</span>
            <span>Qty</span>
            <span>Total</span>
          </div>

          {/* Asks (Sell orders) */}
          <div className="space-y-1 max-h-32 overflow-hidden">
            {orderBook.asks.slice(0, 10).reverse().map(([price, qty], index) => {
              const total = price * qty;
              return (
                <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-red-500/10">
                  <span className="text-red-500 font-medium">{price.toFixed(2)}</span>
                  <span>{qty.toFixed(3)}</span>
                  <span className="text-muted-foreground">{total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          
          {/* Current Price */}
          <div className="flex justify-center items-center py-2 border-y border-border bg-muted/20">
            <div className="flex items-center gap-2">
              {changePercent >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`font-medium text-sm ${
                changePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {currentPrice.toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* Bids (Buy orders) */}
          <div className="space-y-1 max-h-32 overflow-hidden">
            {orderBook.bids.slice(0, 10).map(([price, qty], index) => {
              const total = price * qty;
              return (
                <div key={index} className="flex justify-between text-xs px-3 py-1 hover:bg-green-500/10">
                  <span className="text-green-500 font-medium">{price.toFixed(2)}</span>
                  <span>{qty.toFixed(3)}</span>
                  <span className="text-muted-foreground">{total.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingOrderBook;