import React, { useState, useMemo } from 'react';
import { Plus, Info, ChevronDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceStepperInput } from './PriceStepperInput';
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
  lockedBase?: number;
  lockedQuote?: number;
  availableBaseUsd?: number;
  availableQuoteUsd?: number;
  currentPrice: number;
  tickSize?: number;
  lotSize?: number;
  inrRate?: number;
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

const QUICK_PERCENTAGES = [25, 50, 75, 100];

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency,
  quoteCurrency,
  availableBase,
  availableQuote,
  lockedBase = 0,
  lockedQuote = 0,
  availableBaseUsd = 0,
  availableQuoteUsd = 0,
  currentPrice,
  tickSize = 0.00000001,
  lotSize = 0.0001,
  inrRate = 83,
  onPlaceOrder,
  isPlacingOrder = false,
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [amount, setAmount] = useState('');
  const [activePercent, setActivePercent] = useState<number | null>(null);

  const isBuy = side === 'buy';
  const availableBalance = isBuy ? availableQuote : availableBase;
  const balanceCurrency = isBuy ? quoteCurrency : baseCurrency;

  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;

  const total = useMemo(() => {
    if (orderType === 'market') {
      return numAmount * currentPrice;
    }
    return numAmount * numPrice;
  }, [numAmount, numPrice, currentPrice, orderType]);

  const estimatedFeeUsdt = total * 0.005; // 0.5% fee
  const totalInr = total * inrRate;
  const currentPriceInr = currentPrice * inrRate;
  
  const willReceive = isBuy ? numAmount : total;
  const willReceiveCurrency = isBuy ? baseCurrency : quoteCurrency;
  const willPay = isBuy ? total : numAmount;
  const willPayCurrency = isBuy ? quoteCurrency : baseCurrency;

  const handleQuickPercent = (pct: number) => {
    setActivePercent(pct);
    const effectivePrice = orderType === 'market' ? currentPrice : numPrice;
    
    if (isBuy && effectivePrice > 0) {
      const maxBuyAmount = (availableQuote * (pct / 100)) / effectivePrice;
      setAmount(maxBuyAmount.toFixed(6));
    } else if (!isBuy) {
      const maxSellAmount = availableBase * (pct / 100);
      setAmount(maxSellAmount.toFixed(6));
    }
  };

  const requiredAmount = isBuy ? total : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;

  const handleSubmit = () => {
    if (numAmount <= 0) return;
    
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
    
    // Reset form on success
    setAmount('');
    setActivePercent(null);
  };

  // Reset active percent when amount changes manually
  const handleAmountChange = (val: string) => {
    setAmount(val);
    setActivePercent(null);
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Market Price Display */}
      <div className="bg-gradient-to-r from-card to-muted/30 border border-border rounded-xl px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Market Price</span>
          <div className="text-right">
            <span className="text-sm sm:text-base font-bold font-mono text-foreground">
              {currentPrice.toFixed(currentPrice >= 1 ? 2 : 6)} {quoteCurrency}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
              ≈ ₹{currentPriceInr.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Buy/Sell Toggle - Premium look */}
      <div className="flex bg-muted/50 rounded-xl p-1 border border-border">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200",
            isBuy
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 py-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-200",
            !isBuy
              ? "bg-red-500 text-white shadow-lg shadow-red-500/25"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sell
        </button>
      </div>

      {/* Available Balance with Locked indicator */}
      <div className="bg-muted/30 border border-border rounded-xl px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Available</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs sm:text-sm font-mono font-medium",
              hasInsufficientBalance ? "text-destructive" : "text-foreground"
            )}>
              {availableBalance.toFixed(4)} {balanceCurrency}
            </span>
            <button className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
        {/* Show locked balance if any */}
        {((isBuy && lockedQuote > 0) || (!isBuy && lockedBase > 0)) && (
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">In Orders</span>
            <span className="text-[10px] font-mono text-amber-400">
              {(isBuy ? lockedQuote : lockedBase).toFixed(4)} {balanceCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Insufficient Balance Warning */}
      {hasInsufficientBalance && (
        <div className="flex items-center gap-2 text-destructive text-[10px] sm:text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Insufficient {balanceCurrency} balance</span>
        </div>
      )}

      {/* Order Type Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2.5 text-xs sm:text-sm hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-foreground font-medium capitalize">{orderType.replace('-', ' ')}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => setOrderType('limit')} className="py-2.5">
            Limit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('market')} className="py-2.5">
            Market
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('stop-limit')} className="py-2.5">
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
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* Quick Amount Buttons */}
      <div className="flex gap-2">
        {QUICK_PERCENTAGES.map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "flex-1 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg border transition-all duration-200",
              activePercent === pct
                ? isBuy 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* Total */}
      <div className="bg-card border border-border rounded-xl px-3 py-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] sm:text-xs text-muted-foreground">Total ({quoteCurrency})</label>
          <div className="text-right">
            <span className="font-mono text-foreground text-sm sm:text-base font-medium">
              {total.toFixed(total >= 1 ? 2 : 6)}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground ml-2">
              ≈ ₹{totalInr.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      {numAmount > 0 && (
        <div className="bg-muted/30 border border-border rounded-xl px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">You will pay</span>
            <span className="font-mono text-foreground font-medium">
              {willPay.toFixed(willPay >= 1 ? 4 : 6)} {willPayCurrency}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs">
            <span className="text-muted-foreground">You will receive</span>
            <span className={cn(
              "font-mono font-semibold",
              isBuy ? "text-emerald-400" : "text-amber-400"
            )}>
              {willReceive.toFixed(willReceive >= 1 ? 4 : 6)} {willReceiveCurrency}
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] sm:text-xs pt-1 border-t border-border/50">
            <span className="text-muted-foreground">Est. Fee (0.5%)</span>
            <span className="text-foreground font-mono">
              {estimatedFeeUsdt.toFixed(4)} {quoteCurrency}
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0 || hasInsufficientBalance}
        className={cn(
          "w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl transition-all duration-200",
          hasInsufficientBalance
            ? "bg-muted text-muted-foreground"
            : isBuy
              ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
              : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40"
        )}
      >
        {isPlacingOrder ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Placing Order...</span>
          </div>
        ) : hasInsufficientBalance ? (
          'Insufficient Balance'
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </Button>
    </div>
  );
};
