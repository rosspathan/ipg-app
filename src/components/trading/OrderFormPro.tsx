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

/* ── Premium Exchange Input — 52px, 14px rounded, subtle glow ── */
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
        <span className="text-[10px] font-medium text-[#9CA3AF] select-none">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[9px] font-bold px-2 py-[2px] rounded-md transition-all duration-150",
              tag.color === 'red'
                ? "text-[#EA3943] bg-[#EA3943]/10 active:bg-[#EA3943]/20"
                : "text-[#16C784] bg-[#16C784]/10 active:bg-[#16C784]/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className={cn(
        "bg-[#080D18] border border-[#1A2235] rounded-[14px] h-[52px] flex items-center",
        "transition-all duration-200",
        "focus-within:border-[#16F2C6]/30 focus-within:shadow-[0_0_16px_rgba(22,242,198,0.06)]",
        "hover:border-[#253045]"
      )}>
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={numVal <= min}
          className="w-12 h-full flex items-center justify-center text-[#6B7280] text-[18px] font-light active:bg-[#111827] active:text-white disabled:opacity-20 select-none flex-shrink-0 rounded-l-[14px] transition-colors border-r border-[#1A2235]/60"
        >
          −
        </button>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent text-center px-4 text-[16px] font-mono font-semibold text-[#E5E7EB] outline-none leading-none tracking-tight placeholder:text-[#2A3347] overflow-hidden whitespace-nowrap"
          style={{ textOverflow: 'ellipsis' }}
        />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={max !== undefined && numVal >= max}
          className="w-12 h-full flex items-center justify-center text-[#6B7280] text-[18px] font-light active:bg-[#111827] active:text-white disabled:opacity-20 select-none flex-shrink-0 rounded-r-[14px] transition-colors border-l border-[#1A2235]/60"
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
      {/* ── Buy / Sell Toggle — pill style ── */}
      <div className="flex h-[38px] bg-[#111827] rounded-xl p-[3px] gap-[3px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[10px] text-[12px] font-bold tracking-wider uppercase transition-all duration-200",
            isBuy
              ? "bg-[#2EBD85] text-white shadow-[0_2px_8px_rgba(46,189,133,0.25)]"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[10px] text-[12px] font-bold tracking-wider uppercase transition-all duration-200",
            !isBuy
              ? "bg-[#F6465D] text-white shadow-[0_2px_8px_rgba(246,70,93,0.25)]"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Sell
        </button>
      </div>

      {/* ── Order Type — secondary tabs ── */}
      <div className="flex items-center gap-6 h-[30px] px-1 border-b border-[#1F2937]/60">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[12px] font-semibold capitalize transition-all duration-200 pb-2",
              orderType === t
                ? "text-[#E5E7EB] border-b-2 border-[#16F2C6] -mb-[1px]"
                : "text-[#4B5563] hover:text-[#6B7280]"
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

      {/* ── Percentage Slider with labels ── */}
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
          {/* Track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-[#1A2235] rounded-full" />
          {/* Active fill */}
          <div
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-[4px] rounded-full transition-[width] duration-75",
              isBuy ? "bg-[#2EBD85]" : "bg-[#F6465D]"
            )}
            style={{ width: `${activePercent ?? 0}%` }}
          />
          {/* Diamond markers */}
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
                    ? isBuy ? "bg-[#2EBD85]" : "bg-[#F6465D]"
                    : "bg-[#0B1220] border border-[#374151]"
                )} />
              </div>
            );
          })}
          {/* Draggable thumb */}
          {activePercent !== null && activePercent > 0 && (
            <div
              className="absolute -translate-x-1/2 z-20 pointer-events-none"
              style={{ left: `${activePercent}%` }}
            >
              <div className={cn(
                "w-[14px] h-[14px] rounded-full border-2 transition-shadow duration-150",
                isBuy
                  ? "border-[#2EBD85] bg-[#0B1220] shadow-[0_0_8px_rgba(46,189,133,0.35)]"
                  : "border-[#F6465D] bg-[#0B1220] shadow-[0_0_8px_rgba(246,70,93,0.35)]"
              )} />
            </div>
          )}
        </div>
        {/* Percentage labels — edge-aligned */}
        <div className="flex justify-between">
          {[0, 25, 50, 75, 100].map((pct, i) => (
            <button
              key={pct}
              onClick={() => { if (pct === 0) { setActivePercent(null); setAmount(''); } else handleQuickPercent(pct); }}
              className={cn(
                "text-[10px] font-medium transition-colors",
                i === 0 ? "text-left" : i === 4 ? "text-right" : "text-center",
                activePercent !== null && activePercent >= pct
                  ? isBuy ? "text-[#2EBD85]" : "text-[#F6465D]"
                  : "text-[#4B5563]"
              )}
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* ── Total display ── */}
      <div className="bg-[#0D1421] border border-[#1F2937]/60 rounded-xl h-[36px] flex items-center justify-between px-4">
        <span className="text-[10px] text-[#6B7280] font-medium">Total ({quoteCurrency})</span>
        <span className="text-[13px] font-mono font-bold text-[#E5E7EB]">
          {total > 0 ? total.toFixed(total >= 1 ? 2 : 6) : '--'}
        </span>
      </div>

      {/* ── Info rows: Avbl / Max / Fee ── */}
      <div className="flex flex-col gap-1 text-[10px] px-1">
        <div className="flex items-center justify-between">
          <span className="text-[#6B7280]">Available</span>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-[#F6465D]" : "text-[#E5E7EB]")}>
              {availableBalance.toFixed(4)}
            </span>
            <span className="text-[#4B5563]">{balanceCurrency}</span>
            <button
              onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
              className="text-[#16F2C6] text-[9px] font-bold ml-0.5 active:opacity-70"
            >
              ⊕
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6B7280]">Max {isBuy ? 'Buy' : 'Sell'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{maxBuyAmount.toFixed(4)}</span>
            <span className="text-[#4B5563]">{baseCurrency}</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6B7280]">Est. Fee</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{total > 0 ? `~${estFee.toFixed(4)}` : '—'}</span>
            <span className="text-[#4B5563]">{quoteCurrency}</span>
          </div>
        </div>
      </div>

      {/* ── Insufficient warning ── */}
      {hasInsufficientBalance && (
        <div className="text-[10px] text-[#F6465D] text-center bg-[#F6465D]/5 rounded-lg py-1.5">
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
            ? "bg-[#1F2937] text-[#6B7280]"
            : numAmount <= 0
              ? "bg-[#1F2937] text-[#4B5563]"
              : isBuy
                ? "bg-[#2EBD85] text-white shadow-[0_4px_16px_rgba(46,189,133,0.2)] active:bg-[#26a374]"
                : "bg-[#F6465D] text-white shadow-[0_4px_16px_rgba(246,70,93,0.2)] active:bg-[#d63a50]"
        )}
      >
        {isPlacingOrder ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        ) : hasInsufficientBalance ? (
          `Deposit ${balanceCurrency}`
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </button>
    </div>
  );
};
