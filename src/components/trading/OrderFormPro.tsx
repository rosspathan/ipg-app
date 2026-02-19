import React, { useState, useMemo, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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

/* ── Premium Exchange Input ── */
const PremiumInput: React.FC<{
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
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-medium text-muted-foreground select-none">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[9px] font-bold px-2 py-[2px] rounded-md transition-all duration-150",
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
        "bg-background border border-border rounded-[14px] h-[52px] flex items-center",
        "transition-all duration-200",
        "focus-within:border-accent/30 focus-within:shadow-[0_0_16px_hsl(var(--accent)/0.06)]",
        "hover:border-border/80"
      )}>
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={numVal <= min}
          className="w-12 h-full flex items-center justify-center text-muted-foreground text-[18px] font-light active:bg-muted active:text-foreground disabled:opacity-20 select-none flex-shrink-0 rounded-l-[14px] transition-colors border-r border-border/60"
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-center px-4 text-[16px] font-mono font-semibold text-foreground outline-none leading-none tracking-tight placeholder:text-muted-foreground/30 overflow-hidden whitespace-nowrap"
          style={{ textOverflow: 'ellipsis' }}
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={max !== undefined && numVal >= max}
          className="w-12 h-full flex items-center justify-center text-muted-foreground text-[18px] font-light active:bg-muted active:text-foreground disabled:opacity-20 select-none flex-shrink-0 rounded-r-[14px] transition-colors border-l border-border/60"
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
}) => {
  const navigate = useNavigate();
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
    <div className="flex flex-col gap-4">
      {/* ── Buy / Sell Toggle ── */}
      <div className="flex h-[40px] bg-muted rounded-lg overflow-hidden">
        <button
          onClick={() => setSide('buy')}
          className="flex-1 relative flex items-center justify-center"
        >
          <div className={cn(
            "absolute inset-0 transition-all duration-200",
            isBuy ? "bg-success" : "bg-transparent"
          )} />
          {isBuy && (
            <div className="absolute right-0 top-0 h-full w-[14px] translate-x-[7px] z-[1]">
              <svg viewBox="0 0 14 40" fill="none" className="h-full w-full" preserveAspectRatio="none">
                <path d="M0 0L14 20L0 40V0Z" className="fill-success" />
              </svg>
            </div>
          )}
          <span className={cn(
            "relative z-[2] text-[12px] font-bold tracking-wider uppercase transition-colors duration-200",
            isBuy ? "text-success-foreground" : "text-muted-foreground"
          )}>
            Buy
          </span>
        </button>
        <button
          onClick={() => setSide('sell')}
          className="flex-1 relative flex items-center justify-center"
        >
          <div className={cn(
            "absolute inset-0 transition-all duration-200",
            !isBuy ? "bg-danger" : "bg-transparent"
          )} />
          {!isBuy && (
            <div className="absolute left-0 top-0 h-full w-[14px] -translate-x-[7px] z-[1]">
              <svg viewBox="0 0 14 40" fill="none" className="h-full w-full" preserveAspectRatio="none">
                <path d="M14 0L0 20L14 40V0Z" className="fill-danger" />
              </svg>
            </div>
          )}
          <span className={cn(
            "relative z-[2] text-[12px] font-bold tracking-wider uppercase transition-colors duration-200",
            !isBuy ? "text-danger-foreground" : "text-muted-foreground"
          )}>
            Sell
          </span>
        </button>
      </div>

      {/* ── Order Type tabs ── */}
      <div className="flex items-center gap-6 h-[30px] px-1 border-b border-border/60">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[12px] font-semibold capitalize transition-all duration-200 pb-2",
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
        <PremiumInput
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
      <PremiumInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
        placeholder="0.00000000"
      />

      {/* ── Percentage Slider ── */}
      <div className="px-3 space-y-2">
        <div
          className="relative h-[28px] flex items-center cursor-pointer touch-none"
          onPointerDown={(e) => {
            const track = e.currentTarget;
            const rect = track.getBoundingClientRect();
            const trackW = rect.width;
            const calcPct = (clientX: number) => Math.round(Math.max(0, Math.min(100, ((clientX - rect.left) / trackW) * 100)));

            const pct = calcPct(e.clientX);
            if (pct === 0) { setActivePercent(null); setAmount(''); } else { handleQuickPercent(pct); }

            const onMove = (ev: PointerEvent) => {
              const p = calcPct(ev.clientX);
              if (p === 0) { setActivePercent(null); setAmount(''); } else { handleQuickPercent(p); }
            };
            const onUp = () => {
              document.removeEventListener('pointermove', onMove);
              document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
          }}
        >
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-muted rounded-full" />
          <div
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-[4px] rounded-full transition-[width] duration-75",
              isBuy ? "bg-success" : "bg-danger"
            )}
            style={{ width: `${activePercent ?? 0}%` }}
          />
          {[0, 25, 50, 75, 100].map((pct) => {
            const isActive = activePercent !== null && activePercent >= pct;
            return (
              <div
                key={pct}
                className="absolute -translate-x-1/2 z-10 w-5 h-5 flex items-center justify-center pointer-events-none"
                style={{ left: `${pct}%` }}
              >
                <span className={cn(
                  "w-[7px] h-[7px] rotate-45 transition-all duration-100 rounded-[1px]",
                  isActive
                    ? isBuy ? "bg-success" : "bg-danger"
                    : "bg-background border border-border"
                )} />
              </div>
            );
          })}
          {activePercent !== null && activePercent > 0 && (
            <div className="absolute -translate-x-1/2 z-20 pointer-events-none" style={{ left: `${activePercent}%` }}>
              <div className={cn(
                "w-[14px] h-[14px] rounded-full border-2 transition-shadow duration-150",
                isBuy
                  ? "border-success bg-background shadow-[0_0_8px_hsl(var(--success)/0.35)]"
                  : "border-danger bg-background shadow-[0_0_8px_hsl(var(--danger)/0.35)]"
              )} />
            </div>
          )}
        </div>
        <div className="relative h-4">
          {[0, 25, 50, 75, 100].map((pct, i, arr) => (
            <button
              key={pct}
              onClick={() => { if (pct === 0) { setActivePercent(null); setAmount(''); } else handleQuickPercent(pct); }}
              className={cn(
                "absolute text-[10px] font-medium transition-colors",
                i === 0 ? "left-0" : i === arr.length - 1 ? "right-0" : "-translate-x-1/2",
                activePercent !== null && activePercent >= pct
                  ? isBuy ? "text-success" : "text-danger"
                  : "text-muted-foreground"
              )}
              style={i > 0 && i < arr.length - 1 ? { left: `${pct}%` } : undefined}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Total display ── */}
      <div className="bg-card border border-border/60 rounded-xl h-[36px] flex items-center justify-between px-4">
        <span className="text-[10px] text-muted-foreground font-medium">Total ({quoteCurrency})</span>
        <span className="text-[13px] font-mono font-bold text-foreground">
          {total > 0 ? total.toFixed(total >= 1 ? 2 : 6) : '--'}
        </span>
      </div>

      {/* ── Info rows ── */}
      <div className="flex flex-col gap-1 text-[10px] px-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Available</span>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-danger" : "text-foreground")}>
              {availableBalance.toFixed(4)}
            </span>
            <span className="text-muted-foreground">{balanceCurrency}</span>
            <button
              onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
              className="text-accent text-[9px] font-bold ml-0.5 active:opacity-70"
            >
              ⊕
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Max {isBuy ? 'Buy' : 'Sell'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-foreground">{maxBuyAmount.toFixed(4)}</span>
            <span className="text-muted-foreground">{baseCurrency}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Est. Fee</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-foreground">{total > 0 ? `~${estFee.toFixed(4)}` : '—'}</span>
            <span className="text-muted-foreground">{quoteCurrency}</span>
          </div>
        </div>
      </div>

      {/* ── Insufficient warning ── */}
      {hasInsufficientBalance && (
        <div className="text-[10px] text-danger text-center bg-danger/5 rounded-lg py-1.5">
          ⚠ Insufficient {balanceCurrency}
        </div>
      )}

      {/* ── Submit CTA ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[40px] rounded-xl text-[13px] font-bold tracking-wide transition-all duration-200 active:scale-[0.98]",
          "disabled:cursor-not-allowed",
          hasInsufficientBalance
            ? "bg-muted text-muted-foreground"
            : numAmount <= 0
              ? "bg-muted text-muted-foreground/50"
              : isBuy
                ? "bg-success text-success-foreground shadow-[0_4px_16px_hsl(var(--success)/0.2)] active:opacity-90"
                : "bg-danger text-danger-foreground shadow-[0_4px_16px_hsl(var(--danger)/0.2)] active:opacity-90"
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
