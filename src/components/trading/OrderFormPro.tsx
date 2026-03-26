import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
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

/* ─── Stepper Input ─── */
const StepperInput: React.FC<{
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
  const inputRef = useRef<HTMLInputElement>(null);

  const adjust = (dir: 1 | -1) => {
    let next = numVal + effectiveStep * dir;
    if (dir === -1) next = Math.max(min, next);
    if (dir === 1 && max !== undefined) next = Math.min(max, next);
    onChange(formatNum(next));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium text-muted-foreground/70 uppercase tracking-wider">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded transition-all",
              tag.color === 'red' ? "text-danger bg-danger/8 active:bg-danger/15" : "text-success bg-success/8 active:bg-success/15"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className="flex items-center h-[38px] bg-card border border-border/30 rounded-lg overflow-hidden focus-within:border-accent/30 transition-colors">
        <button
          type="button" onClick={() => adjust(-1)} disabled={numVal <= min}
          className="w-9 h-full flex items-center justify-center text-muted-foreground text-sm font-medium active:bg-muted/60 disabled:opacity-20 border-r border-border/20 select-none touch-manipulation"
        >−</button>
        <div className="flex-1 min-w-0 flex items-center px-2 overflow-hidden">
          <input
            ref={inputRef}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent text-center text-[13px] font-mono font-semibold text-foreground outline-none tabular-nums placeholder:text-muted-foreground/20 overflow-x-auto"
            style={{ textOverflow: 'clip' }}
          />
          {suffix && <span className="text-[9px] text-muted-foreground/50 font-semibold ml-1 flex-shrink-0">{suffix}</span>}
        </div>
        <button
          type="button" onClick={() => adjust(1)} disabled={max !== undefined && numVal >= max}
          className="w-9 h-full flex items-center justify-center text-muted-foreground text-sm font-medium active:bg-muted/60 disabled:opacity-20 border-l border-border/20 select-none touch-manipulation"
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
    <div className="flex flex-col gap-2.5 h-full">
      {/* ── Buy / Sell Toggle ── */}
      <div className="flex h-[34px] rounded-lg overflow-hidden bg-muted/20 p-[2px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all duration-200",
            isBuy
              ? "bg-success text-success-foreground shadow-[0_2px_8px_hsl(var(--success)/0.25)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >Buy</button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-md text-[11px] font-bold uppercase tracking-wide transition-all duration-200",
            !isBuy
              ? "bg-danger text-danger-foreground shadow-[0_2px_8px_hsl(var(--danger)/0.25)]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >Sell</button>
      </div>

      {/* ── Order Type Tabs ── */}
      <div className="flex items-center gap-4 px-0.5">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[10px] font-semibold capitalize pb-1 border-b-2 transition-colors",
              orderType === t
                ? "text-foreground border-accent"
                : "text-muted-foreground/50 border-transparent hover:text-muted-foreground"
            )}
          >{t}</button>
        ))}
      </div>

      {/* ── Price Input ── */}
      {orderType !== 'market' && (
        <StepperInput
          label="Price"
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
          suffix={quoteCurrency}
          tag={isBuy
            ? { label: 'Best Ask', value: bestAsk, color: 'red' }
            : { label: 'Best Bid', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* Market price display */}
      {orderType === 'market' && (
        <div className="flex items-center justify-between h-[38px] px-3 bg-muted/10 border border-border/20 rounded-lg">
          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider font-medium">Market Price</span>
          <span className="text-[13px] font-bold font-mono tabular-nums text-foreground">{referencePrice >= 1 ? referencePrice.toFixed(2) : referencePrice.toFixed(6)}</span>
        </div>
      )}

      {/* ── Amount Input ── */}
      <StepperInput
        label="Amount"
        value={amount}
        onChange={(v) => { setAmount(v); setActivePercent(null); }}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
        suffix={baseCurrency}
      />

      {/* ── Percentage Chips ── */}
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "h-[26px] text-[9px] font-bold rounded-md transition-all border",
              activePercent === pct
                ? isBuy
                  ? "bg-success/10 text-success border-success/25"
                  : "bg-danger/10 text-danger border-danger/25"
                : "bg-muted/20 text-muted-foreground/60 border-border/20 hover:bg-muted/40 active:bg-muted/60"
            )}
          >{pct}%</button>
        ))}
      </div>

      {/* ── Total ── */}
      <div className="flex items-center justify-between h-[30px] px-2.5 bg-muted/10 border border-border/20 rounded-lg">
        <span className="text-[9px] text-muted-foreground/60 font-medium">Total</span>
        <span className="text-[11px] font-mono font-semibold text-foreground tabular-nums">
          {total > 0 ? `${total >= 1 ? total.toFixed(2) : total.toFixed(6)} ${quoteCurrency}` : '—'}
        </span>
      </div>

      {/* Slippage preview */}
      {slippage && numAmount > 0 && (
        <div className={cn(
          "px-2.5 py-1.5 rounded-lg text-[9px] space-y-0.5 border",
          slippage.slippagePct > 3 ? "bg-danger/5 border-danger/15 text-danger" :
          slippage.slippagePct > 0.5 ? "bg-warning/5 border-warning/15 text-warning" :
          "bg-muted/10 border-border/20 text-muted-foreground"
        )}>
          <div className="flex justify-between"><span>Avg fill</span><span className="font-mono tabular-nums">{slippage.avgPrice >= 1 ? slippage.avgPrice.toFixed(2) : slippage.avgPrice.toFixed(6)}</span></div>
          <div className="flex justify-between"><span>Slippage</span><span className="font-mono tabular-nums">{slippage.slippagePct.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span>Levels</span><span className="font-mono tabular-nums">{slippage.levelsConsumed}</span></div>
          {slippage.fillable < numAmount && (
            <div className="flex items-center gap-1 text-danger pt-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Only {slippage.fillable.toFixed(4)} fillable</span>
            </div>
          )}
        </div>
      )}

      {/* ── Balance + Fee ── */}
      <div className="flex flex-col gap-1 text-[9px] px-0.5">
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
        <div className="text-[9px] text-danger text-center bg-danger/5 rounded-md py-1 font-medium">
          Insufficient {balanceCurrency}
        </div>
      )}

      {/* ── CTA Button ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[40px] rounded-xl text-[12px] font-bold tracking-wide transition-all duration-200 active:scale-[0.98] mt-auto",
          "disabled:cursor-not-allowed",
          hasInsufficientBalance ? "bg-muted text-muted-foreground" :
          numAmount <= 0 ? "bg-muted/30 text-muted-foreground/30" :
          isBuy
            ? "bg-success text-success-foreground shadow-[0_4px_16px_hsl(var(--success)/0.3)]"
            : "bg-danger text-danger-foreground shadow-[0_4px_16px_hsl(var(--danger)/0.3)]"
        )}
      >
        {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
      </button>
    </div>
  );
};
