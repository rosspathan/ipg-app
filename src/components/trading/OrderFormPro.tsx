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

/* ─── Premium Stepper Input ─── */
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

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[9px] font-bold px-2 py-0.5 rounded-md transition-all",
              tag.color === 'red' ? "text-danger bg-danger/10 active:bg-danger/20" : "text-success bg-success/10 active:bg-success/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className="flex items-center h-[44px] bg-[#060D18] border border-[hsl(230,20%,22%)]/50 rounded-xl overflow-hidden focus-within:border-accent/40 focus-within:shadow-[0_0_0_1px_hsl(186,100%,50%,0.15)] transition-all">
        {/* Minus - compact 34px */}
        <button
          type="button"
          onMouseDown={() => startLongPress(-1)}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={() => startLongPress(-1)}
          onTouchEnd={stopLongPress}
          disabled={numVal <= min}
          className="w-[38px] flex-shrink-0 h-full flex items-center justify-center text-[#C7D2E0] text-base font-bold active:bg-[hsl(230,20%,14%)] active:text-[#FFFFFF] disabled:opacity-20 border-r border-[hsl(230,20%,18%)]/40 select-none touch-manipulation transition-colors"
        >−</button>
        {/* Value zone - maximum width, scrollable */}
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full min-w-[40px] bg-transparent text-left px-2 text-[15px] font-mono font-bold text-[#FFFFFF] outline-none tabular-nums placeholder:text-[#6B7280]/40"
              style={{ textOverflow: 'clip' }}
            />
          </div>
          {suffix && <span className="text-[9px] text-[#6B7280] font-bold flex-shrink-0 pr-1 uppercase">{suffix}</span>}
        </div>
        {/* Plus - compact 34px */}
        <button
          type="button"
          onMouseDown={() => startLongPress(1)}
          onMouseUp={stopLongPress}
          onMouseLeave={stopLongPress}
          onTouchStart={() => startLongPress(1)}
          onTouchEnd={stopLongPress}
          disabled={max !== undefined && numVal >= max}
          className="w-[34px] flex-shrink-0 h-full flex items-center justify-center text-[#B0B7C3] text-sm font-medium active:bg-[hsl(230,20%,14%)] active:text-[#FFFFFF] disabled:opacity-20 border-l border-[hsl(230,20%,18%)]/40 select-none touch-manipulation transition-colors"
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
    <div className="flex flex-col gap-3.5 h-full">
      {/* ── Buy / Sell Toggle ── */}
      <div className="flex h-[42px] rounded-xl overflow-hidden bg-[#060D18] p-[3px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[10px] text-[13px] font-bold uppercase tracking-wider transition-all duration-200",
            isBuy
              ? "bg-[#00E676] text-[#020617] shadow-[0_2px_12px_rgba(0,230,118,0.35)]"
              : "text-[#94A3B8] hover:text-[#C7D2E0]"
          )}
        >Buy</button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[10px] text-[13px] font-bold uppercase tracking-wider transition-all duration-200",
            !isBuy
              ? "bg-[#FF4D4F] text-[#FFFFFF] shadow-[0_2px_12px_rgba(255,77,79,0.35)]"
              : "text-[#94A3B8] hover:text-[#C7D2E0]"
          )}
        >Sell</button>
      </div>

      {/* ── Order Type Tabs ── */}
      <div className="flex items-center gap-1 bg-[#060D18] rounded-lg p-[3px]">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "flex-1 text-[12px] font-bold capitalize py-2 rounded-md transition-all",
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
          tag={isBuy
            ? { label: 'BBO Ask', value: bestAsk, color: 'red' }
            : { label: 'BBO Bid', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* Market price display */}
      {orderType === 'market' && (
        <div className="flex items-center justify-between h-[42px] px-3 bg-[#060D18] border border-[hsl(230,20%,22%)]/40 rounded-xl">
          <span className="text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Market</span>
          <span className="text-[14px] font-bold font-mono tabular-nums text-[#FFFFFF]">{referencePrice >= 1 ? referencePrice.toFixed(2) : referencePrice.toFixed(6)}</span>
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
      <div className="grid grid-cols-4 gap-1.5">
        {[25, 50, 75, 100].map((pct) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "h-[32px] text-[11px] font-bold rounded-lg transition-all border",
              activePercent === pct
                ? isBuy
                  ? "bg-[#00E676]/12 text-[#00E676] border-[#00E676]/25 shadow-[0_0_8px_rgba(0,230,118,0.15)]"
                  : "bg-[#FF4D4F]/12 text-[#FF4D4F] border-[#FF4D4F]/25 shadow-[0_0_8px_rgba(255,77,79,0.15)]"
                : "bg-[#060D18] text-[#C7D2E0] border-[hsl(230,20%,18%)]/40 hover:bg-[hsl(230,20%,13%)] active:bg-[hsl(230,20%,16%)]"
            )}
          >{pct}%</button>
        ))}
      </div>

      {/* ── Total ── */}
      <div className="flex items-center justify-between h-[32px] px-3 bg-[#060D18]/60 border border-[hsl(230,20%,20%)]/30 rounded-lg">
        <span className="text-[10px] text-[#6B7280] font-semibold">Total</span>
        <span className="text-[12px] font-mono font-bold text-[#FFFFFF] tabular-nums">
          {total > 0 ? `${total >= 1 ? total.toFixed(2) : total.toFixed(6)} ${quoteCurrency}` : '—'}
        </span>
      </div>

      {/* Slippage preview */}
      {slippage && numAmount > 0 && (
        <div className={cn(
          "px-3 py-2 rounded-lg text-[10px] space-y-1 border",
          slippage.slippagePct > 3 ? "bg-danger/5 border-danger/15 text-danger" :
          slippage.slippagePct > 0.5 ? "bg-warning/5 border-warning/15 text-warning" :
          "bg-[hsl(230,30%,8%)]/60 border-[hsl(230,20%,18%)]/20 text-muted-foreground"
        )}>
          <div className="flex justify-between"><span>Avg fill</span><span className="font-mono tabular-nums font-semibold">{slippage.avgPrice >= 1 ? slippage.avgPrice.toFixed(2) : slippage.avgPrice.toFixed(6)}</span></div>
          <div className="flex justify-between"><span>Slippage</span><span className="font-mono tabular-nums font-semibold">{slippage.slippagePct.toFixed(2)}%</span></div>
          <div className="flex justify-between"><span>Levels</span><span className="font-mono tabular-nums font-semibold">{slippage.levelsConsumed}</span></div>
          {slippage.fillable < numAmount && (
            <div className="flex items-center gap-1 text-danger pt-0.5">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>Only {slippage.fillable.toFixed(4)} fillable</span>
            </div>
          )}
        </div>
      )}

      {/* ── Balance + Fee ── */}
      <div className="flex flex-col gap-1 text-[10px] px-1">
        <div className="flex justify-between">
          <span className="text-[#6B7280] font-medium">Avail</span>
          <span className={cn("font-mono tabular-nums font-semibold", hasInsufficientBalance ? "text-[#FF4D4F]" : "text-[#B0B7C3]")}>
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B7280] font-medium">Est Fee</span>
          <span className="font-mono tabular-nums text-[#B0B7C3] font-medium">
            {total > 0 ? `~${estFee.toFixed(4)}` : '—'} {quoteCurrency}
          </span>
        </div>
      </div>

      {hasInsufficientBalance && (
        <div className="text-[10px] text-danger text-center bg-danger/8 rounded-lg py-1.5 font-bold">
          Insufficient {balanceCurrency}
        </div>
      )}

      {/* ── CTA Button ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[44px] rounded-xl text-[13px] font-bold tracking-wider transition-all duration-200 active:scale-[0.98] mt-auto",
          "disabled:cursor-not-allowed uppercase",
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
