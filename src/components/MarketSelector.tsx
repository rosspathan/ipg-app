import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { TrendingUp, TrendingDown } from 'lucide-react';
import AssetLogo from './AssetLogo';

interface MarketSelectorProps {
  selectedPair: string;
  pairsList: any[];
  onPairChange: (pair: string) => void;
  currentPrice: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
}

const MarketSelector: React.FC<MarketSelectorProps> = ({
  selectedPair,
  pairsList,
  onPairChange,
  currentPrice,
  changePercent,
  high24h,
  low24h,
  volume24h
}) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2
    }).format(volume);
  };

  return (
    <div className="space-y-4">
      {/* Pair Selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedPair} onValueChange={onPairChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pairsList.map(pair => (
              <SelectItem key={pair.pair} value={pair.pair}>
                <div className="flex items-center gap-2">
                  <AssetLogo symbol={pair.base_symbol} logoUrl={pair.base_logo} size="sm" />
                  <AssetLogo symbol={pair.quote_symbol} logoUrl={pair.quote_logo} size="sm" />
                  <span className="font-medium">{pair.pair}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold">
            {formatPrice(currentPrice)}
          </div>
          <div className={`flex items-center text-sm ${
            changePercent >= 0 ? 'text-green-500' : 'text-red-500'
          }`}>
            {changePercent >= 0 ? (
              <TrendingUp className="w-4 h-4 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 mr-1" />
            )}
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground block">24h High</span>
          <span className="font-medium">{formatPrice(high24h)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">24h Low</span>
          <span className="font-medium">{formatPrice(low24h)}</span>
        </div>
        <div>
          <span className="text-muted-foreground block">24h Volume</span>
          <span className="font-medium">{formatVolume(volume24h)}</span>
        </div>
      </div>
    </div>
  );
};

export default MarketSelector;