import React, { useState, useMemo } from 'react';
import { Plus, Info, ChevronDown, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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
  onPlaceOrder: (params: {
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    price?: number;
    quantity: number;
  }) => void;
  isPlacingOrder?: boolean;
  bestBid?: number;
  bestAsk?: number;
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
  onPlaceOrder,
  isPlacingOrder = false,
  bestBid = 0,
  bestAsk = 0,
}) => {
  const navigate = useNavigate();
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

  // Backend locks 0.5% extra for buy orders as fee buffer
  const requiredAmount = isBuy ? total * 1.005 : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;
  const hasZeroBalance = availableBalance === 0;

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
    <div className="space-y-2.5">
      {/* Market Price Display */}
      <div className="bg-[#0B0F1C]/50 border border-[#1F2937]/40 rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">Market Price</span>
          <span className="text-sm sm:text-base font-bold font-mono text-foreground">
            {currentPrice.toFixed(currentPrice >= 1 ? 2 : 6)} {quoteCurrency}
          </span>
        </div>
      </div>
      
      {/* Buy/Sell Toggle */}
      <div className="flex bg-[#0B0F1C]/60 rounded-xl p-1 border border-[#1F2937]/40">
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

      {/* Trading Balance with Deposit CTA */}
      <div className="bg-[#0B0F1C]/40 border border-[#1F2937]/40 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Trading Balance</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-xs sm:text-sm font-mono font-medium",
              hasInsufficientBalance ? "text-destructive" : "text-foreground"
            )}>
              {availableBalance.toFixed(4)} {balanceCurrency}
            </span>
            <button 
              onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
              className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
              title={`Deposit ${balanceCurrency} to Trading`}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
        {/* Show locked balance - informational only */}
        {((isBuy && lockedQuote > 0) || (!isBuy && lockedBase > 0)) && (
          <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">In Orders (Locked)</span>
            <span className="text-[10px] font-mono text-amber-400">
              {(isBuy ? lockedQuote : lockedBase).toFixed(4)} {balanceCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Zero Balance Helper with Deposit CTA */}
      {hasZeroBalance && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-[10px] sm:text-xs">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
              {isBuy 
                ? `No ${quoteCurrency} in Trading Balance.`
                : `No ${baseCurrency} in Trading Balance.`
              }
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
          >
            <Plus className="h-3 w-3 mr-1.5" />
            Deposit {balanceCurrency} to Trading
            <ArrowRight className="h-3 w-3 ml-1.5" />
          </Button>
        </div>
      )}

      {/* Insufficient Balance Warning */}
      {hasInsufficientBalance && !hasZeroBalance && (
        <div className="flex items-center gap-2 text-destructive text-[10px] sm:text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Insufficient {balanceCurrency} (need {requiredAmount.toFixed(4)} inc. fee)</span>
        </div>
      )}

      {/* Order Type Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between bg-[#0B0F1C]/50 border border-[#1F2937]/40 rounded-xl px-3 py-2.5 text-xs sm:text-sm hover:bg-white/[0.03]">
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
        <>
          <PriceStepperInput
            label={`Price (${quoteCurrency})`}
            value={price}
            onChange={setPrice}
            step={tickSize}
            min={0}
          />
        </>
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
      <div className="bg-[#0B0F1C]/50 border border-[#1F2937]/40 rounded-xl px-3 py-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] sm:text-xs text-muted-foreground">Total ({quoteCurrency})</label>
          <span className="font-mono text-foreground text-sm sm:text-base font-medium">
            {total.toFixed(total >= 1 ? 2 : 6)}
          </span>
        </div>
      </div>

      {/* Order Summary */}
      {numAmount > 0 && (
        <div className="bg-[#0B0F1C]/40 border border-[#1F2937]/40 rounded-xl px-3 py-2.5 space-y-1.5">
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
          "w-full h-12 text-sm sm:text-base font-semibold rounded-xl",
          hasInsufficientBalance
            ? "bg-[#1F2937] text-[#64748B]"
            : isBuy
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_4px_16px_rgba(52,211,153,0.25)] hover:shadow-[0_4px_20px_rgba(52,211,153,0.4)]"
              : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_4px_16px_rgba(248,113,113,0.25)] hover:shadow-[0_4px_20px_rgba(248,113,113,0.4)]"
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
