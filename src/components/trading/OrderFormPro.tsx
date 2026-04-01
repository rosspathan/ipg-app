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

/* ─── Compact Stepper Input for mobile split ─── */
const StepperInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  suffix?: string;
  compact?: boolean;
  tag?: { label: string; value: number; color: 'green' | 'red' };
}> = ({ label, value, onChange, step, min = 0, max, placeholder = '0.00', suffix, compact, tag }) => {
  const numVal = parseFloat(value) || 0;
  const effectiveStep = step ?? getSmartStep(numVal);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const adjust = (dir: 1 | -1) => {
    let next = numVal + effectiveStep * dir;
    if (dir === -1) next = Math.max(min, next);
    if (dir === 1 && max !== undefined) next = Math.min(max, next);
    onChange(formatNum(next));
  };

  const startLongPress = (dir: 1 | -1) => {
    adjust(dir);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => adjust(dir), 80);
    }, 400);
  };

  const stopLongPress = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  useEffect(() => () => stopLongPress(), []);

  const h = compact ? 'h-[38px]' : 'h-[44px]';
  const btnW = compact ? 'w-[30px]' : 'w-[38px]';
  const fontSize = compact ? 'text-[13px]' : 'text-[15px]';

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[8px] font-bold px-1.5 py-0.5 rounded-md transition-all",
              tag.color === 'red' ? "text-[#FF4D4F] bg-[#FF4D4F]/10 active:bg-[#FF4D4F]/20" : "text-[#00E676] bg-[#00E676]/10 active:bg-[#00E676]/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className={cn("flex items-center bg-[#060D18] border border-[hsl(230,20%,22%)]/50 rounded-lg overflow-hidden focus-within:border-[hsl(186,100%,50%)]/40 transition-all", h)}>
        <button
          type="button"
          onMouseDown={() => startLongPress(-1)}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={() => startLongPress(-1)}
          onTouchEnd={stopLongPress}
          disabled={numVal <= min}
          className={cn(btnW, "flex-shrink-0 h-full flex items-center justify-center text-[#C7D2E0] text-sm font-bold active:bg-[hsl(230,20%,14%)] active:text-[#FFFFFF] disabled:opacity-20 border-r border-[hsl(230,20%,18%)]/40 select-none touch-manipulation transition-colors")}
        >−</button>
        <div className="flex-1 min-w-0 flex items-center gap-0.5 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn("w-full min-w-[30px] bg-transparent text-left px-1.5 font-mono font-bold text-[#FFFFFF] outline-none tabular-nums placeholder:text-[#6B7280]/40", fontSize)}
              style={{ textOverflow: 'clip' }}
            />
          </div>
          {suffix && <span className="text-[8px] text-[#94A3B8] font-bold flex-shrink-0 pr-1 uppercase">{suffix}</span>}
        </div>
        <button
          type="button"
          onMouseDown={() => startLongPress(1)}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={() => startLongPress(1)}
          onTouchEnd={stopLongPress}
          disabled={max !== undefined && numVal >= max}
          className={cn(btnW, "flex-shrink-0 h-full flex items-center justify-center text-[#C7D2E0] text-sm font-bold active:bg-[hsl(230,20%,14%)] active:text-[#FFFFFF] disabled:opacity-20 border-l border-[hsl(230,20%,18%)]/40 select-none touch-manipulation transition-colors")}
        >+</button>
      </div>
    </div>
  );
};

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency, quoteCurrency, availableBase, availableQuote, currentPrice, lastTradePrice,
  tickSize = 0.00000001, lotSize = 0.0001, onPlaceOrder, isPlacingOrder = false,
  bestBid = 0, bestAsk = 0, selectedPrice, compact = false, asks = [], bids = [],
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
  const gap = compact ? 'gap-2.5' : 'gap-3.5';

  return (
    <div className={cn("flex flex-col h-full", gap)}>
      {/* ── Buy / Sell Toggle ── */}
      <div className={cn("flex rounded-xl overflow-hidden bg-[#060D18] p-[2px]", compact ? "h-[36px]" : "h-[42px]")}>
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[10px] font-bold uppercase tracking-wider transition-all duration-200",
            compact ? "text-[11px]" : "text-[13px]",
            isBuy
              ? "bg-[#00E676] text-[#020617] shadow-[0_2px_12px_rgba(0,230,118,0.35)]"
              : "text-[#94A3B8] hover:text-[#C7D2E0]"
          )}
        >Buy</button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[10px] font-bold uppercase tracking-wider transition-all duration-200",
            compact ? "text-[11px]" : "text-[13px]",
            !isBuy
              ? "bg-[#FF4D4F] text-[#FFFFFF] shadow-[0_2px_12px_rgba(255,77,79,0.35)]"
              : "text-[#94A3B8] hover:text-[#C7D2E0]"
          )}
        >Sell</button>
      </div>

      {/* ── Order Type Tabs ── */}
      <div className="flex items-center gap-0.5 bg-[#060D18] rounded-lg p-[2px]">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "flex-1 font-bold capitalize rounded-md transition-all",
              compact ? "text-[10px] py-1.5" : "text-[12px] py-2",
              orderType === t
                ? "bg-[hsl(230,25%,18%)] text-[#FFFFFF] shadow-sm"
                : "text-[#94A3B8] hover:text-[#C7D2E0]"
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
          compact={compact}
          tag={isBuy
            ? { label: 'BBO', value: bestAsk, color: 'red' }
            : { label: 'BBO', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* Market price display */}
      {orderType === 'market' && (
        <div className={cn("flex items-center justify-between px-2.5 bg-[#060D18] border border-[hsl(230,20%,22%)]/40 rounded-lg", compact ? "h-[36px]" : "h-[42px]")}>
          <span className="text-[9px] text-[#94A3B8] uppercase tracking-wider font-semibold">Mkt</span>
          <span className={cn("font-bold font-mono tabular-nums text-[#FFFFFF]", compact ? "text-[12px]" : "text-[14px]")}>{referencePrice >= 1 ? referencePrice.toFixed(2) : referencePrice.toFixed(6)}</span>
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
        compact={compact}
      />

      {/* ── Percentage Chips ── */}
      <div className="grid grid-cols-4 gap-1">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "font-bold rounded-md transition-all border",
              compact ? "h-[26px] text-[9px]" : "h-[32px] text-[11px]",
              activePercent === pct
                ? isBuy
                  ? "bg-[#00E676]/12 text-[#00E676] border-[#00E676]/25"
                  : "bg-[#FF4D4F]/12 text-[#FF4D4F] border-[#FF4D4F]/25"
                : "bg-[#060D18] text-[#C7D2E0] border-[hsl(230,20%,18%)]/40 active:bg-[hsl(230,20%,16%)]"
            )}
          >{pct}%</button>
        ))}
      </div>

      {/* ── Total ── */}
      <div className={cn("flex items-center justify-between px-2 bg-[#060D18]/60 border border-[hsl(230,20%,20%)]/30 rounded-md", compact ? "h-[30px]" : "h-[36px]")}>
        <span className={cn("text-[#94A3B8] font-semibold", compact ? "text-[9px]" : "text-[11px]")}>Total</span>
        <span className={cn("font-mono font-bold text-[#FFFFFF] tabular-nums", compact ? "text-[11px]" : "text-[13px]")}>
          {total > 0 ? `${total >= 1 ? total.toFixed(2) : total.toFixed(4)} ${quoteCurrency}` : '—'}
        </span>
      </div>

      {/* Slippage preview — only in non-compact or if significant */}
      {slippage && numAmount > 0 && slippage.slippagePct > 0.1 && (
        <div className={cn(
          "px-2 py-1.5 rounded-md text-[9px] space-y-0.5 border",
          slippage.slippagePct > 3 ? "bg-[#FF4D4F]/5 border-[#FF4D4F]/15 text-[#FF4D4F]" :
          slippage.slippagePct > 0.5 ? "bg-warning/5 border-warning/15 text-warning" :
          "bg-[hsl(230,30%,8%)]/60 border-[hsl(230,20%,18%)]/20 text-[#94A3B8]"
        )}>
          <div className="flex justify-between"><span>Slip</span><span className="font-mono tabular-nums font-semibold">{slippage.slippagePct.toFixed(2)}%</span></div>
          {slippage.fillable < numAmount && (
            <div className="flex items-center gap-1 text-[#FF4D4F]">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Partial fill</span>
            </div>
          )}
        </div>
      )}

      {/* ── Balance + Fee ── */}
      <div className={cn("flex flex-col gap-1 px-0.5", compact ? "text-[9px]" : "text-[11px]")}>
        <div className="flex justify-between">
          <span className="text-[#94A3B8] font-medium">Avail</span>
          <span className={cn("font-mono tabular-nums font-semibold", hasInsufficientBalance ? "text-[#FF4D4F]" : "text-[#C7D2E0]")}>
            {availableBalance.toFixed(compact ? 2 : 4)} {balanceCurrency}
          </span>
        </div>
        {!compact && (
          <div className="flex justify-between">
            <span className="text-[#94A3B8] font-medium">Est Fee</span>
            <span className="font-mono tabular-nums text-[#C7D2E0] font-medium">
              {total > 0 ? `~${estFee.toFixed(4)}` : '—'} {quoteCurrency}
            </span>
          </div>
        )}
      </div>

      {hasInsufficientBalance && (
        <div className={cn("text-[#FF4D4F] text-center bg-[#FF4D4F]/8 rounded-md font-bold", compact ? "text-[9px] py-1" : "text-[10px] py-1.5")}>
          Insufficient {balanceCurrency}
        </div>
      )}

      {/* ── CTA Button ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full rounded-xl font-bold tracking-wider transition-all duration-200 active:scale-[0.98] mt-auto",
          "disabled:cursor-not-allowed uppercase",
          compact ? "h-[38px] text-[11px]" : "h-[44px] text-[13px]",
          hasInsufficientBalance ? "bg-[hsl(230,20%,12%)] text-[#6B7280]" :
          numAmount <= 0 ? "bg-[hsl(230,20%,12%)] text-[#6B7280]/40" :
          isBuy
            ? "bg-[#00E676] text-[#020617] shadow-[0_4px_20px_rgba(0,230,118,0.35)]"
            : "bg-[#FF4D4F] text-[#FFFFFF] shadow-[0_4px_20px_rgba(255,77,79,0.35)]"
        )}
      >
        {isPlacingOrder ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
      </button>
    </div>
  );
};