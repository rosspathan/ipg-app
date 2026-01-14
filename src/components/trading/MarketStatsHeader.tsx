import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity, Wifi, WifiOff, Database } from 'lucide-react';
import { PriceDisplay } from './PriceDisplay';

interface MarketStatsHeaderProps {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: number;
  isConnected?: boolean;
  quoteCurrency?: string;
  isInternalPair?: boolean;
}

export const MarketStatsHeader: React.FC<MarketStatsHeaderProps> = ({
  symbol,
  currentPrice,
  priceChange24h,
  high24h,
  low24h,
  volume24h,
  isConnected = true,
  quoteCurrency = 'USDT',
  isInternalPair = false,
}) => {
  const isPositive = priceChange24h >= 0;
  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(2)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  // For internal pairs (like IPG/USDT), always show as "Live" since they use database data
  // Only external pairs (Binance) rely on WebSocket connection
  const showLiveStatus = isInternalPair || isConnected;

  return (
    <div className="bg-gradient-to-r from-card via-card to-muted/30 border-b border-border">
      {/* Main Stats Row */}
      <div className="px-3 py-2 flex items-center justify-between">
        <PriceDisplay 
          price={currentPrice}
          priceChange={priceChange24h}
          quoteCurrency={quoteCurrency}
          size="lg"
        />
        
        {/* Price Change Badge */}
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
          isPositive 
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
            : "bg-red-500/10 text-red-400 border border-red-500/20"
        )}>
          {isPositive ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%</span>
        </div>
      </div>

      {/* Secondary Stats Row */}
      <div className="px-3 py-1.5 flex items-center gap-4 border-t border-border/50 bg-muted/20">
        {high24h !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">24h High</span>
            <span className="text-[10px] sm:text-xs font-mono text-emerald-400">
              {high24h >= 1 ? high24h.toFixed(2) : high24h.toFixed(6)}
            </span>
          </div>
        )}
        {low24h !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">24h Low</span>
            <span className="text-[10px] sm:text-xs font-mono text-red-400">
              {low24h >= 1 ? low24h.toFixed(2) : low24h.toFixed(6)}
            </span>
          </div>
        )}
        {volume24h !== undefined && (
          <div className="flex items-center gap-1.5">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] sm:text-xs font-mono text-foreground">
              {formatVolume(volume24h)}
            </span>
          </div>
        )}
        
        {/* Connection Status */}
        <div className="ml-auto flex items-center gap-1">
          {isInternalPair ? (
            <>
              <Database className="h-3 w-3 text-primary" />
              <span className="text-[10px] text-primary">Internal</span>
            </>
          ) : showLiveStatus ? (
            <>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-emerald-400">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-amber-500" />
              <span className="text-[10px] text-amber-500">Reconnecting...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};