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
  const [price, setPrice] = useState(currentPrice.toFixed(8));
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
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Buy/Sell Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSide('buy')}
          className={cn(
            "flex-1 py-3 rounded-lg font-semibold text-sm",
            isBuy
              ? "bg-emerald-500 text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={cn(
            "flex-1 py-3 rounded-lg font-semibold text-sm",
            !isBuy
              ? "bg-destructive text-white"
              : "bg-muted text-muted-foreground hover:text-foreground"
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
          <button className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Order Type Selector */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-muted-foreground hover:text-foreground">
          <Info className="h-4 w-4" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-1 flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-sm">
              <span className="capitalize">{orderType.replace('-', ' ')}</span>
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
      </div>

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
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Total {quoteCurrency}</label>
        <div className="bg-muted rounded-lg px-3 py-3 text-center font-mono text-foreground">
          {total.toFixed(4)}
        </div>
      </div>

      {/* Estimated Fee */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Est. Fee</span>
        <span className="text-foreground font-mono">
          {estimatedFee.toFixed(6)} {quoteCurrency}
        </span>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isPlacingOrder || numAmount <= 0}
        className={cn(
          "w-full py-6 text-base font-semibold",
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
