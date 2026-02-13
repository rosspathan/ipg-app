import React, { useState, useMemo, useEffect } from 'react';
import { AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { PriceStepperInput } from './PriceStepperInput';
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
type TimeInForce = 'GTC' | 'IOC' | 'FOK';

const QUICK_PERCENTAGES = [25, 50, 75, 100];

export const OrderFormPro: React.FC<OrderFormProProps> = ({
  baseCurrency,
  quoteCurrency,
  availableBase,
  availableQuote,
  lockedBase = 0,
  lockedQuote = 0,
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
  const [timeInForce, setTimeInForce] = useState<TimeInForce>('GTC');

  // Sync selected price from order book click
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
  const hasZeroBalance = availableBalance === 0;

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
    <div className="space-y-2.5">
      {/* ── Buy/Sell Segmented Control ── */}
      <div className="flex h-[38px] bg-[#0F172A] rounded-[10px] p-[3px]">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 rounded-[8px] font-semibold text-xs transition-all duration-200",
            isBuy
              ? "bg-gradient-to-r from-[#16C784] to-[#0ea36b] text-white shadow-sm"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 rounded-[8px] font-semibold text-xs transition-all duration-200",
            !isBuy
              ? "bg-gradient-to-r from-[#EA3943] to-[#c9222c] text-white shadow-sm"
              : "text-[#6B7280] active:text-[#9CA3AF]"
          )}
        >
          Sell
        </button>
      </div>

      {/* ── Available Balance (inline text) ── */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] text-[#6B7280]">Available</span>
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-[11px] font-mono",
            hasInsufficientBalance ? "text-[#EA3943]" : "text-[#E5E7EB]"
          )}>
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
          <button
            onClick={() => navigate(`/app/wallet/transfer?asset=${balanceCurrency}&direction=to_trading`)}
            className="text-[10px] text-[#16C784] font-medium active:opacity-70"
          >
            + Transfer
          </button>
        </div>
      </div>

      {/* ── Order Type + TIF pills ── */}
      <div className="flex gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 h-[34px] px-3 bg-[#111827] border border-[#1F2937] rounded-lg text-[11px] text-[#E5E7EB] font-medium active:bg-[#1F2937]">
              <span className="capitalize">{orderType}</span>
              <ChevronDown className="h-3 w-3 text-[#6B7280]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-28 bg-[#111827] border-[#1F2937]">
            <DropdownMenuItem onClick={() => setOrderType('limit')} className="text-xs py-2">Limit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOrderType('market')} className="text-xs py-2">Market</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 h-[34px] px-3 bg-[#111827] border border-[#1F2937] rounded-lg text-[11px] text-[#E5E7EB] font-medium active:bg-[#1F2937]">
              <span>{timeInForce}</span>
              <ChevronDown className="h-3 w-3 text-[#6B7280]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36 bg-[#111827] border-[#1F2937]">
            <DropdownMenuItem onClick={() => setTimeInForce('GTC')} className="text-xs py-2">
              <div><div className="font-medium">GTC</div><div className="text-[10px] text-[#6B7280]">Good Till Cancel</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeInForce('IOC')} className="text-xs py-2">
              <div><div className="font-medium">IOC</div><div className="text-[10px] text-[#6B7280]">Immediate or Cancel</div></div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTimeInForce('FOK')} className="text-xs py-2">
              <div><div className="font-medium">FOK</div><div className="text-[10px] text-[#6B7280]">Fill or Kill</div></div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Price Input ── */}
      {orderType !== 'market' && (
        <PriceStepperInput
          label={`Price (${quoteCurrency})`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
          quickAction={isBuy 
            ? { label: 'Best Ask', value: bestAsk, color: 'red' }
            : { label: 'Best Bid', value: bestBid, color: 'green' }
          }
        />
      )}

      {/* ── Amount Input ── */}
      <PriceStepperInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={handleAmountChange}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* ── Segmented % Bar ── */}
      <div className="flex h-[32px] bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
        {QUICK_PERCENTAGES.map((pct, idx) => (
          <button
            key={pct}
            onClick={() => handleQuickPercent(pct)}
            className={cn(
              "flex-1 text-[11px] font-medium transition-colors duration-150",
              idx < QUICK_PERCENTAGES.length - 1 && "border-r border-[#1F2937]",
              activePercent === pct
                ? isBuy
                  ? "bg-[#16C784]/15 text-[#16C784]"
                  : "bg-[#EA3943]/15 text-[#EA3943]"
                : "text-[#6B7280] active:bg-white/5"
            )}
          >
            {pct}%
          </button>
        ))}
      </div>

      {/* ── Total ── */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] text-[#6B7280]">Total</span>
        <span className="text-[11px] font-mono text-[#E5E7EB]">
          {total.toFixed(total >= 1 ? 2 : 6)} {quoteCurrency}
        </span>
      </div>

      {/* ── Insufficient balance ── */}
      {hasInsufficientBalance && !hasZeroBalance && (
        <div className="flex items-center gap-1.5 text-[10px] text-[#EA3943] bg-[#EA3943]/8 border border-[#EA3943]/15 rounded-lg px-2.5 py-1.5">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>Insufficient {balanceCurrency}</span>
        </div>
      )}

      {/* ── Submit Button ── */}
      <button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0 || hasInsufficientBalance}
        className={cn(
          "w-full h-[42px] rounded-[10px] text-[13px] font-semibold transition-all duration-200 active:scale-[0.98]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          hasInsufficientBalance
            ? "bg-[#1F2937] text-[#6B7280]"
            : isBuy
              ? "bg-gradient-to-r from-[#16C784] to-[#0ea36b] text-white"
              : "bg-gradient-to-r from-[#EA3943] to-[#c9222c] text-white"
        )}
      >
        {isPlacingOrder ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
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
