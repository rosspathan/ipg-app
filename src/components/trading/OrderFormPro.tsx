import React, { useState, useMemo, useEffect } from 'react';
import { Loader2, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  lastTradePrice?: number;
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
  selectedPrice?: number | null;
  compact?: boolean;
  asks?: { price: number; quantity: number }[];
  bids?: { price: number; quantity: number }[];
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market';

const formatNum = (num: number, maxDec = 8): string => {
  const fixed = num.toFixed(maxDec);
  return fixed.replace(/\.?0+$/, '') || '0';
};

const getSmartStep = (value: number): number => {
  if (value >= 10000) return 10;
  if (value >= 1000) return 1;
  if (value >= 100) return 0.1;
  if (value >= 10) return 0.01;
  if (value >= 1) return 0.001;
  if (value >= 0.1) return 0.0001;
  return 0.00001;
};

const estimateSlippage = (
  side: 'buy' | 'sell', amount: number,
  asks: { price: number; quantity: number }[],
  bids: { price: number; quantity: number }[],
  currentPrice: number
) => {
  if (amount <= 0 || currentPrice <= 0) return { avgPrice: 0, slippagePct: 0, levelsConsumed: 0, fillable: 0 };
  const book = side === 'buy'
    ? [...asks].sort((a, b) => a.price - b.price)
    : [...bids].sort((a, b) => b.price - a.price);
  let remaining = amount;
  let totalCost = 0;
  let levels = 0;
  let filled = 0;
  for (const level of book) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, level.quantity);
    totalCost += fill * level.price;
    remaining -= fill;
    filled += fill;
    levels++;
  }
  const avgPrice = filled > 0 ? totalCost / filled : currentPrice;
  const slippagePct = currentPrice > 0 ? Math.abs((avgPrice - currentPrice) / currentPrice) * 100 : 0;
  return { avgPrice, slippagePct, levelsConsumed: levels, fillable: filled };
};

const CompactInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
  tag?: { label: string; value: number; color: 'green' | 'red' };
}> = ({ label, value, onChange, step, min = 0, max, placeholder = '0.00', suffix, tag }) => {
  const numVal = parseFloat(value) || 0;
  const effectiveStep = step ?? getSmartStep(numVal);
  const adjust = (dir: 1 | -1) => {
    let next = numVal + effectiveStep * dir;
    if (dir === -1) next = Math.max(min, next);
    if (dir === 1 && max !== undefined) next = Math.min(max, next);
    onChange(formatNum(next));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-[2px]">
        <span className="text-[8px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[7px] font-bold px-1.5 py-[1px] rounded-sm transition-all",
              tag.color === 'red' ? "text-danger bg-danger/8 active:bg-danger/15" : "text-success bg-success/8 active:bg-success/15"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className="bg-background border border-border/40 rounded-md h-[34px] flex items-center focus-within:border-accent/20 transition-colors">
        <button
          type="button" onClick={() => adjust(-1)} disabled={numVal <= min}
          className="w-7 h-full flex items-center justify-center text-muted-foreground/60 text-xs active:bg-muted/50 disabled:opacity-15 rounded-l-md border-r border-border/30"
        >−</button>
        <div className="flex-1 min-w-0 flex items-center">
          <input
            type="text" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-center px-1 text-[12px] font-mono font-semibold text-foreground outline-none tabular-nums placeholder:text-muted-foreground/20"
          />
          {suffix && <span className="text-[8px] text-muted-foreground/50 pr-1 font-medium">{suffix}</span>}
        </div>
        <button
          type="button" onClick={() => adjust(1)} disabled={max !== undefined && numVal >= max}
          className="w-7 h-full flex items-center justify-center text-muted-foreground/60 text-xs active:bg-muted/50 disabled:opacity-15 rounded-r-md border-l border-border/30"
        >+</button>
      </div>
    </div>
  );
};

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency, quoteCurrency, availableBase, availableQuote, currentPrice, lastTradePrice,
  tickSize = 0.00000001, lotSize = 0.0001, onPlaceOrder, isPlacingOrder = false,
  bestBid = 0, bestAsk = 0, selectedPrice, asks = [], bids = [],
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice >= 1 ? currentPrice.toFixed(2) : currentPrice.toFixed(6));
  const [amount, setAmount] = useState('');
  const [activePercent, setActivePercent] = useState<number | null>(null);

  useEffect(() => {
    if (selectedPrice != null && selectedPrice > 0) {
      setPrice(selectedPrice >= 1 ? selectedPrice.toFixed(2) : selectedPrice.toFixed(6));
      if (orderType === 'market') setOrderType('limit');
    }
  }, [selectedPrice]);

  const isBuy = side === 'buy';
  const availableBalance = isBuy ? availableQuote : availableBase;
  const balanceCurrency = isBuy ? quoteCurrency : baseCurrency;
  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;
  const referencePrice = lastTradePrice || currentPrice;

  const total = useMemo(() => {
    if (orderType === 'market') return numAmount * referencePrice;
    return numAmount * numPrice;
  }, [numAmount, numPrice, referencePrice, orderType]);

  const maxBuyAmount = useMemo(() => {
    const ep = orderType === 'market' ? referencePrice : numPrice;
    if (isBuy && ep > 0) return availableQuote / ep;
    return availableBase;
  }, [isBuy, availableQuote, availableBase, numPrice, referencePrice, orderType]);

  const requiredAmount = isBuy ? total * 1.005 : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;

  const slippage = useMemo(() => {
    if (orderType !== 'market' || numAmount <= 0) return null;
    return estimateSlippage(side, numAmount, asks, bids, referencePrice);
  }, [orderType, numAmount, side, asks, bids, referencePrice]);

  const handleQuickPercent = (pct: number) => {
    setActivePercent(pct);
    const ep = orderType === 'market' ? referencePrice : numPrice;
    if (isBuy && ep > 0) {
      setAmount(((availableQuote * (pct / 100)) / ep).toFixed(6));
    } else if (!isBuy) {
      setAmount((availableBase * (pct / 100)).toFixed(6));
    }
  };

  const handleSubmit = () => {
    if (numAmount <= 0) return;
    if (hasInsufficientBalance) {
      toast.error('Insufficient balance');
      return;
    }
    onPlaceOrder({ side, type: orderType, price: orderType === 'market' ? undefined : numPrice, quantity: numAmount });
    setAmount('');
    setActivePercent(null);
  };

  const estFee = total * 0.005;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Buy/Sell */}
      <div className="flex h-[30px] bg-muted/30 rounded-md overflow-hidden">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 text-[10px] font-bold uppercase tracking-wider transition-all",
            isBuy ? "bg-success text-success-foreground" : "text-muted-foreground"
          )}
        >Buy</button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 text-[10px] font-bold uppercase tracking-wider transition-all",
            !isBuy ? "bg-danger text-danger-foreground" : "text-muted-foreground"
          )}
        >Sell</button>
      </div>

      {/* Order Type */}
      <div className="flex items-center gap-3 h-[20px] px-0.5 border-b border-border/30">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[9px] font-semibold capitalize pb-1",
              orderType === t ? "text-foreground border-b border-accent" : "text-muted-foreground/60"
            )}
          >{t}</button>
        ))}
      </div>

      {/* Price */}
      {orderType !== 'market' && (
        <CompactInput
          label="Price" value={price} onChange={setPrice} step={tickSize} min={0}
          suffix={quoteCurrency}
          tag={isBuy ? { label: 'Best Ask', value: bestAsk, color: 'red' } : { label: 'Best Bid', value: bestBid, color: 'green' }}
        />
      )}

      {/* Amount */}
      <CompactInput
        label="Amount" value={amount} onChange={(v) => { setAmount(v); setActivePercent(null); }}
        step={lotSize} min={0} max={!isBuy ? availableBase : undefined}
        suffix={baseCurrency}
      />

      {/* Quick % */}
      <div className="grid grid-cols-4 gap-[3px]">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "h-[20px] text-[8px] font-bold rounded-sm transition-all",
              activePercent === pct
                ? isBuy ? "bg-success/15 text-success border border-success/20" : "bg-danger/15 text-danger border border-danger/20"
                : "bg-muted/30 text-muted-foreground/60 border border-transparent hover:bg-muted/50"
            )}
          >{pct}%</button>
        ))}
      </div>

      {/* Total */}
      <div className="bg-muted/10 border border-border/30 rounded-md h-[24px] flex items-center justify-between px-2">
        <span className="text-[8px] text-muted-foreground/60">Total</span>
        <span className="text-[10px] font-mono font-semibold text-foreground tabular-nums">
          {total > 0 ? `${total >= 1 ? total.toFixed(2) : total.toFixed(6)} ${quoteCurrency}` : '—'}
        </span>
      </div>

      {/* Execution preview for market orders */}
      {slippage && numAmount > 0 && (
        <div className={cn(
          "p-1.5 rounded-md text-[8px] space-y-[2px] border",
          slippage.slippagePct > 3 ? "bg-danger/5 border-danger/15 text-danger" :
          slippage.slippagePct > 0.5 ? "bg-warning/5 border-warning/15 text-warning" :
          "bg-muted/20 border-border/20 text-muted-foreground"
        )}>
          <div className="flex justify-between">
            <span>Avg fill</span>
            <span className="font-mono tabular-nums">{slippage.avgPrice >= 1 ? slippage.avgPrice.toFixed(2) : slippage.avgPrice.toFixed(6)}</span>
          </div>
          <div className="flex justify-between">
            <span>Slippage</span>
            <span className="font-mono tabular-nums">{slippage.slippagePct.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Levels</span>
            <span className="font-mono tabular-nums">{slippage.levelsConsumed}</span>
          </div>
          {slippage.fillable < numAmount && (
            <div className="flex items-center gap-1 text-danger pt-[2px]">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Only {slippage.fillable.toFixed(4)} fillable</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col gap-[2px] text-[8px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground/50">Avail</span>
          <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-danger" : "text-foreground/70")}>
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground/50">Est. Fee</span>
          <span className="font-mono tabular-nums text-foreground/50">
            {total > 0 ? `~${estFee.toFixed(4)}` : '—'} {quoteCurrency}
          </span>
        </div>
      </div>

      {hasInsufficientBalance && (
        <div className="text-[8px] text-danger text-center bg-danger/5 rounded py-0.5">
          Insufficient {balanceCurrency}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[34px] rounded-md text-[11px] font-bold tracking-wide transition-all active:scale-[0.98] mt-auto",
          "disabled:cursor-not-allowed",
          hasInsufficientBalance ? "bg-muted text-muted-foreground" :
          numAmount <= 0 ? "bg-muted/50 text-muted-foreground/30" :
          isBuy ? "bg-success text-success-foreground shadow-[0_1px_8px_hsl(var(--success)/0.15)]" :
                  "bg-danger text-danger-foreground shadow-[0_1px_8px_hsl(var(--danger)/0.15)]"
        )}
      >
        {isPlacingOrder ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
      </button>
    </div>
  );
};
