import React, { useState, useMemo } from 'react';
import { Plus, Info, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceStepperInput } from './PriceStepperInput';
import { PercentageSliderPro } from './PercentageSliderPro';
import { Button } from '@/components/ui/button';
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
}

type OrderSide = 'buy' | 'sell';
type OrderType = 'limit' | 'market' | 'stop-limit';

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
}) => {
  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('limit');
  const [price, setPrice] = useState(currentPrice.toFixed(2));
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState(0);

  const isBuy = side === 'buy';
  const availableBalance = isBuy ? availableQuote : availableBase;
  const balanceCurrency = isBuy ? quoteCurrency : baseCurrency;

  const numPrice = parseFloat(price) || 0;
  const numAmount = parseFloat(amount) || 0;

  const total = useMemo(() => {
    if (orderType === 'market') {
      return numAmount * currentPrice;
    }
    return numAmount * numPrice;
  }, [numAmount, numPrice, currentPrice, orderType]);

  const estimatedFee = total * 0.001; // 0.1% fee

  const handlePercentageChange = (pct: number) => {
    setPercentage(pct);
    if (isBuy) {
      const maxBuyAmount = (availableQuote * (pct / 100)) / (numPrice || currentPrice);
      setAmount(maxBuyAmount.toFixed(4));
    } else {
      const maxSellAmount = availableBase * (pct / 100);
      setAmount(maxSellAmount.toFixed(4));
    }
  };

  const handleSubmit = () => {
    if (numAmount <= 0) return;
    
    onPlaceOrder({
      side,
      type: orderType === 'stop-limit' ? 'limit' : orderType,
      price: orderType === 'market' ? undefined : numPrice,
      quantity: numAmount,
    });
  };

  return (
    <div className="space-y-3">
      {/* Buy/Sell Toggle - Rounded pill style like screenshot */}
      <div className="flex bg-[#2a2a40] rounded-full p-1">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 py-2.5 rounded-full font-semibold text-sm",
            isBuy
              ? "bg-emerald-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 py-2.5 rounded-full font-semibold text-sm",
            !isBuy
              ? "bg-destructive text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sell
        </button>
      </div>

      {/* Available Balance */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Available</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-foreground">
            {availableBalance.toFixed(4)} {balanceCurrency}
          </span>
          <button className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Order Type Selector with info icon inside */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center justify-between bg-[#1a1a2e] border border-[#2a2a40] rounded-lg px-3 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground capitalize">{orderType.replace('-', ' ')}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem onClick={() => setOrderType('limit')}>
            Limit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('market')}>
            Market
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOrderType('stop-limit')}>
            Stop-Limit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Price Input (for limit orders) */}
      {orderType !== 'market' && (
        <PriceStepperInput
          label={`Price ${quoteCurrency}`}
          value={price}
          onChange={setPrice}
          step={tickSize}
          min={0}
        />
      )}

      {/* Amount Input */}
      <PriceStepperInput
        label={`Amount (${baseCurrency})`}
        value={amount}
        onChange={setAmount}
        step={lotSize}
        min={0}
        max={!isBuy ? availableBase : undefined}
      />

      {/* Percentage Slider */}
      <PercentageSliderPro
        value={percentage}
        onChange={handlePercentageChange}
      />

      {/* Total */}
      <div className="bg-[#1a1a2e] border border-[#2a2a40] rounded-lg px-3 py-2">
        <label className="block text-xs text-muted-foreground mb-1">Total {quoteCurrency}</label>
        <div className="font-mono text-foreground text-base">
          {total.toFixed(4)}
        </div>
      </div>

      {/* Estimated Fee */}
      <div className="flex items-center justify-between text-xs py-1">
        <span className="text-muted-foreground">Est. Fee</span>
        <span className="text-foreground font-mono">
          {estimatedFee.toFixed(2)} {baseCurrency}
        </span>
      </div>

      {/* Submit Button - Full rounded like screenshot */}
      <Button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full py-5 text-base font-semibold rounded-lg",
          isBuy
            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
            : "bg-destructive hover:bg-destructive/90 text-white"
        )}
      >
        {isPlacingOrder ? 'Placing...' : `${isBuy ? 'Buy' : 'Sell'} ${baseCurrency}`}
      </Button>
    </div>
  );
};
