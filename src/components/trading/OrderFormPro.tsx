import React, { useState, useMemo, useEffect } from 'react';
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
  /** Order book asks for slippage estimation */
  asks?: { price: number; quantity: number }[];
  /** Order book bids for slippage estimation */
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

/* ── Slippage calculator ── */
const estimateSlippage = (
  side: 'buy' | 'sell',
  amount: number,
  asks: { price: number; quantity: number }[],
  bids: { price: number; quantity: number }[],
  currentPrice: number
): { avgPrice: number; slippagePct: number; levelsConsumed: number } => {
  if (amount <= 0 || currentPrice <= 0) return { avgPrice: 0, slippagePct: 0, levelsConsumed: 0 };

  const book = side === 'buy'
    ? [...asks].sort((a, b) => a.price - b.price)
    : [...bids].sort((a, b) => b.price - a.price);

  let remaining = amount;
  let totalCost = 0;
  let levels = 0;

  for (const level of book) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, level.quantity);
    totalCost += fill * level.price;
    remaining -= fill;
    levels++;
  }

  if (remaining > 0) {
    // Not enough liquidity
    totalCost += remaining * currentPrice;
  }

  const avgPrice = amount > 0 ? totalCost / amount : currentPrice;
  const slippagePct = currentPrice > 0 ? Math.abs((avgPrice - currentPrice) / currentPrice) * 100 : 0;

  return { avgPrice, slippagePct, levelsConsumed: levels };
};

/* ── Compact Input ── */
const CompactInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  tag?: { label: string; value: number; color: 'green' | 'red' };
}> = ({ label, value, onChange, step, min = 0, max, placeholder = '0.00', tag }) => {
  const numVal = parseFloat(value) || 0;
  const effectiveStep = step ?? getSmartStep(numVal);

  const adjust = (dir: 1 | -1) => {
    let next = numVal + effectiveStep * dir;
    if (dir === -1) next = Math.max(min, next);
    if (dir === 1 && max !== undefined) next = Math.min(max, next);
    onChange(formatNum(next));
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium text-muted-foreground select-none">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[8px] font-bold px-1.5 py-[1px] rounded transition-all",
              tag.color === 'red'
                ? "text-danger bg-danger/10 active:bg-danger/20"
                : "text-success bg-success/10 active:bg-success/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className={cn(
        "bg-background border border-border/60 rounded-lg h-[38px] flex items-center",
        "transition-all duration-150",
        "focus-within:border-accent/30"
      )}>
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={numVal <= min}
          className="w-8 h-full flex items-center justify-center text-muted-foreground text-sm active:bg-muted disabled:opacity-20 select-none rounded-l-lg border-r border-border/40"
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-center px-2 text-[13px] font-mono font-semibold text-foreground outline-none tracking-tight placeholder:text-muted-foreground/30 overflow-hidden whitespace-nowrap"
          style={{ textOverflow: 'ellipsis' }}
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={max !== undefined && numVal >= max}
          className="w-8 h-full flex items-center justify-center text-muted-foreground text-sm active:bg-muted disabled:opacity-20 select-none rounded-r-lg border-l border-border/40"
        >
          +
        </button>
      </div>
    </div>
  );
};

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency,
  quoteCurrency,
  availableBase,
  availableQuote,
  currentPrice,
  tickSize = 0.00000001,
  lotSize = 0.0001,
  onPlaceOrder,
  isPlacingOrder = false,
  bestBid = 0,
  bestAsk = 0,
  selectedPrice,
  asks = [],
  bids = [],
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
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

  const total = useMemo(() => {
    if (orderType === 'market') return numAmount * currentPrice;
    return numAmount * numPrice;
  }, [numAmount, numPrice, currentPrice, orderType]);

  const maxBuyAmount = useMemo(() => {
    const effectivePrice = orderType === 'market' ? currentPrice : numPrice;
    if (isBuy && effectivePrice > 0) return availableQuote / effectivePrice;
    return availableBase;
  }, [isBuy, availableQuote, availableBase, numPrice, currentPrice, orderType]);

  const requiredAmount = isBuy ? total * 1.005 : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;

  // Slippage estimation for market orders
  const slippage = useMemo(() => {
    if (orderType !== 'market' || numAmount <= 0) return null;
    return estimateSlippage(side, numAmount, asks, bids, currentPrice);
  }, [orderType, numAmount, side, asks, bids, currentPrice]);

  const handleQuickPercent = (pct: number) => {
    setActivePercent(pct);
    const effectivePrice = orderType === 'market' ? currentPrice : numPrice;
    if (isBuy && effectivePrice > 0) {
      const maxBuy = (availableQuote * (pct / 100)) / effectivePrice;
      setAmount(maxBuy.toFixed(6));
    } else if (!isBuy) {
      const maxSell = availableBase * (pct / 100);
      setAmount(maxSell.toFixed(6));
    }
  };

  const handleSubmit = () => {
    if (numAmount <= 0) return;
    if (hasInsufficientBalance) {
      toast.error('Insufficient balance', {
        description: `Need ${requiredAmount.toFixed(4)} ${balanceCurrency}, have ${availableBalance.toFixed(4)}`,
      });
      return;
    }
    onPlaceOrder({
      side,
      type: orderType,
      price: orderType === 'market' ? undefined : numPrice,
      quantity: numAmount,
    });
    setAmount('');
    setActivePercent(null);
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    setActivePercent(null);
  };

  const estFee = total * 0.005;

  return (
    <div className="flex flex-col gap-2.5 h-full">
      {/* ── Buy / Sell Toggle ── */}
      <div className="flex h-[34px] bg-muted/40 rounded-lg overflow-hidden">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150",
            isBuy
              ? "bg-success text-success-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground/70"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 text-[11px] font-bold uppercase tracking-wider transition-all duration-150",
            !isBuy
              ? "bg-danger text-danger-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground/70"
          )}
        >
          Sell
        </button>
      </div>

      {/* ── Order Type ── */}
      <div className="flex items-center gap-4 h-[24px] px-0.5 border-b border-border/40">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[10px] font-semibold capitalize transition-all pb-1.5",
              orderType === t
                ? "text-foreground border-b-2 border-accent -mb-[1px]"
                : "text-muted-foreground hover:text-foreground/70"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Price Input ── */}
      {orderType !== 'market' && (
        <CompactInput
          label={`Price (${quoteCurrency})`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
          placeholder="0.00"
          tag={isBuy
            ? { label: 'BBO', value: bestAsk, color: 'red' }
            : { label: 'BBO', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* ── Amount Input ── */}
      <CompactInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
        placeholder="0.00000000"
      />

      {/* ── Quick Percent Buttons ── */}
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "h-[22px] text-[9px] font-bold rounded transition-all",
              activePercent === pct
                ? isBuy ? "bg-success/20 text-success" : "bg-danger/20 text-danger"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            )}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* ── Total ── */}
      <div className="bg-muted/20 border border-border/40 rounded-lg h-[28px] flex items-center justify-between px-3">
        <span className="text-[9px] text-muted-foreground font-medium">Total ({quoteCurrency})</span>
        <span className="text-[11px] font-mono font-bold text-foreground">
          {total > 0 ? total.toFixed(total >= 1 ? 2 : 6) : '--'}
        </span>
      </div>

      {/* ── Slippage Warning (Market Orders) ── */}
      {slippage && slippage.slippagePct > 0.5 && (
        <div className={cn(
          "flex items-start gap-1.5 p-2 rounded-lg text-[9px]",
          slippage.slippagePct > 3
            ? "bg-danger/10 text-danger border border-danger/20"
            : "bg-warning/10 text-warning border border-warning/20"
        )}>
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <div className="font-bold">
              Est. slippage: {slippage.slippagePct.toFixed(2)}%
            </div>
            <div className="text-muted-foreground">
              Avg fill ~{slippage.avgPrice >= 1 ? slippage.avgPrice.toFixed(2) : slippage.avgPrice.toFixed(6)} • {slippage.levelsConsumed} level{slippage.levelsConsumed !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* ── Info rows ── */}
      <div className="flex flex-col gap-0.5 text-[9px]">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Avail</span>
          <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-danger" : "text-foreground")}>
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fee</span>
          <span className="font-mono tabular-nums text-foreground">
            {total > 0 ? `~${estFee.toFixed(4)}` : '—'} {quoteCurrency}
          </span>
        </div>
      </div>

      {/* ── Insufficient warning ── */}
      {hasInsufficientBalance && (
        <div className="text-[9px] text-danger text-center bg-danger/5 rounded-lg py-1">
          ⚠ Insufficient {balanceCurrency}
        </div>
      )}

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[36px] rounded-lg text-[12px] font-bold tracking-wide transition-all duration-150 active:scale-[0.98] mt-auto",
          "disabled:cursor-not-allowed",
          hasInsufficientBalance
            ? "bg-muted text-muted-foreground"
            : numAmount <= 0
              ? "bg-muted text-muted-foreground/50"
              : isBuy
                ? "bg-success text-success-foreground shadow-[0_2px_12px_hsl(var(--success)/0.2)]"
                : "bg-danger text-danger-foreground shadow-[0_2px_12px_hsl(var(--danger)/0.2)]"
        )}
      >
        {isPlacingOrder ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </button>
    </div>
  );
};
