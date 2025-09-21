import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import TradingViewWidget from '@/components/TradingViewWidget';
import { BarChart3 } from 'lucide-react';

interface PriceChartProps {
  symbol: string;
  height?: number;
}

const PriceChart: React.FC<PriceChartProps> = ({ 
  symbol, 
  height = 300 
}) => {
  // Convert symbol format (e.g., "BTC/USDT" to "BINANCE:BTCUSDT")
  const tradingViewSymbol = `BINANCE:${symbol.replace('/', '')}`;

  return (
    <Card className="bg-gradient-card shadow-card border-0">
      <CardContent className="p-0">
        <div className="relative">
          {/* Live indicator */}
          <div className="absolute top-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 border">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
          </div>

          {/* Chart container with gradient overlay */}
          <div 
            className="relative rounded-lg overflow-hidden"
            style={{ height: `${height}px` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent z-10 pointer-events-none" />
            
            <TradingViewWidget
              symbol={tradingViewSymbol}
              height={height}
              width="100%"
              colorTheme="dark"
              widgetType="advanced-chart"
              className="w-full h-full"
            />
          </div>

          {/* Fallback content */}
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Interactive Chart</p>
              <p className="text-xs text-muted-foreground">Click to interact</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceChart;