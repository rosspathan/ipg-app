import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
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
  selectedPrice?: number | null;
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market';

const QUICK_PERCENTAGES = [25, 50, 75, 100];

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

/* ── Binance-style input: — [value] + ── */
const ExchangeInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  max?: number;
  tag?: { label: string; value: number; color: 'green' | 'red' };
}> = ({ label, value, onChange, step, min = 0, max, tag }) => {
  const numVal = parseFloat(value) || 0;
  const effectiveStep = step ?? getSmartStep(numVal);

  const adjust = (dir: 1 | -1) => {
    let next = numVal + effectiveStep * dir;
    if (dir === -1) next = Math.max(min, next);
    if (dir === 1 && max !== undefined) next = Math.min(max, next);
    onChange(formatNum(next));
  };

  return (
    <div className="bg-[#111827]/80 rounded-md h-[38px] flex items-center px-1 gap-0">
      <button
        type="button"
        onClick={() => adjust(-1)}
        disabled={numVal <= min}
        className="w-7 h-7 flex items-center justify-center text-[#6B7280] text-[16px] font-light active:text-[#E5E7EB] disabled:opacity-25 select-none flex-shrink-0"
      >
        −
      </button>
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
        <span className="text-[8px] text-[#4B5563] leading-none">{label}</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-center text-[13px] font-mono text-[#E5E7EB] outline-none w-full leading-tight"
        />
      </div>
      {tag && tag.value > 0 && (
        <button
          type="button"
          onClick={() => onChange(formatNum(tag.value))}
          className={cn(
            "text-[8px] font-bold px-1 py-0.5 rounded flex-shrink-0",
            tag.color === 'red'
              ? "text-[#EA3943] bg-[#EA3943]/10 active:bg-[#EA3943]/20"
              : "text-[#16C784] bg-[#16C784]/10 active:bg-[#16C784]/20"
          )}
        >
          {tag.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => adjust(1)}
        disabled={max !== undefined && numVal >= max}
        className="w-7 h-7 flex items-center justify-center text-[#6B7280] text-[16px] font-light active:text-[#E5E7EB] disabled:opacity-25 select-none flex-shrink-0"
      >
        +
      </button>
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
    <div className="flex flex-col gap-2">
      {/* ── Buy / Sell toggle ── */}
      <div className="flex h-[36px] bg-[#111827] rounded-md p-[2px] gap-[2px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[4px] text-[12px] font-bold tracking-wide transition-all duration-150",
            isBuy
              ? "bg-[#2EBD85] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#9CA3AF] active:text-[#9CA3AF]"
          )}
        >
          BUY
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[4px] text-[12px] font-bold tracking-wide transition-all duration-150",
            !isBuy
              ? "bg-[#F6465D] text-white shadow-sm"
              : "text-[#6B7280] hover:text-[#9CA3AF] active:text-[#9CA3AF]"
          )}
        >
          SELL
        </button>
      </div>

      {/* ── Order type selector ── */}
      <div className="flex items-center gap-3 h-[22px]">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[11px] font-medium capitalize transition-colors",
              orderType === t ? "text-[#E5E7EB]" : "text-[#4B5563] hover:text-[#6B7280]"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Price Input ── */}
      {orderType !== 'market' && (
        <ExchangeInput
          label={`Price (${quoteCurrency})`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
          tag={isBuy
            ? { label: 'BBO', value: bestAsk, color: 'red' }
            : { label: 'BBO', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* ── Amount Input ── */}
      <ExchangeInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* ── % Slider — Draggable with diamond markers ── */}
      <div className="px-1 py-1">
        <div
          className="relative h-[24px] flex items-center cursor-pointer touch-none"
          onPointerDown={(e) => {
            const track = e.currentTarget;
            const rect = track.getBoundingClientRect();
            const pad = rect.width * 0.02;
            const trackW = rect.width - pad * 2;
            const calcPct = (clientX: number) => Math.round(Math.max(0, Math.min(100, ((clientX - rect.left - pad) / trackW) * 100)));

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
          {/* Base track */}
          <div className="absolute left-[2%] right-[2%] top-1/2 -translate-y-1/2 h-[2px] bg-[#1F2937] rounded-full" />
          {/* Active track */}
          <div
            className={cn(
              "absolute left-[2%] top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-[width] duration-75",
              isBuy ? "bg-[#2EBD85]" : "bg-[#F6465D]"
            )}
            style={{ width: `${((activePercent ?? 0) / 100) * 96}%` }}
          />
          {/* Diamond markers */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const isActive = activePercent !== null && activePercent >= pct;
            return (
              <div
                key={pct}
                className="absolute -translate-x-1/2 z-10 w-5 h-5 flex items-center justify-center pointer-events-none"
                style={{ left: `${2 + (pct / 100) * 96}%` }}
              >
                <span className={cn(
                  "w-[7px] h-[7px] rotate-45 transition-all duration-100",
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
              style={{ left: `${2 + (activePercent / 100) * 96}%` }}
            >
              <div className={cn(
                "w-[12px] h-[12px] rounded-full border-2",
                isBuy ? "border-[#2EBD85] bg-[#0B1220]" : "border-[#F6465D] bg-[#0B1220]"
              )} />
            </div>
          )}
        </div>
        {/* Labels */}
        <div className="relative h-[14px]">
          {[0, 25, 50, 75, 100].map((pct) => (
            <span
              key={pct}
              className={cn(
                "absolute -translate-x-1/2 text-[9px] font-mono transition-colors",
                activePercent !== null && activePercent >= pct - 2 && activePercent <= pct + 2
                  ? (isBuy ? "text-[#2EBD85]" : "text-[#F6465D]")
                  : "text-[#4B5563]"
              )}
              style={{ left: `${2 + (pct / 100) * 96}%` }}
            >
              {pct}%
            </span>
          ))}
        </div>
      </div>

      {/* ── Total ── */}
      <div className="bg-[#111827]/80 rounded-md h-[34px] flex items-center justify-center">
        <span className="text-[9px] text-[#4B5563] mr-1">Total</span>
        <span className="text-[12px] font-mono text-[#9CA3AF]">
          {total > 0 ? `${total.toFixed(total >= 1 ? 2 : 6)} ${quoteCurrency}` : `-- ${quoteCurrency}`}
        </span>
      </div>

      {/* ── Info rows: Avbl / Max / Fee ── */}
      <div className="flex flex-col gap-0.5 text-[10px] mt-1">
        <div className="flex items-center justify-between h-[18px]">
          <span className="text-[#6B7280]">Available</span>
          <div className="flex items-center gap-1.5">
            <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-[#F6465D]" : "text-[#E5E7EB]")}>
              {availableBalance.toFixed(4)}
            </span>
            <span className="text-[#6B7280]">{balanceCurrency}</span>
            <button
              onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
              className="text-[#F0B90B] text-[9px] font-medium px-1.5 py-0.5 rounded bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 transition-colors"
            >
              Deposit
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between h-[18px]">
          <span className="text-[#6B7280]">Max {isBuy ? 'Buy' : 'Sell'}</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{maxBuyAmount.toFixed(4)}</span>
            <span className="text-[#6B7280]">{baseCurrency}</span>
          </div>
        </div>
        <div className="flex items-center justify-between h-[18px]">
          <span className="text-[#6B7280]">Est. Fee</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{total > 0 ? `~${estFee.toFixed(4)}` : '—'}</span>
            <span className="text-[#6B7280]">{quoteCurrency}</span>
          </div>
        </div>
      </div>

      {/* ── Insufficient warning ── */}
      {hasInsufficientBalance && (
        <div className="text-[9px] text-[#F6465D] text-center">⚠ Insufficient {balanceCurrency}</div>
      )}

      {/* ── Submit CTA ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[36px] rounded-md text-[13px] font-bold transition-all duration-150 active:scale-[0.98]",
          "disabled:cursor-not-allowed",
          hasInsufficientBalance
            ? "bg-[#1F2937] text-[#6B7280]"
            : numAmount <= 0
              ? "bg-[#1F2937] text-[#4B5563]"
              : isBuy
                ? "bg-[#2EBD85] text-white active:bg-[#26a374]"
                : "bg-[#F6465D] text-white active:bg-[#d63a50]"
        )}
      >
        {isPlacingOrder ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
        ) : hasInsufficientBalance ? (
          `Deposit ${balanceCurrency}`
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </button>
    </div>
  );
};
