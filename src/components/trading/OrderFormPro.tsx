import React, { useState, useMemo } from 'react';
import { Plus, Info, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceStepperInput } from './PriceStepperInput';
import { PercentageSliderPro } from './PercentageSliderPro';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface OrderFormProProps {
  baseCurrency: string;
  quoteCurrency: string;
  availableBase: number;
  availableQuote: number;
  availableBaseUsd?: number;
  availableQuoteUsd?: number;
  currentPrice: number;
  tickSize?: number;
  lotSize?: number;
  onPlaceOrder: (params: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price?: number;
    quantity: number;
  }) => void;
  isPlacingOrder?: boolean;
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market' | 'stop-limit';

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency,
  quoteCurrency,
  availableBase,
  availableQuote,
  availableBaseUsd = 0,
  availableQuoteUsd = 0,
  currentPrice,
  tickSize = 0.00000001,
  lotSize = 0.0001,
  onPlaceOrder,
  isPlacingOrder = false,
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState(0);

  const isBuy = side === 'buy';
  const availableBalance = isBuy ? availableQuote : availableBase;
  const availableBalanceUsd = isBuy ? availableQuoteUsd : availableBaseUsd;
  const balanceCurrency = isBuy ? quoteCurrency : baseCurrency;

  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;

  const total = useMemo(() => {
    if (orderType === 'market') {
      return numAmount * currentPrice;
    }
    return numAmount * numPrice;
  }, [numAmount, numPrice, currentPrice, orderType]);

  // Fee is always in USDT (0.1% of order value in USD terms)
  const estimatedFeeUsdt = total * 0.001;

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    if (isBuy) {
      const maxBuyAmount = (availableQuote * (pct / 100)) / (numPrice || currentPrice);
      setAmount(maxBuyAmount.toFixed(4));
    } else {
      const maxSellAmount = availableBase * (pct / 100);
      setAmount(maxSellAmount.toFixed(4));
    }
  };

  // Calculate if user has sufficient balance
  const requiredAmount = isBuy ? total : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;

  const handleSubmit = () => {
    if (numAmount <= 0) return;
    
    // Validate balance before submitting
    if (hasInsufficientBalance) {
      toast.error('Insufficient balance', {
        description: `You need ${requiredAmount.toFixed(4)} ${balanceCurrency} but only have ${availableBalance.toFixed(4)}`,
      });
      return;
    }
    
    onPlaceOrder({
      side,
      type: orderType === 'stop-limit' ? 'limit' : orderType,
      price: orderType === 'market' ? undefined : numPrice,
      quantity: numAmount,
    });
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Buy/Sell Toggle - Compact */}
      <div className="flex bg-muted rounded-full p-0.5">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm",
            isBuy
              ? "bg-emerald-500 text-white"
              : "text-muted-foreground"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 py-2 sm:py-2.5 rounded-full font-semibold text-xs sm:text-sm",
            !isBuy
              ? "bg-red-500 text-white"
              : "text-muted-foreground"
          )}
        >
          Sell
        </button>
      </div>

      {/* Available Balance - Compact */}
      <div className="flex items-center justify-between py-0.5">
        <span className="text-[10px] sm:text-xs text-muted-foreground">Avail</span>
        <div className="flex items-center gap-1.5">
          <div className="text-right">
            <span className={cn(
              "text-xs sm:text-sm font-mono block",
              hasInsufficientBalance ? "text-destructive" : "text-foreground"
            )}>
              {availableBalance.toFixed(2)} {balanceCurrency}
            </span>
          </div>
          <button className="w-5 h-5 sm:w-6 sm:h-6 min-h-0 min-w-0 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Insufficient Balance Warning - Compact */}
      {hasInsufficientBalance && (
        <div className="flex items-center gap-1.5 text-destructive text-[10px] sm:text-xs bg-destructive/10 rounded px-2 py-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>Insufficient balance</span>
        </div>
      )}

      {/* Order Type Selector - Compact */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between bg-card border border-border rounded-lg px-2 py-2 sm:py-2.5 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5">
              <Info className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-foreground capitalize">{orderType.replace('-', ' ')}</span>
            </div>
            <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-32 sm:w-40">
          <DropdownMenuItem onClick={() => setOrderType('limit')} className="py-2 text-xs sm:text-sm">
            Limit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('market')} className="py-2 text-xs sm:text-sm">
            Market
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('stop-limit')} className="py-2 text-xs sm:text-sm">
            Stop-Limit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Price Input */}
      {orderType !== 'market' && (
        <PriceStepperInput
          label={`Price (${quoteCurrency})`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
        />
      )}

      {/* Amount Input */}
      <PriceStepperInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={setAmount}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* Percentage Slider */}
      <PercentageSliderPro
        value={percentage}
        onChange={handlePercentageChange}
      />

      {/* Total - Compact */}
      <div className="bg-card border border-border rounded-lg px-2 py-1.5 sm:py-2">
        <label className="block text-[10px] sm:text-xs text-muted-foreground mb-0.5">Total ({quoteCurrency})</label>
        <div className="font-mono text-foreground text-xs sm:text-sm">
          {total.toFixed(2)}
        </div>
      </div>

      {/* Estimated Fee - Compact */}
      <div className="flex items-center justify-between text-[10px] sm:text-xs py-0.5">
        <span className="text-muted-foreground">Est. Fee</span>
        <span className="text-foreground font-mono">
          {estimatedFeeUsdt.toFixed(2)} USDT
        </span>
      </div>

      {/* Submit Button - Compact but usable */}
      <Button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0 || hasInsufficientBalance}
        className={cn(
          "w-full h-9 sm:h-10 text-xs sm:text-sm font-semibold rounded-lg",
          hasInsufficientBalance
            ? "bg-muted text-muted-foreground"
            : isBuy
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-red-500 hover:bg-red-600 text-white"
        )}
      >
        {isPlacingOrder 
          ? 'Placing...' 
          : hasInsufficientBalance 
            ? 'Insufficient'
            : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
      </Button>
    </div>
  );
};