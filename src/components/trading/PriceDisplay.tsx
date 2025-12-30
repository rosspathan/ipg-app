import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceDisplayProps {
  price: number;
  priceChange?: number;
  quoteCurrency?: string;
  inrRate?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const PriceDisplay: React.FC<PriceDisplayProps> = ({
  price,
  priceChange = 0,
  quoteCurrency = 'USDT',
  inrRate = 83,
  size = 'md',
  showIcon = true,
}) => {
  const [flashClass, setFlashClass] = useState<'flash-green' | 'flash-red' | ''>('');
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price !== prevPriceRef.current) {
      const direction = price > prevPriceRef.current ? 'flash-green' : 'flash-red';
      setFlashClass(direction);
      prevPriceRef.current = price;

      const timeout = setTimeout(() => setFlashClass(''), 300);
      return () => clearTimeout(timeout);
    }
  }, [price]);

  const isPositive = priceChange >= 0;
  const formatPrice = (p: number) => p >= 1 ? p.toFixed(2) : p.toFixed(6);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  };

  return (
    <div className="flex items-center gap-2">
      {showIcon && (
        <div className={cn(
          "p-1 rounded",
          isPositive ? "bg-emerald-500/10" : "bg-red-500/10"
        )}>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400" />
          )}
        </div>
      )}
      <div className="flex flex-col">
        <span className={cn(
          "font-bold font-mono transition-all duration-200",
          sizeClasses[size],
          isPositive ? "text-emerald-400" : "text-red-400",
          flashClass === 'flash-green' && "animate-pulse text-emerald-300",
          flashClass === 'flash-red' && "animate-pulse text-red-300"
        )}>
          {formatPrice(price)}
        </span>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          ≈ ₹{(price * inrRate).toFixed(2)}
        </span>
      </div>
    </div>
  );
};
