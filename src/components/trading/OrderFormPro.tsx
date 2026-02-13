import React, { useState, useMemo, useEffect } from 'react';
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

/* ── Inline terminal-style input row ── */
const TerminalInput: React.FC<{
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
    <div className="flex items-center justify-between h-[32px] border-b border-[#1F2937]/40">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-[#6B7280] w-[52px] flex-shrink-0">{label}</span>
        {tag && tag.value > 0 && (
          <button
            type="button"
            onClick={() => onChange(formatNum(tag.value))}
            className={cn(
              "text-[8px] font-semibold px-1 py-px rounded leading-none",
              tag.color === 'red'
                ? "text-[#EA3943] bg-[#EA3943]/10 active:bg-[#EA3943]/20"
                : "text-[#16C784] bg-[#16C784]/10 active:bg-[#16C784]/20"
            )}
          >
            {tag.label}
          </button>
        )}
      </div>
      <div className="flex items-center gap-0">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent text-right text-[13px] font-mono text-[#E5E7EB] outline-none w-[120px]"
        />
        <button
          type="button"
          onClick={() => adjust(-1)}
          disabled={numVal <= min}
          className="text-[#6B7280] text-[15px] font-light w-6 h-full flex items-center justify-center active:text-[#E5E7EB] disabled:opacity-25 select-none"
        >
          −
        </button>
        <button
          type="button"
          onClick={() => adjust(1)}
          disabled={max !== undefined && numVal >= max}
          className="text-[#6B7280] text-[15px] font-light w-6 h-full flex items-center justify-center active:text-[#E5E7EB] disabled:opacity-25 select-none"
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

  const requiredAmount = isBuy ? total * 1.005 : numAmount;
  const hasInsufficientBalance = numAmount > 0 && requiredAmount > availableBalance;

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

  return (
    <div>
      {/* ── Buy / Sell — underline tab style ── */}
      <div className="flex h-[34px] border-b border-[#1F2937]/60">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 text-[12px] font-semibold transition-colors duration-150",
            isBuy
              ? "text-[#16C784] border-b-2 border-[#16C784]"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 text-[12px] font-semibold transition-colors duration-150",
            !isBuy
              ? "text-[#EA3943] border-b-2 border-[#EA3943]"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Sell
        </button>
      </div>

      {/* ── Available + Order type row ── */}
      <div className="flex items-center justify-between h-[28px] mt-1">
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#6B7280]">Avbl</span>
          <span className={cn(
            "text-[10px] font-mono",
            hasInsufficientBalance ? "text-[#EA3943]" : "text-[#9CA3AF]"
          )}>
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
          <button
            onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
            className="text-[9px] text-[#16C784] font-medium active:opacity-70"
          >
            +
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-0.5 text-[10px] text-[#9CA3AF] font-medium active:text-[#E5E7EB]">
              <span className="capitalize">{orderType}</span>
              <ChevronDown className="h-2.5 w-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-24 bg-[#111827] border-[#1F2937] min-w-0">
            <DropdownMenuItem onClick={() => setOrderType('limit')} className="text-[11px] py-1.5">Limit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOrderType('market')} className="text-[11px] py-1.5">Market</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Price Input ── */}
      {orderType !== 'market' && (
        <TerminalInput
          label={`Price`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
          tag={isBuy
            ? { label: 'Ask', value: bestAsk, color: 'red' }
            : { label: 'Bid', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* ── Amount Input ── */}
      <TerminalInput
        label={`Amt (${baseCurrency})`}
        value={amount}
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* ── % Selector — ultra slim ── */}
      <div className="flex items-center h-[26px] mt-1">
        {QUICK_PERCENTAGES.map((pct, idx) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "flex-1 text-[10px] font-medium transition-colors duration-100",
              activePercent === pct
                ? isBuy
                  ? "text-[#16C784]"
                  : "text-[#EA3943]"
                : "text-[#4B5563] active:text-[#9CA3AF]"
            )}
          >
            {pct}%
            {activePercent === pct && (
              <div className={cn(
                "h-px mt-0.5 mx-auto w-4",
                isBuy ? "bg-[#16C784]" : "bg-[#EA3943]"
              )} />
            )}
          </button>
        ))}
      </div>

      {/* ── Total row ── */}
      <div className="flex items-center justify-between h-[26px] border-b border-[#1F2937]/40">
        <span className="text-[10px] text-[#6B7280]">Total</span>
        <span className="text-[11px] font-mono text-[#9CA3AF]">
          {total.toFixed(total >= 1 ? 2 : 6)} {quoteCurrency}
        </span>
      </div>

      {/* ── Insufficient balance — inline text ── */}
      {hasInsufficientBalance && (
        <div className="flex items-center gap-1 h-[22px] mt-0.5">
          <span className="text-[10px] text-[#EA3943]">⚠ Insufficient {balanceCurrency}</span>
        </div>
      )}

      {/* ── Submit ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0 || hasInsufficientBalance}
        className={cn(
          "w-full h-[34px] rounded text-[12px] font-semibold mt-1.5 transition-all duration-150 active:scale-[0.98]",
          "disabled:opacity-30 disabled:cursor-not-allowed",
          hasInsufficientBalance
            ? "bg-[#1F2937] text-[#6B7280]"
            : isBuy
              ? "bg-[#16C784] text-white active:bg-[#0ea36b]"
              : "bg-[#EA3943] text-white active:bg-[#c9222c]"
        )}
      >
        {isPlacingOrder ? (
          <span className="flex items-center justify-center gap-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Placing...
          </span>
        ) : hasInsufficientBalance ? (
          'Insufficient Balance'
        ) : (
          `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`
        )}
      </button>
    </div>
  );
};
