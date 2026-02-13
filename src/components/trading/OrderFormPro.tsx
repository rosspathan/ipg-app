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
    <div>
      <div className="flex items-center justify-between px-1 mb-0.5">
        <span className="text-[9px] text-[#6B7280] select-none">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[8px] font-bold px-1.5 py-[1px] rounded border transition-colors",
              tag.color === 'red'
                ? "text-[#EA3943] bg-[#EA3943]/[0.08] border-[#EA3943]/20 active:bg-[#EA3943]/20"
                : "text-[#16C784] bg-[#16C784]/[0.08] border-[#16C784]/20 active:bg-[#16C784]/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className="bg-[#0D1421] border border-[#1F2937] rounded h-[34px] flex items-center hover:border-[#374151] focus-within:border-[#4B5563] transition-colors">
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={numVal <= min}
          className="w-8 h-full flex items-center justify-center text-[#6B7280] text-[15px] font-medium active:bg-[#1F2937] active:text-[#E5E7EB] disabled:opacity-20 select-none flex-shrink-0 transition-colors"
        >
          −
        </button>
        <div className="h-[18px] w-px bg-[#1F2937] flex-shrink-0" />
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-center text-[14px] font-mono font-bold text-[#E5E7EB] outline-none leading-none tracking-tight"
        />
        <div className="h-[18px] w-px bg-[#1F2937] flex-shrink-0" />
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={max !== undefined && numVal >= max}
          className="w-8 h-full flex items-center justify-center text-[#6B7280] text-[15px] font-medium active:bg-[#1F2937] active:text-[#E5E7EB] disabled:opacity-20 select-none flex-shrink-0 transition-colors"
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
    <div className="flex flex-col gap-2">
      {/* ── Buy / Sell toggle ── */}
      <div className="flex h-[32px] bg-[#111827] rounded p-[2px] gap-[2px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[3px] text-[11px] font-bold tracking-wide transition-all duration-150",
            isBuy
              ? "bg-[#2EBD85] text-white shadow-sm"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[3px] text-[11px] font-bold tracking-wide transition-all duration-150",
            !isBuy
              ? "bg-[#F6465D] text-white shadow-sm"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Sell
        </button>
      </div>

      {/* ── Order type selector ── */}
      <div className="flex items-center gap-4 h-[24px] px-1">
        {(['limit', 'market'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={cn(
              "text-[11px] font-medium capitalize transition-colors pb-0.5",
              orderType === t ? "text-[#E5E7EB] border-b border-[#E5E7EB]" : "text-[#4B5563]"
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

      {/* ── % Slider — compact ── */}
      <div className="px-0.5">
        <div
          className="relative h-[20px] flex items-center cursor-pointer touch-none"
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
          <div className="absolute left-[2%] right-[2%] top-1/2 -translate-y-1/2 h-[2px] bg-[#1F2937] rounded-full" />
          <div
            className={cn(
              "absolute left-[2%] top-1/2 -translate-y-1/2 h-[2px] rounded-full transition-[width] duration-75",
              isBuy ? "bg-[#2EBD85]" : "bg-[#F6465D]"
            )}
            style={{ width: `${((activePercent ?? 0) / 100) * 96}%` }}
          />
          {[0, 25, 50, 75, 100].map((pct) => {
            const isActive = activePercent !== null && activePercent >= pct;
            return (
              <div
                key={pct}
                className="absolute -translate-x-1/2 z-10 w-4 h-4 flex items-center justify-center pointer-events-none"
                style={{ left: `${2 + (pct / 100) * 96}%` }}
              >
                <span className={cn(
                  "w-[6px] h-[6px] rotate-45 transition-all duration-100",
                  isActive
                    ? isBuy ? "bg-[#2EBD85]" : "bg-[#F6465D]"
                    : "bg-[#0B1220] border border-[#374151]"
                )} />
              </div>
            );
          })}
          {activePercent !== null && activePercent > 0 && (
            <div
              className="absolute -translate-x-1/2 z-20 pointer-events-none"
              style={{ left: `${2 + (activePercent / 100) * 96}%` }}
            >
              <div className={cn(
                "w-[10px] h-[10px] rounded-full border-2",
                isBuy ? "border-[#2EBD85] bg-[#0B1220]" : "border-[#F6465D] bg-[#0B1220]"
              )} />
            </div>
          )}
        </div>
      </div>

      {/* ── Total ── */}
      <div className="bg-[#0D1421] border border-[#1F2937] rounded h-[28px] flex items-center justify-center">
        <span className="text-[8px] text-[#4B5563] mr-1.5">Total ({quoteCurrency})</span>
        <span className="text-[11px] font-mono font-semibold text-[#9CA3AF]">
          {total > 0 ? total.toFixed(total >= 1 ? 2 : 6) : '--'}
        </span>
      </div>

      {/* ── Info rows: Avbl / Max / Fee — ultra compact ── */}
      <div className="flex flex-col gap-0 text-[9px]">
        <div className="flex items-center justify-between h-[16px]">
          <span className="text-[#6B7280]">Avbl</span>
          <div className="flex items-center gap-1">
            <span className={cn("font-mono tabular-nums", hasInsufficientBalance ? "text-[#F6465D]" : "text-[#E5E7EB]")}>
              {availableBalance.toFixed(4)}
            </span>
            <span className="text-[#4B5563]">{balanceCurrency}</span>
            <button
              onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
              className="text-[#F0B90B] text-[8px] font-bold ml-0.5"
            >
              ⊕
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between h-[16px]">
          <span className="text-[#6B7280]">Max {isBuy ? 'Buy' : 'Sell'}</span>
          <div className="flex items-center gap-1">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{maxBuyAmount.toFixed(4)}</span>
            <span className="text-[#4B5563]">{baseCurrency}</span>
          </div>
        </div>
        <div className="flex items-center justify-between h-[16px]">
          <span className="text-[#6B7280]">Est. Fee</span>
          <div className="flex items-center gap-1">
            <span className="font-mono tabular-nums text-[#E5E7EB]">{total > 0 ? `~${estFee.toFixed(4)}` : '—'}</span>
            <span className="text-[#4B5563]">{quoteCurrency}</span>
          </div>
        </div>
      </div>

      {/* ── Insufficient warning ── */}
      {hasInsufficientBalance && (
        <div className="text-[8px] text-[#F6465D] text-center">⚠ Insufficient {balanceCurrency}</div>
      )}

      {/* ── Submit CTA ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full h-[32px] rounded text-[11px] font-bold transition-all duration-150 active:scale-[0.98]",
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
          <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
        ) : hasInsufficientBalance ? (
          `Deposit ${balanceCurrency}`
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </button>
    </div>
  );
};
